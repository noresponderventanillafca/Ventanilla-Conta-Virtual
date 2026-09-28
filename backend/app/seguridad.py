from functools import wraps

from flask import jsonify
from flask_login import current_user

from .models import Rol


def rol_requerido(*roles):
    def decorador(f):
        @wraps(f)
        def envoltura(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({"error": "No has iniciado sesión"}), 401
            if current_user.rol not in roles:
                return jsonify({"error": "No tienes permiso para esta acción"}), 403
            return f(*args, **kwargs)
        return envoltura
    return decorador


def puede_ver(usuario, tramite) -> bool:
    """Alumno: solo lo suyo. Personal: solo su programa.
    Toda consulta se filtra por programa desde ahora, para que crecer a otras
    carreras no obligue a revisar cada endpoint."""
    if usuario.rol == Rol.ALUMNO:
        return tramite.alumno_id == usuario.id
    if usuario.programa_id not in (None, tramite.programa_id):
        return False
    if usuario.rol == Rol.COORDINADORA:
        return True

    from .models import MomentoPago, Evento
    from .extensions import db
    from .dominio import etapas as E

    if usuario.rol == Rol.ADMINISTRADOR and tramite.momento_pago == MomentoPago.SIN_COSTO:
        # Sin dinero de por medio el expediente no le corresponde, tampoco
        # entrando por la URL.
        return False

    # Secretaría y Administración: lo que ya atendieron o lo que les toca ahora.
    # Cualquier otro expediente pertenece a alumnos con los que no han tratado.
    if E.puede_actuar(usuario, tramite):
        return True
    return db.session.query(Evento.id).filter_by(
        tramite_id=tramite.id, autor_id=usuario.id
    ).first() is not None
