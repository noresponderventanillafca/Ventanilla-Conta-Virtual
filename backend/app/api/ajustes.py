"""Ajustes del programa: catálogo de documentos y cuenta institucional.

Es la pantalla que permite que un procedimiento nuevo no requiera programar.
Solo la Coordinación entra aquí: define qué se puede solicitar, cuánto cuesta
y a dónde se deposita.
"""

from pathlib import Path

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user

from ..extensions import db
from ..models import TipoDocumento, MomentoPago, Tramite, Rol, CuentaInstitucional, Programa
from ..seguridad import rol_requerido
from ..dominio.servicios import ErrorDominio
from ..almacenamiento import guardar, entregar, comprobar as comprobar_almacen
from .. import notificaciones as N

bp = Blueprint("ajustes", __name__)


@bp.errorhandler(ErrorDominio)
def _error(e):
    db.session.rollback()
    return jsonify({"error": str(e)}), 400


def _cuenta():
    cuenta = CuentaInstitucional.query.filter_by(programa_id=current_user.programa_id).first()
    if not cuenta:
        cuenta = CuentaInstitucional(programa_id=current_user.programa_id)
        db.session.add(cuenta)
        db.session.commit()
    return cuenta


# --------------------------------------------------------------------------
# Catálogo de documentos
# --------------------------------------------------------------------------

@bp.get("/documentos")
@rol_requerido(Rol.COORDINADORA)
def listar():
    """Incluye los desactivados: la Coordinación necesita verlos para reactivarlos."""
    consulta = TipoDocumento.query
    if current_user.programa_id:
        consulta = consulta.filter_by(programa_id=current_user.programa_id)
    tipos = consulta.order_by(TipoDocumento.nombre).all()

    salida = []
    for t in tipos:
        d = t.a_dict()
        d["tramites"] = Tramite.query.filter_by(tipo_documento_id=t.id).count()
        salida.append(d)
    return jsonify(salida)


def _leer_campos(datos, tipo=None):
    clave = (datos.get("clave") or "").strip().upper()
    nombre = (datos.get("nombre") or "").strip()
    momento = (datos.get("momento_pago") or "").strip()

    if not nombre:
        raise ErrorDominio("El documento necesita un nombre.")
    if not clave or not clave.replace("-", "").isalnum() or len(clave) > 12:
        raise ErrorDominio(
            "La clave debe ser corta (máximo 12), sin espacios ni acentos. "
            "El alumno la va a teclear en el banco."
        )
    if momento not in [m.value for m in MomentoPago]:
        raise ErrorDominio("Indica si el documento lleva pago y en qué momento.")

    try:
        costo = float(datos.get("costo") or 0)
    except ValueError:
        raise ErrorDominio("El costo debe ser un número.")
    if costo < 0:
        raise ErrorDominio("El costo no puede ser negativo.")
    if momento == MomentoPago.SIN_COSTO.value and costo != 0:
        raise ErrorDominio("Un documento sin costo no puede tener precio.")
    if momento != MomentoPago.SIN_COSTO.value and costo == 0:
        raise ErrorDominio("Un documento con pago necesita un costo mayor a cero.")

    repetida = TipoDocumento.query.filter_by(
        programa_id=current_user.programa_id, clave=clave
    ).first()
    if repetida and (tipo is None or repetida.id != tipo.id):
        raise ErrorDominio(f"Ya existe un documento con la clave {clave}.")

    return {
        "clave": clave, "nombre": nombre,
        "descripcion": (datos.get("descripcion") or "").strip() or None,
        "requisitos": (datos.get("requisitos") or "").strip() or None,
        "costo": costo, "momento_pago": MomentoPago(momento),
    }


@bp.post("/documentos")
@rol_requerido(Rol.COORDINADORA)
def crear():
    campos = _leer_campos(request.form or request.get_json() or {})
    tipo = TipoDocumento(programa_id=current_user.programa_id, **campos)
    db.session.add(tipo)
    db.session.flush()

    ejemplo = request.files.get("ejemplo")
    if ejemplo:
        _guardar_ejemplo(tipo, ejemplo)

    db.session.commit()
    return jsonify(tipo.a_dict()), 201


@bp.put("/documentos/<int:tipo_id>")
@bp.post("/documentos/<int:tipo_id>")
@rol_requerido(Rol.COORDINADORA)
def editar(tipo_id):
    """Editar el catálogo NO altera los trámites en curso: cada uno congeló su
    costo, su recorrido y su concepto de depósito al nacer."""
    tipo = db.session.get(TipoDocumento, tipo_id)
    if not tipo or tipo.programa_id != current_user.programa_id:
        return jsonify({"error": "Documento no encontrado"}), 404

    datos = request.form or request.get_json() or {}
    for campo, valor in _leer_campos(datos, tipo).items():
        setattr(tipo, campo, valor)

    ejemplo = request.files.get("ejemplo")
    if ejemplo:
        _guardar_ejemplo(tipo, ejemplo)

    db.session.commit()
    return jsonify(tipo.a_dict())


