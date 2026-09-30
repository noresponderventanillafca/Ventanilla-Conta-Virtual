import enum

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

from ..extensions import db
from .base import ARGS_MYSQL, ahora


class Rol(str, enum.Enum):
    ALUMNO = "alumno"
    SECRETARIA = "secretaria"
    ADMINISTRADOR = "administrador"
    COORDINADORA = "coordinadora"


class PadronAlumno(db.Model):
    """Alta previa de alumnos. La CURP sirve para PROBAR que la persona está
    en el padrón, nunca como contraseña: sus primeros 10 caracteres se derivan
    del nombre y la fecha de nacimiento, así que no son un secreto."""

    __tablename__ = "padron_alumnos"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(20), unique=True, nullable=False, index=True)
    curp_prefijo = db.Column(db.String(10), nullable=False)
    nombre = db.Column(db.String(160), nullable=False)
    correo_institucional = db.Column(db.String(160), nullable=False)
    programa_id = db.Column(db.Integer, db.ForeignKey("programas.id"), nullable=False)
    activado = db.Column(db.Boolean, nullable=False, default=False)

    # Desde cuándo está en el programa. Con esto se calcula la vigencia: pasada
    # la duración máxima de la carrera, el alumno pierde el acceso. Si no viene
    # en la carga, se usa la fecha de alta en el sistema.
    fecha_ingreso = db.Column(db.Date, nullable=True)
    creado_en = db.Column(db.DateTime, nullable=False, default=ahora)
    dado_de_baja = db.Column(db.Boolean, nullable=False, default=False)

    programa = db.relationship("Programa")

    @property
    def inicio(self):
        return self.fecha_ingreso or self.creado_en.date()


class Usuario(UserMixin, db.Model):
    __tablename__ = "usuarios"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    identificador = db.Column(db.String(60), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(160), nullable=False)
    correo = db.Column(db.String(160), nullable=False)
    rol = db.Column(db.Enum(Rol), nullable=False)
    programa_id = db.Column(db.Integer, db.ForeignKey("programas.id"), nullable=True)

    password_hash = db.Column(db.String(255), nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    creado_en = db.Column(db.DateTime, nullable=False, default=ahora)
    intentos_fallidos = db.Column(db.Integer, nullable=False, default=0)
    bloqueado_hasta = db.Column(db.DateTime, nullable=True)

    # El personal se da de alta con una contraseña temporal conocida. Hasta que
    # la cambie, el servidor le bloquea todo lo demás: tres personas
    # compartiendo una clave conocida, con acceso a comprobantes bancarios de
    # cientos de alumnos, no puede llegar a producción.
    debe_cambiar_password = db.Column(db.Boolean, nullable=False, default=False)

    # La Coordinación supervisa el proceso completo, así que recibe aviso de
    # todo lo que pasa. Es una preferencia y no una regla fija: si la bandeja
    # se le llena, puede apagarla desde Ajustes sin tocar el sistema.
    notificaciones_todas = db.Column(db.Boolean, nullable=False, default=False)

    programa = db.relationship("Programa")

    def definir_password(self, password, temporal=False):
        self.password_hash = generate_password_hash(password)
        self.debe_cambiar_password = temporal
        self.intentos_fallidos = 0
        self.bloqueado_hasta = None

    def sello_password(self) -> str:
        """Huella del hash actual. Va dentro de los enlaces de restablecimiento
        para que dejen de servir en cuanto la contraseña cambia: así un enlace
        usado, o uno viejo que siga en la bandeja, ya no vale."""
        import hashlib
        return hashlib.sha256((self.password_hash or "").encode()).hexdigest()[:16]

    def verificar_password(self, password):
        return bool(self.password_hash) and check_password_hash(self.password_hash, password)

    @property
    def es_alumno(self):
        return self.rol == Rol.ALUMNO

    def a_dict(self):
        return {
            "id": self.id,
            "identificador": self.identificador,
            "nombre": self.nombre,
            "rol": self.rol.value,
            "programa": self.programa.a_dict() if self.programa else None,
            "debe_cambiar_password": self.debe_cambiar_password,
            "notificaciones_todas": self.notificaciones_todas,
        }
