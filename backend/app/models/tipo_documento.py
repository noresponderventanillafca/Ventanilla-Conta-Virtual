import enum

from ..extensions import db
from .base import ARGS_MYSQL


class MomentoPago(str, enum.Enum):
    """Un solo campo define el recorrido completo del trámite: las etapas,
    quiénes participan y qué pantallas se muestran. Un cuarto tipo de trámite
    es un valor más aquí, no un flujo nuevo."""

    SIN_COSTO = "sin_costo"
    AL_SOLICITAR = "al_solicitar"
    TRAS_LINEA_DE_CAPTURA = "tras_linea_de_captura"


class TipoDocumento(db.Model):
    __tablename__ = "tipos_documento"
    __table_args__ = (
        db.UniqueConstraint("programa_id", "clave", name="uq_tipo_clave_programa"),
        ARGS_MYSQL,
    )

    id = db.Column(db.Integer, primary_key=True)
    programa_id = db.Column(db.Integer, db.ForeignKey("programas.id"), nullable=False)

    # Clave corta y estable. Con ella el alumno puede armar el concepto del
    # depósito ANTES de entrar al sistema, que es lo que hace en la práctica:
    # ya se sabe el pago y deposita de memoria. Un concepto basado en el folio
    # no serviría, porque cuando deposita el trámite todavía no existe.
    clave = db.Column(db.String(12), nullable=False)

    nombre = db.Column(db.String(160), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    # Para qué sirve y qué se necesita: es lo que evita que el alumno pida el
    # documento equivocado, que con pago por adelantado ya no tiene vuelta atrás.
    requisitos = db.Column(db.Text, nullable=True)

    # Muestra del documento, para que el alumno vea qué va a recibir.
    ejemplo_ruta = db.Column(db.String(400), nullable=True)
    ejemplo_nombre = db.Column(db.String(255), nullable=True)

    # Un documento, un pago, un recibo. Administración emite recibo por cada
    # documento, así que no existe la noción de cantidad: dos constancias son
    # dos solicitudes con dos depósitos distintos.
    costo = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    momento_pago = db.Column(db.Enum(MomentoPago), nullable=False)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    programa = db.relationship("Programa")

    def concepto_para(self, matricula: str) -> str | None:
        """Lo que el alumno escribe en el concepto del depósito.
        Solo aplica a pago directo: con línea de captura, la referencia que
        emite Secretaría cumple esa función."""
        if self.momento_pago != MomentoPago.AL_SOLICITAR:
            return None
        return f"{matricula} {self.clave}"

    ACTORES = {
        MomentoPago.SIN_COSTO: ["Secretaría"],
        MomentoPago.AL_SOLICITAR: ["Administración", "Secretaría"],
        MomentoPago.TRAS_LINEA_DE_CAPTURA: ["Secretaría", "Administración"],
    }

    @property
    def participantes(self) -> list[str]:
        """Quiénes intervienen. Se deriva del momento de pago en vez de ser un
        campo aparte: dos campos que pueden contradecirse acaban contradiciéndose."""
        return self.ACTORES[self.momento_pago]

    def a_dict(self, matricula=None):
        from pathlib import Path
        return {
            "id": self.id,
            "clave": self.clave,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "requisitos": self.requisitos,
            "costo": float(self.costo),
            "momento_pago": self.momento_pago.value,
            "participantes": self.participantes,
            "activo": self.activo,
            "concepto": self.concepto_para(matricula) if matricula else None,
            "ejemplo": None if not self.ejemplo_ruta else {
                "nombre": self.ejemplo_nombre,
                "mime": {".pdf": "application/pdf", ".jpg": "image/jpeg",
                         ".jpeg": "image/jpeg", ".png": "image/png"}.get(
                             Path(self.ejemplo_ruta).suffix.lower(), "application/octet-stream"),
            },
        }
