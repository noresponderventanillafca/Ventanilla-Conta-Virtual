"""Transiciones de estado. Todo cambio pasa por aquí para que ningún camino
deje la bitácora incompleta."""

import hashlib
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import (
    Tramite, Evento, TipoEvento, Pago, EstadoPago, MomentoPago, Rol,
)
from . import etapas as E


class ErrorDominio(Exception):
    """Error esperable de negocio: se traduce a un 400 con mensaje legible."""


def _ahora():
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# Folio
# --------------------------------------------------------------------------

def siguiente_folio(programa_clave="CV") -> str:
    anio = datetime.now().year
    prefijo = f"{programa_clave}-{anio}-"
    ultimo = (
        db.session.query(Tramite.folio)
        .filter(Tramite.folio.like(f"{prefijo}%"))
        .order_by(Tramite.folio.desc())
        .first()
    )
    consecutivo = int(ultimo[0].split("-")[-1]) + 1 if ultimo else 1
    return f"{prefijo}{consecutivo:04d}"


# --------------------------------------------------------------------------
# Creación
# --------------------------------------------------------------------------

def crear_solicitud(alumno, tipo, datos_pago=None, observaciones=None) -> Tramite:
    """Un trámite = un documento = un pago = un recibo.

    No hay paso de borrador: el concepto del depósito se arma con la matrícula
    y la clave del documento, así que el alumno lo conoce sin que el sistema
    haya generado nada. Si necesita dos constancias, crea dos solicitudes con
    dos depósitos distintos, porque Administración emite un recibo por cada
    documento.
    """
    tramite = Tramite(
        folio=siguiente_folio(alumno.programa.clave if alumno.programa else "CV"),
        programa_id=alumno.programa_id,
        alumno_id=alumno.id,
        tipo_documento_id=tipo.id,
        costo=tipo.costo,
        momento_pago=tipo.momento_pago,
        concepto_deposito=tipo.concepto_para(alumno.identificador),
        observaciones=(observaciones or "").strip() or None,
        etapa_idx=0,
        desde=_ahora(),
    )
    db.session.add(tramite)
    db.session.flush()

    if tramite.momento_pago == MomentoPago.AL_SOLICITAR:
        if not datos_pago:
            raise ErrorDominio("Este trámite requiere el comprobante de pago.")
        registrar_pago(tramite, datos_pago)
        texto = "Solicitud y comprobante enviados"
    else:
        texto = "Solicitud registrada"

    _registrar_evento(tramite, TipoEvento.ETAPA, alumno, texto,
                      etapa_anterior=None, etapa_nueva=0)
    _avanzar(tramite, alumno, texto, ya_registrado=True)
    return tramite


# --------------------------------------------------------------------------
# Pagos
# --------------------------------------------------------------------------

def registrar_pago(tramite, datos) -> Pago:
    """`datos` trae monto, fecha_deposito, referencia_operacion y hash_archivo.

    Solo se piden datos que el sistema no puede saber por su cuenta: la fecha
    del depósito y el número de operación. El monto lo fija el catálogo y la
    comprobación de que el depósito fue por esa cantidad la hace una persona
    leyendo el comprobante.
    """
    referencia = datos["referencia_operacion"].strip()
    if not referencia:
        raise ErrorDominio("Falta el número de operación del depósito.")

    hash_archivo = datos.get("hash_archivo")

    # Se comprueba antes de insertar para poder decir QUÉ está duplicado.
    # "Ese comprobante ya existe" no le dice al alumno si debe corregir el
    # número que tecleó o subir la imagen correcta.
    if db.session.query(Pago).filter_by(referencia_operacion=referencia).first():
        raise ErrorDominio(
            f"El número de operación {referencia} ya está registrado en otro "
            "trámite. Revisa que sea el del depósito de este documento: cada "
            "documento necesita su propio pago."
        )
    if hash_archivo and db.session.query(Pago).filter_by(hash_archivo=hash_archivo).first():
        raise ErrorDominio(
            "Ese archivo ya se usó como comprobante en otro trámite. Sube el "
            "comprobante del depósito correspondiente a este documento."
        )

    pago = Pago(
        tramite_id=tramite.id,
        fecha_deposito=datos["fecha_deposito"],
        referencia_operacion=referencia,
        hash_archivo=hash_archivo,
    )
    db.session.add(pago)
    try:
        # La restricción UNIQUE sigue siendo la defensa real: la comprobación
        # de arriba mejora el mensaje, pero no protege contra dos envíos
        # simultáneos.
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        raise ErrorDominio("Ese comprobante ya está registrado en otro trámite.")
    return pago


