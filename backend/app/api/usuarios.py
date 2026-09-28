"""Alta y baja del personal, a cargo de la Coordinación.

Cada persona tiene su propia cuenta. Nunca se comparte ni se hereda: si la
nueva coordinadora entrara con la cuenta de la anterior, todo lo que hiciera
quedaría firmado con el nombre de quien ya se fue, y la bitácora dejaría de
servir para aclarar nada.

Relevar un cargo es dar de baja a una persona y dar de alta a otra. El rol se
transfiere; la cuenta no.
"""

import re
import secrets
import string

from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models import Usuario, Rol, Evento
from ..seguridad import rol_requerido
from ..dominio.servicios import ErrorDominio

bp = Blueprint("usuarios", __name__)

ROLES_PERSONAL = [Rol.SECRETARIA, Rol.ADMINISTRADOR, Rol.COORDINADORA]

# Solo letras. Los alumnos entran con matrícula, que lleva dígitos, así que
# esta regla garantiza además que un usuario de personal nunca colisione con
# la matrícula de un estudiante.
PATRON_IDENTIFICADOR = re.compile(r"^[A-ZÑ]{2,20}$")


@bp.errorhandler(ErrorDominio)
def _error(e):
    db.session.rollback()
    return jsonify({"error": str(e)}), 400


def _password_temporal() -> str:
    alfabeto = string.ascii_lowercase + string.digits
    return "-".join("".join(secrets.choice(alfabeto) for _ in range(4)) for _ in range(3))


def _activos_con_rol(rol):
    return Usuario.query.filter_by(rol=rol, activo=True, programa_id=current_user.programa_id).count()


def _serializar(u):
    return {
        **u.a_dict(),
        "correo": u.correo,
        "activo": u.activo,
        "debe_cambiar_password": u.debe_cambiar_password,
        "acciones": db.session.query(Evento.id).filter_by(autor_id=u.id).count(),
        "creado_en": u.creado_en.isoformat() if u.creado_en else None,
    }


@bp.get("")
@rol_requerido(Rol.COORDINADORA)
def listar():
    """Incluye a las personas dadas de baja: su historial sigue existiendo y la
    Coordinación necesita poder consultarlas o reactivarlas."""
    usuarios = Usuario.query.filter(
        Usuario.rol.in_(ROLES_PERSONAL),
        Usuario.programa_id == current_user.programa_id,
    ).order_by(Usuario.activo.desc(), Usuario.nombre).all()
    return jsonify([_serializar(u) for u in usuarios])


def _leer(datos, usuario=None):
    identificador = (datos.get("identificador") or "").strip().upper()
    nombre = (datos.get("nombre") or "").strip()
    correo = (datos.get("correo") or "").strip()
    rol = (datos.get("rol") or "").strip()

    if not nombre:
        raise ErrorDominio("Escribe el nombre completo de la persona.")
    if not PATRON_IDENTIFICADOR.match(identificador):
        raise ErrorDominio(
            "El usuario debe tener entre 2 y 20 letras, sin números, espacios ni acentos."
        )
    if "@" not in correo:
        raise ErrorDominio("Escribe un correo válido: ahí llegan las notificaciones.")
    if rol not in [r.value for r in ROLES_PERSONAL]:
        raise ErrorDominio("Elige un rol válido.")

    repetido = Usuario.query.filter_by(identificador=identificador).first()
    if repetido and (usuario is None or repetido.id != usuario.id):
        raise ErrorDominio(f"El usuario {identificador} ya existe.")

    return {"identificador": identificador, "nombre": nombre,
            "correo": correo, "rol": Rol(rol)}


@bp.post("")
@rol_requerido(Rol.COORDINADORA)
def crear():
    """Devuelve una contraseña temporal UNA sola vez: no se guarda en claro, así
    que si se pierde hay que generar otra. El sistema obliga a cambiarla en el
    primer acceso."""
    datos = request.get_json() or {}
    campos = _leer(datos)

    usuario = Usuario(programa_id=current_user.programa_id, **campos)
    temporal = _password_temporal()
    usuario.definir_password(temporal, temporal=True)
    usuario.notificaciones_todas = bool(datos.get("notificaciones_todas"))
    db.session.add(usuario)
    db.session.commit()

    return jsonify({**_serializar(usuario), "password_temporal": temporal}), 201


@bp.put("/<int:usuario_id>")
@rol_requerido(Rol.COORDINADORA)
def editar(usuario_id):
    usuario = _obtener(usuario_id)
    if usuario is None:
        return jsonify({"error": "Persona no encontrada"}), 404

    datos = request.get_json() or {}
    campos = _leer(datos, usuario)

    # No quedarse sin coordinación: nadie podría volver a administrar usuarios.
    if (usuario.rol == Rol.COORDINADORA and campos["rol"] != Rol.COORDINADORA
            and usuario.activo and _activos_con_rol(Rol.COORDINADORA) <= 1):
        raise ErrorDominio(
            "Es la única coordinación activa. Da de alta a la persona que la "
            "releva antes de cambiarle el rol."
        )

    for campo, valor in campos.items():
        setattr(usuario, campo, valor)
    if "notificaciones_todas" in datos:
        usuario.notificaciones_todas = bool(datos["notificaciones_todas"])

    db.session.commit()
    return jsonify(_serializar(usuario))


@bp.post("/<int:usuario_id>/activo")
@rol_requerido(Rol.COORDINADORA)
def cambiar_activo(usuario_id):
    """Las personas se dan de baja, nunca se borran: sus acciones siguen en la
    bitácora y un evento sin autor es un evento que no se puede aclarar."""
    usuario = _obtener(usuario_id)
    if usuario is None:
        return jsonify({"error": "Persona no encontrada"}), 404

    activo = bool((request.get_json() or {}).get("activo"))

    if not activo and usuario.id == current_user.id:
        raise ErrorDominio("No puedes darte de baja a ti misma.")
    if (not activo and usuario.rol == Rol.COORDINADORA
            and _activos_con_rol(Rol.COORDINADORA) <= 1):
        raise ErrorDominio(
            "Es la única coordinación activa. Da de alta a quien la releva antes "
            "de darla de baja, o nadie podrá administrar el sistema."
        )

    usuario.activo = activo
    db.session.commit()
    return jsonify(_serializar(usuario))


@bp.post("/<int:usuario_id>/password")
@rol_requerido(Rol.COORDINADORA)
def restablecer(usuario_id):
    """Para cuando alguien olvida su contraseña y el correo no está disponible."""
    usuario = _obtener(usuario_id)
    if usuario is None:
        return jsonify({"error": "Persona no encontrada"}), 404

    temporal = _password_temporal()
    usuario.definir_password(temporal, temporal=True)
    db.session.commit()
    return jsonify({**_serializar(usuario), "password_temporal": temporal})


def _obtener(usuario_id):
    usuario = db.session.get(Usuario, usuario_id)
    if (not usuario or usuario.rol not in ROLES_PERSONAL
            or usuario.programa_id != current_user.programa_id):
        return None
    return usuario
