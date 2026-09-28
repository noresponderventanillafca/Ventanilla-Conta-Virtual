import enum

from ..extensions import db
from .base import ARGS_MYSQL, ahora


class TipoEvento(str, enum.Enum):
    ETAPA = "etapa"
    COMENTARIO = "comentario"
    DEVOLUCION = "devolucion"


class Evento(db.Model):
    """Bitácora. Solo se inserta: nunca se edita ni se borra.

    Los comentarios viven aquí junto a los cambios de etapa para que exista
    una sola cronología. Un comentario nunca cambia el estado del trámite."""

    __tablename__ = "eventos_tramite"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    tramite_id = db.Column(db.Integer, db.ForeignKey("tramites.id"), nullable=False, index=True)
    tipo = db.Column(db.Enum(TipoEvento), nullable=False)

    etapa_anterior = db.Column(db.Integer, nullable=True)
    etapa_nueva = db.Column(db.Integer, nullable=True)

    texto = db.Column(db.Text, nullable=True)
    autor_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    creado_en = db.Column(db.DateTime, nullable=False, default=ahora, index=True)

    tramite = db.relationship("Tramite", back_populates="eventos")
    autor = db.relationship("Usuario")
    archivos = db.relationship("Archivo", back_populates="evento")