def confirmar_pago(tramite, administrador):
    """El administrador coteja el comprobante contra el recibo que tiene a la
    mano y confirma que la referencia corresponde.

    Aquí no sube nada: el recibo oficial lo genera fuera del sistema y se lo
    entrega en físico a Secretaría, que lo escanea. Pedirle además que lo
    subiera duplicaría el trabajo y dejaría el trámite detenido esperando un
    archivo que ya viaja por otro lado."""
    pago = _pago_vigente(tramite)
    if pago is None:
        raise ErrorDominio("Este trámite no tiene un pago declarado.")

    pago.estado = EstadoPago.VALIDADO
    pago.validado_por_id = administrador.id
    pago.validado_en = _ahora()

    _avanzar(tramite, administrador, "Recibo de pago emitido")
    return tramite


def rechazar_pago(tramite, administrador, motivo: str):
    if not motivo or not motivo.strip():
        raise ErrorDominio("El rechazo necesita un motivo.")

    pago = _pago_vigente(tramite)
    if pago:
        pago.estado = EstadoPago.RECHAZADO
        pago.motivo_rechazo = motivo.strip()

    destino = (
        0 if tramite.momento_pago == MomentoPago.AL_SOLICITAR
        else E.indice_de(tramite, "comprobante")
    )
    anterior = tramite.etapa_idx
    tramite.etapa_idx = destino
    tramite.desde = _ahora()
    tramite.devolucion_motivo = motivo.strip()

    _registrar_evento(
        tramite, TipoEvento.DEVOLUCION, administrador,
        f"Pago rechazado: {motivo.strip()}",
        etapa_anterior=anterior, etapa_nueva=destino,
    )
    return tramite


def _pago_vigente(tramite):
    for pago in reversed(tramite.pagos):
        if pago.estado != EstadoPago.RECHAZADO:
            return pago
    return None


# --------------------------------------------------------------------------
# Avance genérico
# --------------------------------------------------------------------------

def avanzar_etapa(tramite, usuario, texto: str):
    if not E.puede_actuar(usuario, tramite):
        raise ErrorDominio("No te corresponde actuar en esta etapa del trámite.")
    return _avanzar(tramite, usuario, texto)


def _avanzar(tramite, usuario, texto, ya_registrado=False):
    etapas = E.etapas_de_tramite(tramite)
    anterior = tramite.etapa_idx
    tramite.etapa_idx = min(anterior + 1, len(etapas) - 1)
    tramite.desde = _ahora()
    tramite.devolucion_motivo = None
    if not ya_registrado:
        _registrar_evento(tramite, TipoEvento.ETAPA, usuario, texto,
                          etapa_anterior=anterior, etapa_nueva=tramite.etapa_idx)
    return tramite


# --------------------------------------------------------------------------
# Comentarios
# --------------------------------------------------------------------------

def comentar(tramite, usuario, texto: str):
    """Un comentario nunca mueve el trámite de etapa. Si el alumno pide un
    cambio, secretaría debe devolverlo formalmente; de lo contrario habría
    trámites que 'avanzaron' en la conversación pero no en el estado."""
    if not texto or not texto.strip():
        raise ErrorDominio("El comentario está vacío.")
    return _registrar_evento(tramite, TipoEvento.COMENTARIO, usuario, texto.strip())


def _registrar_evento(tramite, tipo, autor, texto, etapa_anterior=None, etapa_nueva=None):
    evento = Evento(
        tramite_id=tramite.id,
        tipo=tipo,
        texto=texto,
        autor_id=autor.id,
        etapa_anterior=etapa_anterior,
        etapa_nueva=etapa_nueva,
        creado_en=_ahora(),
    )
    db.session.add(evento)
    db.session.flush()
    return evento


