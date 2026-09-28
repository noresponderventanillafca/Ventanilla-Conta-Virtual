import os
import uuid
from pathlib import Path

from flask import current_app
from werkzeug.utils import secure_filename

from .dominio.servicios import ErrorDominio, hash_de


def guardar(archivo_subido, folio: str) -> dict:
    """Guarda fuera del directorio público y devuelve los metadatos.
    El nombre se reescribe: nunca se confía en el que trae el navegador."""
    nombre = secure_filename(archivo_subido.filename or "")
    extension = Path(nombre).suffix.lower()
    if extension not in current_app.config["EXTENSIONES_PERMITIDAS"]:
        raise ErrorDominio("Solo se aceptan archivos PDF, JPG o PNG.")

    hash_sha = hash_de(archivo_subido.stream)

    carpeta = Path(current_app.config["RUTA_ARCHIVOS"]) / folio
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre_guardado = f"{uuid.uuid4().hex}{extension}"
    destino = carpeta / nombre_guardado
    archivo_subido.save(destino)

    return {
        "nombre_original": nombre,
        "ruta_relativa": f"{folio}/{nombre_guardado}",
        "tamanio_bytes": os.path.getsize(destino),
        "hash_sha256": hash_sha,
    }
