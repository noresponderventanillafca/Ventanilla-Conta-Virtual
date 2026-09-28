import enum

from ..extensions import db
from .base import ARGS_MYSQL, ahora


class EstadoPago(str, enum.Enum):
    DECLARADO = "declarado"
    VALIDADO = "validado"
    RECHAZADO = "rechazado"


class Pago(db.Model):
    """Un trámite puede tener varios intentos de pago (si uno fue rechazado),
    pero cada operación bancaria solo puede existir una vez en todo el sistema.

    Esa restricción UNIQUE es la defensa real contra el comprobante duplicado:
    no depende de que el alumno escriba bien el concepto ni de que el banco lo
    respete. Por eso se pide el número de operación completo y no cuatro
    dígitos, que sí colisionarían entre trámites legítimos."""

    __tablename__ = "pagos"
    __table_args__ = (
        db.UniqueConstraint("referencia_operacion", name="uq_pagos_referencia"),
        db.UniqueConstraint("hash_archivo", name="uq_pagos_hash_archivo"),
        ARGS_MYSQL,
    )

    id = db.Column(db.Integer, primary_key=True)
    tramite_id = db.Column(db.Integer, db.ForeignKey("tramites.id"), nullable=False, index=True)

    # No se guarda el monto que teclea el alumno: sería lo que la pantalla
    # acaba de decirle, así que compararlo contra lo esperado siempre pasa y no
    # prueba nada. El monto real está en la imagen del comprobante y solo una
    # persona puede leerlo. Lo esperado ya vive en `tramites.costo`.
    fecha_deposito = db.Column(db.Date, nullable=False)
    referencia_operacion = db.Column(db.String(60), nullable=False)
    hash_archivo = db.Column(db.String(64), nullable=True)

    estado = db.Column(db.Enum(EstadoPago), nullable=False, default=EstadoPago.DECLARADO)
    motivo_rechazo = db.Column(db.String(300), nullable=True)

    # Quién emitió el recibo y cuándo. No hay casillas de confirmación: el
    # administrador no tiene forma de comprobar que el dinero cayó en la
    # cuenta, así que pedirle que lo afirmara sólo dejaba un rastro falso.
    # El acto real es emitir el recibo oficial y subirlo; ese archivo es la
    # evidencia, y lleva nombre y hora.
    validado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    validado_en = db.Column(db.DateTime, nullable=True)

    creado_en = db.Column(db.DateTime, nullable=False, default=ahora)

    tramite = db.relationship("Tramite", back_populates="pagos")
    validado_por = db.relationship("Usuario")