# --------------------------------------------------------------------------
# Serialización
# --------------------------------------------------------------------------

def hash_de(stream) -> str:
    h = hashlib.sha256()
    for bloque in iter(lambda: stream.read(8192), b""):
        h.update(bloque)
    stream.seek(0)
    return h.hexdigest()


def tramite_a_dict(tramite, detallado=False):
    etapas = E.etapas_de_tramite(tramite)
    etapa = E.etapa_actual(tramite)
    base = {
        "folio": tramite.folio,
        "tipo": tramite.tipo.nombre,
        "momento_pago": tramite.momento_pago.value,
        "clave_documento": tramite.tipo.clave,
        "total": float(tramite.total),
        "alumno": tramite.alumno.nombre,
        "matricula": tramite.alumno.identificador,
        "correo_alumno": tramite.alumno.correo,
        "programa": tramite.programa.nombre if tramite.programa else None,
        "creado_en": tramite.creado_en.isoformat(),
        "desde": tramite.desde.isoformat(),
        "etapa_idx": tramite.etapa_idx,
        "etapa_actual": etapa.nombre,
        "etapa_clave": etapa.clave,
        "responsable": etapa.actor.value if etapa.actor else None,
        "dias_en_etapa": E.dias_habiles_desde(tramite.desde),
        "dias_max": etapa.dias_max,
        "retrasado": E.esta_retrasado(tramite),
        "concluido": E.esta_concluido(tramite),
        # Nadie ha actuado todavía más allá de crearlo. Sirve para distinguir
        # un trámite recién llegado del que ya está en proceso.
        "nuevo": sum(1 for e in tramite.eventos if e.tipo == TipoEvento.ETAPA) <= 1,
        "devolucion_motivo": tramite.devolucion_motivo,
        "observaciones": tramite.observaciones,
    }
    if not detallado:
        return base

    base["etapas"] = [
        {"clave": e.clave, "nombre": e.nombre,
         "actor": e.actor.value if e.actor else None, "dias_max": e.dias_max}
        for e in etapas
    ]
    base["eventos"] = [
        {"tipo": ev.tipo.value, "texto": ev.texto, "autor": ev.autor.nombre,
         "rol": ev.autor.rol.value, "fecha": ev.creado_en.isoformat(),
         "archivos": [a.a_dict() for a in ev.archivos]}
        for ev in tramite.eventos
    ]
    base["archivos"] = [a.a_dict() for a in tramite.archivos]
    pago = _pago_vigente(tramite)
    base["pago"] = None if not pago else {
        "fecha_deposito": pago.fecha_deposito.isoformat(),
        "referencia_operacion": pago.referencia_operacion,
        "estado": pago.estado.value,
    }
    base["verificaciones"] = _verificaciones(tramite, pago)
    base["concepto_deposito"] = tramite.concepto_deposito
    base["linea_captura"] = tramite.linea_captura
    return base


def _verificaciones(tramite, pago):
    """Lo que el sistema puede comprobar solo. Deliberadamente NO incluye si
    la imagen dice lo que el alumno tecleó: eso requiere que una persona la
    lea, y por eso la interfaz separa estas casillas de las manuales."""
    if pago is None:
        return []

    from datetime import date, timedelta

    duplicados = db.session.query(Pago).filter(
        Pago.referencia_operacion == pago.referencia_operacion
    ).count()

    hoy = date.today()
    fecha_ok = pago.fecha_deposito <= hoy and pago.fecha_deposito >= hoy - timedelta(days=180)

    # Solo lo que el sistema puede comprobar por sí mismo. El monto NO está
    # aquí a propósito: verificarlo exige leer el comprobante.
    return [
        {"ok": duplicados == 1,
         "texto": ("Operación no registrada antes" if duplicados == 1
                   else "Operación duplicada en otro trámite")},
        {"ok": fecha_ok,
         "texto": ("Fecha del depósito coherente" if fecha_ok
                   else "Fecha futura o demasiado antigua")},
    ]