@bp.post("/documentos/<int:tipo_id>/activo")
@rol_requerido(Rol.COORDINADORA)
def cambiar_activo(tipo_id):
    """Los documentos se desactivan, nunca se borran: hay trámites que apuntan
    a ellos y un expediente sin tipo de documento es un expediente roto.
    Desactivado significa que ya no se puede solicitar, no que desaparezca."""
    tipo = db.session.get(TipoDocumento, tipo_id)
    if not tipo or tipo.programa_id != current_user.programa_id:
        return jsonify({"error": "Documento no encontrado"}), 404

    tipo.activo = bool((request.get_json() or {}).get("activo"))
    db.session.commit()
    return jsonify(tipo.a_dict())


def _guardar_ejemplo(tipo, archivo):
    meta = guardar(archivo, f"ejemplos/{tipo.clave}")
    tipo.ejemplo_ruta = meta["ruta_relativa"]
    tipo.ejemplo_nombre = meta["nombre_original"]


@bp.get("/documentos/<int:tipo_id>/ejemplo")
@login_required
def ver_ejemplo(tipo_id):
    """Lo pueden ver todos los que hayan iniciado sesión, incluidos los alumnos:
    es justo el material que les ayuda a elegir bien."""
    tipo = db.session.get(TipoDocumento, tipo_id)
    if not tipo or not tipo.ejemplo_ruta:
        return jsonify({"error": "Este documento no tiene ejemplo"}), 404

    mime = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png"}.get(Path(tipo.ejemplo_ruta).suffix.lower(),
                                     "application/octet-stream")
    respuesta = entregar(tipo.ejemplo_ruta, tipo.ejemplo_nombre, mime,
                         request.args.get("descargar") == "1")
    if respuesta is None:
        return jsonify({"error": "El ejemplo ya no está disponible"}), 404
    return respuesta


# --------------------------------------------------------------------------
# Cuenta institucional
# --------------------------------------------------------------------------

@bp.get("/cuenta")
@rol_requerido(Rol.COORDINADORA)
def ver_cuenta():
    return jsonify(_cuenta().a_dict())


@bp.put("/cuenta")
@rol_requerido(Rol.COORDINADORA)
def guardar_cuenta():
    datos = request.get_json() or {}
    cuenta = _cuenta()
    for campo in ("banco", "titular", "cuenta", "clabe", "notas"):
        if campo in datos:
            setattr(cuenta, campo, (datos.get(campo) or "").strip())
    cuenta.actualizado_por_id = current_user.id
    db.session.commit()
    return jsonify(cuenta.a_dict())


# --------------------------------------------------------------------------
# Notificaciones
# --------------------------------------------------------------------------

@bp.get("/notificaciones")
@rol_requerido(Rol.COORDINADORA)
def ver_notificaciones():
    return jsonify({
        "notificaciones_todas": current_user.notificaciones_todas,
        "correo": current_user.correo,
        "correo_configurado": bool(current_app.config.get("SMTP_HOST")),
    })


@bp.put("/notificaciones")
@rol_requerido(Rol.COORDINADORA)
def guardar_notificaciones():
    current_user.notificaciones_todas = bool(
        (request.get_json() or {}).get("notificaciones_todas")
    )
    db.session.commit()
    return jsonify({"notificaciones_todas": current_user.notificaciones_todas})


@bp.post("/notificaciones/prueba")
@rol_requerido(Rol.COORDINADORA)
def probar_correo():
    """Manda un correo a quien lo pide. Sirve para verificar la configuración
    del servidor sin tener que provocar un trámite real."""
    if not current_app.config.get("SMTP_HOST"):
        return jsonify({
            "error": "No hay servidor de correo configurado. Mientras tanto, los "
                     "avisos se escriben en la consola del servidor."
        }), 400
    motivo = N.prueba(current_user.correo)
    if motivo:
        return jsonify({"error": motivo}), 502
    return jsonify({"mensaje": f"Enviamos una prueba a {current_user.correo}. "
                               "Revisa la bandeja y también el correo no deseado."})


# --------------------------------------------------------------------------
# Vigencia del padrón
# --------------------------------------------------------------------------

@bp.get("/vigencia")
@rol_requerido(Rol.COORDINADORA)
def ver_vigencia():
    return jsonify({"anios_vigencia": current_user.programa.anios_vigencia})


@bp.put("/vigencia")
@rol_requerido(Rol.COORDINADORA)
def guardar_vigencia():
    """Cuántos años puede un alumno usar la ventanilla. Pasado ese tiempo pierde
    el acceso; lo que necesite después se atiende por correo."""
    try:
        anios = int((request.get_json() or {}).get("anios_vigencia"))
    except (TypeError, ValueError):
        raise ErrorDominio("Indica un número de años.")
    if not 1 <= anios <= 20:
        raise ErrorDominio("La vigencia debe estar entre 1 y 20 años.")

    programa = db.session.get(Programa, current_user.programa_id)
    programa.anios_vigencia = anios
    db.session.commit()
    return jsonify({"anios_vigencia": anios})
