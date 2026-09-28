import enum

from ..extensions import db
from .base import ARGS_MYSQL, ahora


class TipoArchivo(str, enum.Enum):
    COMPROBANTE_PAGO = "comprobante_pago"
    LINEA_CAPTURA = "linea_captura"
    RECIBO = "recibo"
    DOCUMENTO_FINAL = "documento_final"
    ANEXO_COMENTARIO = "anexo_comentario"


class Archivo(db.Model):
    """Los archivos viven en disco, fuera del directorio público, y se sirven
    por una ruta que verifica permisos. Aquí solo queda el registro."""

    __tablename__ = "archivos"
    __table_args__ = ARGS_MYSQL

    id = db.Column(db.Integer, primary_key=True)
    tramite_id = db.Column(db.Integer, db.ForeignKey("tramites.id"), nullable=False, index=True)
    evento_id = db.Column(db.Integer, db.ForeignKey("eventos_tramite.id"), nullable=True)

    tipo = db.Column(db.Enum(TipoArchivo), nullable=False)
    nombre_original = db.Column(db.String(255), nullable=False)
    ruta_relativa = db.Column(db.String(400), nullable=False)
    tamanio_bytes = db.Column(db.Integer, nullable=False)
    hash_sha256 = db.Column(db.String(64), nullable=False, index=True)

    subido_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    creado_en = db.Column(db.DateTime, nullable=False, default=ahora)

    tramite = db.relationship("Tramite", back_populates="archivos")
    evento = db.relationship("Evento", back_populates="archivos")
    subido_por = db.relationship("Usuario")

    MIMES = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }

    @property
    def mime(self) -> str:
        from pathlib import Path
        return self.MIMES.get(Path(self.ruta_relativa).suffix.lower(), "application/octet-stream")

    def a_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo.value,
            "nombre": self.nombre_original,
            "mime": self.mime,
            "tamanio_bytes": self.tamanio_bytes,
            "creado_en": self.creado_en.isoformat(),
        }
