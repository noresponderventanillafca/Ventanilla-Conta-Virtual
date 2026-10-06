"""Guardado de archivos, con dos destinos intercambiables.

En desarrollo escribe en disco. En producción escribe en almacenamiento de
objetos compatible con S3 (Cloudflare R2, Backblaze B2), porque el disco de los
servidores gratuitos es efímero: todo lo subido desaparece en cada reinicio o
redespliegue, y este sistema existe precisamente para custodiar esos archivos.

Los archivos NUNCA se sirven con una URL pública del almacén. Se leen desde aquí
y se entregan a través de la API, que es donde se comprueba quién puede verlos:
un comprobante de pago lleva datos bancarios de un alumno.
"""

import io
import os
import uuid
from functools import lru_cache
from pathlib import Path

from flask import current_app, send_file
from werkzeug.utils import secure_filename

from .dominio.servicios import ErrorDominio, hash_de


def _en_s3() -> bool:
    return current_app.config.get("ALMACENAMIENTO") == "s3"


@lru_cache(maxsize=1)
def _cliente(endpoint, clave, secreto, region):
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=clave,
        aws_secret_access_key=secreto,
        region_name=region,
        config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
    )


def _normalizar_endpoint(endpoint: str) -> tuple[str, str | None]:
    """El endpoint debe ser solo el de la cuenta, sin el bucket.

    El panel de Cloudflare muestra bien a la vista la URL con el bucket
    incluido, así que copiarla completa es el error más frecuente. Con esa
    barra de más, boto3 arma la ruta como `.../bucket/bucket/archivo` y R2
    responde 403, que parece un problema de permisos sin serlo.

    Se recorta para que el sistema funcione igual, pero se avisa: la variable
    sigue mal puesta y conviene corregirla.
    """
    from urllib.parse import urlparse

    partes = urlparse(endpoint.strip().rstrip("/"))
    if not partes.scheme:
        return endpoint, ("S3_ENDPOINT debe empezar con https://")

    limpio = f"{partes.scheme}://{partes.netloc}"
    if partes.path:
        return limpio, (
            f"S3_ENDPOINT traía «{partes.path}» al final. El endpoint es solo el "
            f"de la cuenta, sin el bucket. Se ignoró esa parte, pero corrígela "
            f"en la configuración: debe ser {limpio}"
        )
    return limpio, None


def _s3():
    cfg = current_app.config
    faltan = [c for c in ("S3_ENDPOINT", "S3_CLAVE", "S3_SECRETO", "S3_BUCKET")
              if not cfg.get(c)]
    if faltan:
        raise ErrorDominio(
            "El almacenamiento de archivos está mal configurado: faltan "
            + ", ".join(faltan)
        )

    endpoint, aviso = _normalizar_endpoint(cfg["S3_ENDPOINT"])
    if aviso:
        current_app.logger.warning(aviso)

    return _cliente(endpoint, cfg["S3_CLAVE"], cfg["S3_SECRETO"],
                    cfg.get("S3_REGION", "auto")), cfg["S3_BUCKET"]


# --------------------------------------------------------------------------
# Escritura
# --------------------------------------------------------------------------

def guardar(archivo_subido, carpeta: str) -> dict:
    """Guarda y devuelve los metadatos. El nombre se reescribe: nunca se confía
    en el que trae el navegador."""
    nombre = secure_filename(archivo_subido.filename or "")
    extension = Path(nombre).suffix.lower()
    if extension not in current_app.config["EXTENSIONES_PERMITIDAS"]:
        raise ErrorDominio("Solo se aceptan archivos PDF, JPG o PNG.")

    hash_sha = hash_de(archivo_subido.stream)
    ruta = f"{carpeta}/{uuid.uuid4().hex}{extension}"

    if _en_s3():
        cliente, bucket = _s3()
        archivo_subido.stream.seek(0)
        datos = archivo_subido.stream.read()
        cliente.put_object(Bucket=bucket, Key=ruta, Body=datos,
                           ContentType=archivo_subido.mimetype or "application/octet-stream")
        tamanio = len(datos)
    else:
        destino = Path(current_app.config["RUTA_ARCHIVOS"]) / ruta
        destino.parent.mkdir(parents=True, exist_ok=True)
        archivo_subido.save(destino)
        tamanio = os.path.getsize(destino)

    return {
        "nombre_original": nombre,
        "ruta_relativa": ruta,
        "tamanio_bytes": tamanio,
        "hash_sha256": hash_sha,
    }


# --------------------------------------------------------------------------
# Lectura
# --------------------------------------------------------------------------

