"""Correo saliente.

Dos reglas que sostienen todo el proyecto:

1. Los correos llevan ENLACE, nunca adjunto. Si el archivo viaja por correo,
   la gente responde por correo y volvemos a la cadena de hilos que la
   ventanilla vino a eliminar.

2. La Coordinación recibe aviso de todo, porque supervisa el proceso completo
   y necesita enterarse sin estar pendiente del tablero. Es una preferencia por
   usuario (`notificaciones_todas`), no una regla fija: si la bandeja se le
   llena, la apaga desde Ajustes y le queda el tablero, que sigue mostrándolo
   todo.
"""

import smtplib
import threading
from email.message import EmailMessage

from flask import current_app

from .extensions import db
from .models import Usuario, Rol


def _conectar(cfg):
    """El puerto decide el protocolo.

    465 usa TLS desde el primer byte (SMTP_SSL); 587 empieza en claro y sube a
    TLS con STARTTLS. Si se mezclan, la conexión se queda esperando un saludo
    que nunca llega y termina en timeout, que es lo que parece un problema de
    red sin serlo.
    """
    puerto = int(cfg["SMTP_PUERTO"])
    tiempo = int(cfg.get("SMTP_TIMEOUT", 20))
    if puerto == 465:
        return smtplib.SMTP_SSL(cfg["SMTP_HOST"], puerto, timeout=tiempo)
    servidor = smtplib.SMTP(cfg["SMTP_HOST"], puerto, timeout=tiempo)
    servidor.starttls()
    return servidor


def _explicar(error, cfg):
    """Traduce el error a algo accionable. Un traceback de smtplib no le dice a
    nadie si el problema es la contraseña, el puerto o la red."""
    host, puerto = cfg.get("SMTP_HOST"), cfg.get("SMTP_PUERTO")

    if isinstance(error, (TimeoutError, OSError)) and not isinstance(error, smtplib.SMTPException):
        pista = ""
        if str(puerto) == "465":
            pista = " El puerto 465 requiere SSL directo; si tu servidor usa STARTTLS, prueba el 587."
        elif str(puerto) == "587":
            pista = " Prueba el puerto 465, que a veces sí pasa cuando el 587 está bloqueado."
        return (f"No se pudo conectar con {host}:{puerto}. La red bloqueó la salida o el "
                f"puerto no corresponde al servidor.{pista} Compruébalo con: "
                f"Test-NetConnection {host} -Port {puerto}")

    if isinstance(error, smtplib.SMTPAuthenticationError):
        return ("El servidor rechazó el usuario o la contraseña. En Gmail hace falta una "
                "contraseña de aplicación, no la contraseña normal de la cuenta.")

    if isinstance(error, smtplib.SMTPSenderRefused):
        return (f"El servidor no acepta enviar como {cfg.get('CORREO_REMITENTE')}. "
                "Normalmente el remitente debe ser la misma cuenta que autenticó.")

    return f"{type(error).__name__}: {error}"


def _enviar(app, destinatarios, asunto, cuerpo):
    """Devuelve None si salió bien, o el motivo en texto si falló."""
    with app.app_context():
        cfg = app.config
        if not cfg.get("SMTP_HOST"):
            # En desarrollo no hay SMTP: se registra para poder verificarlo
            # sin depender del correo institucional.
            app.logger.info("[correo simulado] %s -> %s\n%s", asunto, destinatarios, cuerpo)
            return None
        try:
            msg = EmailMessage()
            msg["Subject"] = asunto
            msg["From"] = cfg["CORREO_REMITENTE"]
            msg["To"] = ", ".join(destinatarios)
            msg.set_content(cuerpo)

            with _conectar(cfg) as servidor:
                if cfg.get("SMTP_USUARIO"):
                    servidor.login(cfg["SMTP_USUARIO"], cfg["SMTP_PASSWORD"])
                rechazados = servidor.send_message(msg)

            # El éxito también se registra: sin esto no hay forma de distinguir
            # "salió bien" de "nunca se intentó", que es justo lo que pasa cuando
            # un correo no llega y el log está en silencio.
            if rechazados:
                app.logger.warning("Correo enviado, pero el servidor rechazó a %s",
                                   list(rechazados))
            else:
                app.logger.info("Correo enviado a %s — asunto: %s", destinatarios, asunto)
            return None
        except Exception as error:
            # Un fallo de correo nunca debe tumbar un trámite ya guardado.
            motivo = _explicar(error, cfg)
            app.logger.error("No se pudo enviar el correo a %s: %s", destinatarios, motivo)
            return motivo


