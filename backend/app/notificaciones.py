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


def _enviar(app, destinatarios, asunto, cuerpo):
    with app.app_context():
        cfg = app.config
        if not cfg.get("SMTP_HOST"):
            # En desarrollo no hay SMTP: se registra para poder verificarlo
            # sin depender del correo institucional.
            app.logger.info("[correo simulado] %s -> %s\n%s", asunto, destinatarios, cuerpo)
            return
        try:
            msg = EmailMessage()
            msg["Subject"] = asunto
            msg["From"] = cfg["CORREO_REMITENTE"]
            msg["To"] = ", ".join(destinatarios)
            msg.set_content(cuerpo)

            with smtplib.SMTP(cfg["SMTP_HOST"], cfg["SMTP_PUERTO"], timeout=15) as s:
                s.starttls()
                if cfg.get("SMTP_USUARIO"):
                    s.login(cfg["SMTP_USUARIO"], cfg["SMTP_PASSWORD"])
                s.send_message(msg)
        except Exception:
            # Un fallo de correo nunca debe tumbar un trámite ya guardado.
            app.logger.exception("No se pudo enviar el correo a %s", destinatarios)


def _en_segundo_plano(destinatarios, asunto, cuerpo):
    if not destinatarios:
        return
    app = current_app._get_current_object()
    threading.Thread(
        target=_enviar, args=(app, destinatarios, asunto, cuerpo), daemon=True
    ).start()


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


def cambio_de_etapa(tramite, etapa, autor):
    """Al alumno siempre; al nuevo responsable solo si le toca actuar."""
    destinos = []
    if autor.id != tramite.alumno_id:
        destinos.append(tramite.alumno.correo)

    if etapa.actor in (Rol.SECRETARIA, Rol.ADMINISTRADOR) and autor.rol != etapa.actor:
        destinos += _correos_del_rol(tramite.programa_id, etapa.actor)

    destinos += _supervisores(tramite.programa_id, autor)

    if etapa.actor is None:
        asunto = f"[{tramite.folio}] Tu documento está listo"
        encabezado = "Tu trámite concluyó y el documento ya está disponible."
    else:
        asunto = f"[{tramite.folio}] {etapa.nombre}"
        encabezado = f"El trámite avanzó a: {etapa.nombre}."

    _en_segundo_plano(list(dict.fromkeys(destinos)), asunto, _cuerpo(tramite, encabezado))


def recibo_emitido(tramite, autor):
    """El recibo va al alumno y a Secretaría al mismo tiempo: uno lo necesita
    como comprobante de su pago, la otra para poder elaborar el documento."""
    destinos = ([tramite.alumno.correo]
                + _correos_del_rol(tramite.programa_id, Rol.SECRETARIA)
                + _supervisores(tramite.programa_id, autor))
    _en_segundo_plano(
        list(dict.fromkeys(destinos)),
        f"[{tramite.folio}] Recibo de pago emitido",
        _cuerpo(
            tramite,
            "Administración emitió el recibo del pago.",
            "El recibo está disponible en el trámite. Secretaría ya puede "
            "elaborar el documento.\n",
        ),
    )


def pago_rechazado(tramite, motivo, autor=None):
    _en_segundo_plano(
        [tramite.alumno.correo] + _supervisores(tramite.programa_id, autor),
        f"[{tramite.folio}] Tu pago necesita corrección",
        _cuerpo(tramite, "Administración devolvió tu trámite.", f"Motivo: {motivo}\n"),
    )


def nuevo_comentario(tramite, autor, etapa):
    """A los participantes activos, menos a quien escribió."""
    destinos = []
    if autor.id != tramite.alumno_id:
        destinos.append(tramite.alumno.correo)
    if etapa.actor in (Rol.SECRETARIA, Rol.ADMINISTRADOR) and autor.rol != etapa.actor:
        destinos += _correos_del_rol(tramite.programa_id, etapa.actor)
    destinos += _supervisores(tramite.programa_id, autor)

    _en_segundo_plano(
        list(dict.fromkeys(destinos)),
        f"[{tramite.folio}] Nuevo comentario",
        _cuerpo(tramite, f"{autor.nombre} comentó en el trámite."),
    )


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
    """Envío de prueba, para verificar la configuración del servidor de correo
    sin tener que provocar un trámite real."""
    _en_segundo_plano(
        [correo],
        "Prueba de la Ventanilla Virtual",
        "Si recibiste este mensaje, el envío de correo está bien configurado.\n\n"
        "Las notificaciones del sistema llegan así: con un enlace al trámite y "
        "nunca con archivos adjuntos.\n",
    )