def entregar(ruta_relativa: str, nombre: str, mime: str, adjunto: bool):
    """Devuelve la respuesta de Flask con el archivo, pasando siempre por la
    comprobación de permisos que hace quien llama a esta función."""
    if _en_s3():
        cliente, bucket = _s3()
        try:
            objeto = cliente.get_object(Bucket=bucket, Key=ruta_relativa)
        except Exception:
            return None
        datos = io.BytesIO(objeto["Body"].read())
        respuesta = send_file(datos, mimetype=mime, download_name=nombre,
                              as_attachment=adjunto)
    else:
        ruta = Path(current_app.config["RUTA_ARCHIVOS"]) / ruta_relativa
        if not ruta.exists():
            return None
        respuesta = send_file(ruta, mimetype=mime, download_name=nombre,
                              as_attachment=adjunto, conditional=True)

    # Los suben los usuarios: sin blindaje, un PDF con scripts se ejecutaría
    # en el contexto del sitio.
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    respuesta.headers["Content-Security-Policy"] = "default-src 'none'; sandbox; object-src 'self'"
    return respuesta


def borrar(ruta_relativa: str) -> bool:
    if _en_s3():
        try:
            cliente, bucket = _s3()
            cliente.delete_object(Bucket=bucket, Key=ruta_relativa)
            return True
        except Exception:
            current_app.logger.exception("No se pudo borrar %s", ruta_relativa)
            return False

    ruta = Path(current_app.config["RUTA_ARCHIVOS"]) / ruta_relativa
    if ruta.exists():
        ruta.unlink()
        return True
    return False


PISTAS = {
    "403": "Las claves no tienen permiso sobre este bucket. Revisa que el token "
           "de R2 sea de tipo «Object Read & Write» y que esté alcanzando a este "
           "bucket, no a otro.",
    "401": "Las claves son incorrectas. El Secret Access Key solo se muestra una "
           "vez al crear el token; si se perdió, genera uno nuevo.",
    "404": "El bucket no existe con ese nombre. Compáralo con el del panel de R2: "
           "distingue mayúsculas.",
    "NoSuchBucket": "El bucket no existe con ese nombre en esta cuenta.",
    "InvalidAccessKeyId": "El Access Key ID no corresponde a ninguna cuenta. "
                          "Revisa que no se haya copiado con espacios de más.",
    "SignatureDoesNotMatch": "El Secret Access Key no corresponde al Access Key ID.",
}


def comprobar() -> str | None:
    """Verifica que el almacén responda, haciendo exactamente lo que hace la
    aplicación: escribir, leer y borrar un objeto.

    No usa head_bucket a propósito. Esa es una operación de bucket, y un token
    de R2 restringido a «Object Read & Write» sobre un bucket puede rechazarla
    aunque los permisos para trabajar sean correctos: daría un fallo donde no lo
    hay.
    """
    if not _en_s3():
        ruta = Path(current_app.config["RUTA_ARCHIVOS"])
        try:
            ruta.mkdir(parents=True, exist_ok=True)
            prueba = ruta / ".escritura"
            prueba.write_text("ok")
            prueba.unlink()
            return None
        except Exception as e:
            return f"No se puede escribir en {ruta}: {e}"

    try:
        cliente, bucket = _s3()
    except ErrorDominio as e:
        return str(e)

    _, aviso = _normalizar_endpoint(current_app.config["S3_ENDPOINT"])

    clave = "salud/.comprobacion"
    try:
        cliente.put_object(Bucket=bucket, Key=clave, Body=b"ok",
                           ContentType="text/plain")
        cliente.get_object(Bucket=bucket, Key=clave)
        cliente.delete_object(Bucket=bucket, Key=clave)
        return aviso  # None si todo está bien; el aviso si el endpoint trae de más
    except Exception as e:
        return _explicar_s3(e, bucket)


def _explicar_s3(error, bucket) -> str:
    """Un «ClientError» a secas no le dice a nadie si el problema es la clave,
    el nombre del bucket o el endpoint."""
    respuesta = getattr(error, "response", None) or {}
    codigo = str(respuesta.get("Error", {}).get("Code", "")) or ""
    estado = str(respuesta.get("ResponseMetadata", {}).get("HTTPStatusCode", "")) or ""
    endpoint = current_app.config.get("S3_ENDPOINT") or "(sin endpoint)"

    pista = PISTAS.get(codigo) or PISTAS.get(estado) or (
        "Revisa que S3_ENDPOINT sea el de la cuenta "
        "(https://<id-de-cuenta>.r2.cloudflarestorage.com), no la URL pública "
        "del bucket, y que S3_REGION sea «auto»."
    )
    detalle = f"{type(error).__name__}"
    if codigo:
        detalle += f" {codigo}"
    if estado:
        detalle += f" (HTTP {estado})"

    return f"bucket «{bucket}» en {endpoint} → {detalle}. {pista}"