def _en_segundo_plano(destinatarios, asunto, cuerpo):
    """Envía el correo. Por omisión, ANTES de responder la petición.

    El nombre quedó de cuando se hacía en un hilo aparte. Se cambió porque en un
    servidor gratuito la instancia puede dormirse o reiniciarse justo después de
    responder, y entonces el hilo muere y el correo se pierde sin dejar rastro:
    ni error, ni mensaje en la bandeja de enviados. Imposible de diagnosticar.

    Con unos pocos trámites al día, esperar uno o dos segundos no se nota, y a
    cambio el envío ocurre o falla con constancia. Si algún día el volumen crece
    y la espera molesta, CORREO_ASINCRONO=true devuelve el comportamiento
    anterior, asumiendo ese riesgo.
    """
    if not destinatarios:
        # Tampoco esto es silencioso: un aviso sin destinatarios suele significar
        # que alguien no tiene correo registrado.
        current_app.logger.info("Sin destinatarios para: %s", asunto)
        return

    app = current_app._get_current_object()

    if app.config.get("CORREO_ASINCRONO"):
        threading.Thread(
            target=_enviar, args=(app, destinatarios, asunto, cuerpo), daemon=True
        ).start()
        return

    _enviar(app, destinatarios, asunto, cuerpo)


def _enlace(tramite):
    base = current_app.config.get("URL_PUBLICA", "").rstrip("/")
    return f"{base}/tramites/{tramite.folio}"


def _correos_del_rol(programa_id, rol):
    return [
        u.correo for u in Usuario.query.filter_by(rol=rol, activo=True).all()
        if u.programa_id in (None, programa_id)
    ]


def _supervisores(programa_id, autor=None):
    """Quienes pidieron enterarse de todo. Se excluye a quien causó el evento:
    nadie necesita un correo avisándole de lo que acaba de hacer."""
    return [
        u.correo for u in Usuario.query.filter_by(
            notificaciones_todas=True, activo=True
        ).all()
        if u.programa_id in (None, programa_id) and (autor is None or u.id != autor.id)
    ]


def _cuerpo(tramite, encabezado, detalle=""):
    return (
        f"{encabezado}\n\n"
        f"Trámite: {tramite.folio}\n"
        f"Documento: {tramite.tipo.nombre}\n"
        f"Alumno: {tramite.alumno.nombre} ({tramite.alumno.identificador})\n"
        f"{detalle}\n"
        f"Consulta el detalle aquí:\n{_enlace(tramite)}\n\n"
        "No respondas a este mensaje. Si necesitas aclarar algo, usa los "
        "comentarios dentro del trámite para que quede registrado.\n"
    )


def tramite_iniciado(tramite, alumno):
    """El único correo que recibe el personal, y el primero de los dos del alumno.

    Se avisa a las tres áreas al crearse el trámite, no cuando les toca actuar.
    Así cada persona recibe un correo por trámite y no uno por movimiento: un
    aviso en cada cambio de etapa termina en que nadie los lee.

    A Administración solo se le avisa si hay dinero de por medio. Un trámite sin
    costo nunca pasa por ahí, y de hecho ni siquiera puede verlo.
    """
    from .models import MomentoPago

    _en_segundo_plano(
        [tramite.alumno.correo],
        f"[{tramite.folio}] Recibimos tu solicitud",
        _cuerpo(
            tramite,
            "Tu solicitud quedó registrada.",
            "Te escribiremos otra vez cuando tu documento esté listo. Mientras "
            "tanto puedes seguir el avance desde la ventanilla.\n",
        ),
    )

    destinos = _correos_del_rol(tramite.programa_id, Rol.SECRETARIA)
    if tramite.momento_pago != MomentoPago.SIN_COSTO:
        destinos += _correos_del_rol(tramite.programa_id, Rol.ADMINISTRADOR)
    destinos += _correos_del_rol(tramite.programa_id, Rol.COORDINADORA)

    etapa = _etapa_actual(tramite)
    _en_segundo_plano(
        [d for d in dict.fromkeys(destinos) if d != alumno.correo],
        f"[{tramite.folio}] Nueva solicitud de trámite",
        _cuerpo(
            tramite,
            "Se solicitó un trámite nuevo.",
            f"Empieza en: {etapa.nombre} "
            f"({etapa.actor.value if etapa.actor else 'la ventanilla'}).\n"
            "Este es el único aviso de este trámite: el avance se sigue desde la "
            "ventanilla.\n",
        ),
    )


