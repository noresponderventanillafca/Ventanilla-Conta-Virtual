from ..extensions import db
from .base import ARGS_MYSQL, ahora


class CuentaInstitucional(db.Model):
    """Datos bancarios editables por la Coordinación.

    Estaban escritos en el código, y eso obligaba a tocar el sistema cada vez
    que la universidad cambiara de cuenta. Se guarda quién la modificó y cuándo:
    si un alumno deposita en una cuenta que dejó de usarse, hace falta saber
    hasta qué día se estuvo mostrando esa información.
    """

    __tablename__ = "cuenta_institucional"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    programa_id = db.Column(db.Integer, db.ForeignKey("programas.id"), nullable=False, unique=True)

    banco = db.Column(db.String(120), nullable=False, default="")
    titular = db.Column(db.String(160), nullable=False, default="")
    cuenta = db.Column(db.String(60), nullable=False, default="")
    clabe = db.Column(db.String(60), nullable=False, default="")
    notas = db.Column(db.String(400), nullable=True)

    actualizado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    actualizado_en = db.Column(db.DateTime, nullable=False, default=ahora, onupdate=ahora)

    programa = db.relationship("Programa")
    actualizado_por = db.relationship("Usuario")

    def a_dict(self):
        return {
            "banco": self.banco, "titular": self.titular,
            "cuenta": self.cuenta, "clabe": self.clabe, "notas": self.notas,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
            "actualizado_por": self.actualizado_por.nombre if self.actualizado_por else None,
        }
