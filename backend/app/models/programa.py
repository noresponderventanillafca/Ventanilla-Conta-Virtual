from ..extensions import db
from .base import ARGS_MYSQL


class Programa(db.Model):
    """Programa educativo. Existe desde el día uno aunque solo haya uno:
    filtrar por programa después es carísimo, ahora es gratis."""

    __tablename__ = "programas"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(160), nullable=False)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    # Duración máxima de la carrera. Pasado ese tiempo el alumno pierde el
    # acceso a la ventanilla; lo que necesite después se atiende por correo.
    anios_vigencia = db.Column(db.Integer, nullable=False, default=6)

    def a_dict(self):
        return {"id": self.id, "clave": self.clave, "nombre": self.nombre,
                "anios_vigencia": self.anios_vigencia}