def tramite_concluido(tramite, autor):
    """El segundo y último correo del alumno."""
    _en_segundo_plano(
        [tramite.alumno.correo] + _supervisores(tramite.programa_id, autor),
        f"[{tramite.folio}] Tu documento está listo",
        _cuerpo(
            tramite,
            "Tu trámite concluyó.",
            "Descarga tu documento, y el recibo de tu pago si lo hubo, desde la "
            "ventanilla.\n",
        ),
    )


def pago_rechazado(tramite, motivo, autor=None):
    """Excepción a la regla de dos correos: si no se le avisa, el alumno se
    queda esperando un documento que nunca va a llegar."""
    _en_segundo_plano(
        [tramite.alumno.correo] + _supervisores(tramite.programa_id, autor),
        f"[{tramite.folio}] Tu pago necesita corrección",
        _cuerpo(tramite, "Administración devolvió tu trámite.", f"Motivo: {motivo}\n"),
    )


def nuevo_comentario(tramite, autor, etapa):
    """Solo se avisa al alumno, y solo si comentó alguien más.

    El personal ve los comentarios al abrir el trámite que ya tiene en su cola;
    el alumno no está pendiente del sistema, así que a él sí hay que buscarlo."""
    if autor.id == tramite.alumno_id:
        destinos = _supervisores(tramite.programa_id, autor)
    else:
        destinos = [tramite.alumno.correo] + _supervisores(tramite.programa_id, autor)

    _en_segundo_plano(
        list(dict.fromkeys(destinos)),
        f"[{tramite.folio}] Nuevo comentario",
        _cuerpo(tramite, f"{autor.nombre} comentó en tu trámite."),
    )


def _etapa_actual(tramite):
    from .dominio import etapas as E
    return E.etapa_actual(tramite)


def enlace_de_activacion(correo, token):
    base = current_app.config.get("URL_PUBLICA", "").rstrip("/")
    _en_segundo_plano(
        [correo],
        "Activa tu cuenta de la Ventanilla Virtual",
        "Para activar tu cuenta y definir tu contraseña, abre este enlace:\n\n"
        f"{base}/activar?token={token}\n\n"
        "El enlace vence en 48 horas. Si no solicitaste esto, ignora el mensaje.\n",
    )


def enlace_de_restablecimiento(correo, token):
    base = current_app.config.get("URL_PUBLICA", "").rstrip("/")
    _en_segundo_plano(
        [correo],
        "Restablece tu contraseña de la Ventanilla Virtual",
        "Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"{base}/restablecer?token={token}\n\n"
        "El enlace vence en 2 horas y solo se puede usar una vez.\n"
        "Si no lo solicitaste, ignora este mensaje: tu contraseña no cambió.\n",
    )


def prueba(correo):
    """Envío de prueba SÍNCRONO: a diferencia de las notificaciones, aquí sí
    interesa esperar el resultado. Un botón que siempre dice «enviado» mientras
    el error solo aparece en la consola del servidor no sirve para configurar
    nada. Devuelve None si salió bien, o el motivo del fallo."""
    from flask import current_app
    return _enviar(
        current_app._get_current_object(),
        [correo],
        "Prueba de la Ventanilla Virtual",
        "Si recibiste este mensaje, el envío de correo está bien configurado.\n\n"
        "Las notificaciones del sistema llegan así: con un enlace al trámite y "
        "nunca con archivos adjuntos.\n",
    )
