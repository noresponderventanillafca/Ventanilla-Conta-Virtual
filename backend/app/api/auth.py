import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request, current_app, session
from flask_login import login_user, logout_user, login_required, current_user
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from ..extensions import db
from ..models import Usuario, PadronAlumno, Rol
from ..politica_password import validar as validar_password
from .. import notificaciones as N

bp = Blueprint("auth", __name__)

MAX_INTENTOS = 5
BLOQUEO_MINUTOS = 15


def _serializador(salt="activacion"):
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=salt)


def _iniciar_sesion(usuario):
    """Único lugar donde se abre una sesión.

    Hay tres puertas de entrada —acceso normal, activación de cuenta y
    restablecimiento de contraseña— y las tres tienen que dejar la sesión con
    la misma caducidad. Cuando cada una llamaba a login_user por su cuenta, dos
    de ellas se quedaban sin límite de tiempo.
    """
    login_user(usuario, remember=False)
    # permanent no significa «para siempre»: es lo que activa
    # PERMANENT_SESSION_LIFETIME. Sin esto la cookie es de navegador y sobrevive
    # mientras la ventana siga abierta, que fue justo el problema.
    session.permanent = True
    session["inicio"] = datetime.now(timezone.utc).timestamp()


@bp.post("/activar/verificar")
def verificar_padron():
    """Paso 1 de la activación.

    La CURP prueba que la persona está en el padrón, y ahí termina su papel.
    No es contraseña: sus primeros 10 caracteres se derivan del nombre y la
    fecha de nacimiento, así que cualquier compañero de grupo podría
    calcularla. El enlace se envía al correo institucional, que es lo que
    prueba que quien activa es el titular.
    """
    datos = request.get_json() or {}
    matricula = (datos.get("matricula") or "").strip().upper()
    curp = (datos.get("curp_prefijo") or "").strip().upper()

    registro = PadronAlumno.query.filter_by(matricula=matricula).first()

    # Respuesta idéntica exista o no: no revelamos quién está en el padrón.
    if registro and not registro.activado and registro.curp_prefijo.upper() == curp:
        token = _serializador().dumps({"matricula": matricula})
        current_app.logger.info("Activación solicitada por %s, enviando a %s",
                                matricula, registro.correo_institucional)
        N.enlace_de_activacion(registro.correo_institucional, token)
        # El token se devuelve solo en desarrollo, donde no hay SMTP.
        if not current_app.config.get("SMTP_HOST"):
            return jsonify({
                "mensaje": "Te enviamos un enlace a tu correo institucional.",
                "token_desarrollo": token,
            })

    # Si llegamos aquí no se envió nada: la matrícula no está en el padrón, la
    # CURP no coincide o la cuenta ya fue activada. La respuesta es idéntica a
    # propósito, para no revelar quién está registrado; el log sí lo distingue.
    current_app.logger.info(
        "Activación solicitada por %s: sin coincidencia en el padrón, no se envió nada.",
        matricula or "(sin matrícula)")
    return jsonify({"mensaje": "Te enviamos un enlace a tu correo institucional."})


@bp.post("/activar/confirmar")
def confirmar_activacion():
    """Paso 2: con el enlace, el alumno define su propia contraseña."""
    datos = request.get_json() or {}
    token = datos.get("token") or ""
    password = datos.get("password") or ""

    try:
        carga = _serializador().loads(token, max_age=60 * 60 * 48)
    except SignatureExpired:
        return jsonify({"error": "El enlace expiró. Solicita uno nuevo."}), 400
    except BadSignature:
        return jsonify({"error": "El enlace no es válido."}), 400

    registro = PadronAlumno.query.filter_by(matricula=carga["matricula"]).first()
    if not registro or registro.activado or registro.dado_de_baja:
        return jsonify({"error": "Esta cuenta ya fue activada."}), 400

    # Red de seguridad por si la matrícula ya la ocupa alguien del personal.
    # El alta lo impide en los dos sentidos, pero una coincidencia creada antes
    # de que existiera esa comprobación reventaría aquí con un error de base de
    # datos, y el alumno solo vería «Ocurrió un error».
    ocupado = Usuario.query.filter_by(identificador=registro.matricula).first()
    if ocupado:
        return jsonify({
            "error": "Tu matrícula ya está registrada como usuario de otra "
                     "persona en el sistema. Avisa a la Coordinación: hay que "
                     "corregirlo antes de que puedas activar tu cuenta.",
        }), 409

    usuario = Usuario(
        identificador=registro.matricula,
        nombre=registro.nombre,
        correo=registro.correo_institucional,
        rol=Rol.ALUMNO,
        programa_id=registro.programa_id,
    )
    motivo = validar_password(password)
    if motivo:
        return jsonify({"error": motivo}), 400

    usuario.definir_password(password)
    registro.activado = True
    db.session.add(usuario)
    db.session.commit()

    _iniciar_sesion(usuario)
    return jsonify(usuario.a_dict())


