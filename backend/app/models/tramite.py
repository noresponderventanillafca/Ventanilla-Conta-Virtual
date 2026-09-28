from decimal import Decimal

from ..extensions import db
from .base import ARGS_MYSQL, ahora
from .tipo_documento import MomentoPago


class Tramite(db.Model):
    """El expediente: un documento, un pago, un recibo.

    `etapa_idx` y `desde` son una copia del último evento para poder consultar
    rápido; la verdad histórica vive en `eventos`."""

    __tablename__ = "tramites"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    folio = db.Column(db.String(20), unique=True, nullable=False, index=True)

    programa_id = db.Column(db.Integer, db.ForeignKey("programas.id"), nullable=False, index=True)
    alumno_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False, index=True)
    tipo_documento_id = db.Column(db.Integer, db.ForeignKey("tipos_documento.id"), nullable=False)

    # Todo esto se congela al crear. La coordinadora puede editar el catálogo
    # cuando quiera, y los trámites en curso conservan las condiciones con las
    # que nacieron: el costo que se cobró, el recorrido que se les prometió y
    # el concepto que el alumno anotó para ir al banco.
    costo = db.Column(db.Numeric(10, 2), nullable=False)
    momento_pago = db.Column(db.Enum(MomentoPago), nullable=False)
    concepto_deposito = db.Column(db.String(60), nullable=True)

    etapa_idx = db.Column(db.Integer, nullable=False, default=0)
    desde = db.Column(db.DateTime, nullable=False, default=ahora)
    creado_en = db.Column(db.DateTime, nullable=False, default=ahora)

    # Lo que el alumno pide junto con el documento: a quién va dirigido, en qué
    # formato, para qué. Es parte de la solicitud, no de la conversación, así
    # que vive en el trámite y se muestra donde no se pueda pasar por alto.
    observaciones = db.Column(db.Text, nullable=True)

    linea_captura = db.Column(db.String(60), nullable=True)
    devolucion_motivo = db.Column(db.String(300), nullable=True)

    programa = db.relationship("Programa")
    alumno = db.relationship("Usuario")
    tipo = db.relationship("TipoDocumento")
    eventos = db.relationship("Evento", back_populates="tramite",
                              order_by="Evento.creado_en", cascade="all, delete-orphan")
    pagos = db.relationship("Pago", back_populates="tramite",
                            order_by="Pago.creado_en", cascade="all, delete-orphan")
    archivos = db.relationship("Archivo", back_populates="tramite", cascade="all, delete-orphan")

    @property
    def total(self) -> Decimal:
        return Decimal(self.costo)