@bp.post("/login")
def login():
    datos = request.get_json() or {}
    identificador = (datos.get("identificador") or "").strip().upper()
    password = datos.get("password") or ""

    usuario = Usuario.query.filter_by(identificador=identificador).first()
    ahora = datetime.now(timezone.utc)

    if usuario and usuario.bloqueado_hasta and usuario.bloqueado_hasta > ahora.replace(tzinfo=None):
        return jsonify({"error": "Cuenta bloqueada temporalmente. Intenta más tarde."}), 429

    if not usuario or not usuario.activo or not usuario.verificar_password(password):
        if usuario:
            usuario.intentos_fallidos += 1
            if usuario.intentos_fallidos >= MAX_INTENTOS:
                usuario.bloqueado_hasta = ahora.replace(tzinfo=None) + timedelta(minutes=BLOQUEO_MINUTOS)
                usuario.intentos_fallidos = 0
            db.session.commit()
        return jsonify({"error": "Matrícula o contraseña incorrectas."}), 401

    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db.session.commit()

    _iniciar_sesion(usuario)
    return jsonify(usuario.a_dict())


@bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"mensaje": "Sesión cerrada"})


@bp.get("/yo")
@login_required
def yo():
    return jsonify(current_user.a_dict())


# --------------------------------------------------------------------------
# Contraseña
# --------------------------------------------------------------------------

@bp.post("/password")
@login_required
def cambiar_password():
    """Exige la contraseña actual a propósito: si alguien encuentra una sesión
    abierta, no debe poder dejar fuera a su dueño."""
    datos = request.get_json() or {}
    actual = datos.get("actual") or ""
    nueva = datos.get("nueva") or ""

    if not current_user.verificar_password(actual):
        return jsonify({"error": "La contraseña actual no es correcta."}), 400

    motivo = validar_password(nueva, current_user)
    if motivo:
        return jsonify({"error": motivo}), 400

    current_user.definir_password(nueva)
    db.session.commit()
    return jsonify({"mensaje": "Contraseña actualizada.", "usuario": current_user.a_dict()})


@bp.post("/password/olvide")
def olvide_password():
    """Responde siempre lo mismo exista o no la cuenta: si el mensaje cambiara,
    cualquiera podría averiguar qué matrículas están registradas."""
    identificador = ((request.get_json() or {}).get("identificador") or "").strip().upper()
    usuario = Usuario.query.filter_by(identificador=identificador, activo=True).first()

    respuesta = {"mensaje": "Si la cuenta existe, enviamos un enlace al correo registrado."}

    if usuario and usuario.password_hash:
        token = _serializador("restablecer").dumps({
            "id": usuario.id, "sello": usuario.sello_password(),
        })
        N.enlace_de_restablecimiento(usuario.correo, token)
        if not current_app.config.get("SMTP_HOST"):
            respuesta["token_desarrollo"] = token

    return jsonify(respuesta)


@bp.post("/password/restablecer")
def restablecer_password():
    datos = request.get_json() or {}
    token = datos.get("token") or ""
    nueva = datos.get("nueva") or ""

    try:
        carga = _serializador("restablecer").loads(token, max_age=60 * 60 * 2)
    except SignatureExpired:
        return jsonify({"error": "El enlace expiró. Solicita uno nuevo."}), 400
    except BadSignature:
        return jsonify({"error": "El enlace no es válido."}), 400

    usuario = db.session.get(Usuario, carga.get("id"))
    if not usuario or not usuario.activo:
        return jsonify({"error": "El enlace no es válido."}), 400

    # El sello deja de coincidir en cuanto la contraseña cambia: un enlace ya
    # usado, o uno viejo que siga en la bandeja, no sirve.
    if carga.get("sello") != usuario.sello_password():
        return jsonify({"error": "Ese enlace ya se usó. Solicita uno nuevo."}), 400

    motivo = validar_password(nueva, usuario)
    if motivo:
        return jsonify({"error": motivo}), 400

    usuario.definir_password(nueva)
    db.session.commit()
    _iniciar_sesion(usuario)
    return jsonify(usuario.a_dict())
