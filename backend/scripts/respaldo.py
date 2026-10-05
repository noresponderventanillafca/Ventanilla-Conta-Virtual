"""Respaldo de la base de datos al mismo almacén donde viven los archivos.

    python -m scripts.respaldo

Los planes gratuitos pueden desaparecer, caducar o apagarse por inactividad.
Aiven incluye respaldos propios, pero son suyos: si la cuenta se pierde, se
pierden con ella. Esto deja una copia en Cloudflare R2, que es otro proveedor.

Súbelo a un programador gratuito (cron-job.org) o córrelo a mano cada semana.
Un respaldo que nunca se restauró no es un respaldo: prueba la restauración
al menos una vez.
"""
import gzip
import io
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import crear_app
from app import almacenamiento as A

COPIAS_A_CONSERVAR = 8


def volcar(uri: str) -> bytes:
    partes = urlparse(uri.replace("mysql+pymysql://", "mysql://"))
    if partes.scheme != "mysql":
        raise SystemExit(f"Solo se respalda MySQL; la base es {partes.scheme}.")

    comando = [
        "mysqldump",
        f"--host={partes.hostname}",
        f"--port={partes.port or 3306}",
        f"--user={partes.username}",
        f"--password={partes.password}",
        "--single-transaction", "--routines", "--default-character-set=utf8mb4",
        (partes.path or "/").lstrip("/").split("?")[0],
    ]
    proceso = subprocess.run(comando, capture_output=True)
    if proceso.returncode != 0:
        raise SystemExit("mysqldump falló:\n" + proceso.stderr.decode(errors="replace")[:600])
    return proceso.stdout


def main():
    app = crear_app()
    with app.app_context():
        if app.config.get("ALMACENAMIENTO") != "s3":
            raise SystemExit(
                "El respaldo se guarda en el almacén de objetos. Configura "
                "ALMACENAMIENTO=s3 y las variables S3_*."
            )

        print("Generando el volcado…")
        datos = gzip.compress(volcar(app.config["SQLALCHEMY_DATABASE_URI"]))
        sello = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M")
        clave = f"respaldos/ventanilla-{sello}.sql.gz"

        cliente, bucket = A._s3()
        cliente.put_object(Bucket=bucket, Key=clave, Body=datos,
                           ContentType="application/gzip")
        print(f"Guardado {clave} ({len(datos) / 1024:.0f} KB)")

        # Conservar solo las copias recientes: el espacio gratuito es limitado
        # y un respaldo de hace un año rara vez sirve para restaurar.
        listado = cliente.list_objects_v2(Bucket=bucket, Prefix="respaldos/")
        copias = sorted((o["Key"] for o in listado.get("Contents", [])), reverse=True)
        for vieja in copias[COPIAS_A_CONSERVAR:]:
            cliente.delete_object(Bucket=bucket, Key=vieja)
            print(f"  eliminada la copia antigua {vieja}")

        print(f"Listo. Se conservan {min(len(copias), COPIAS_A_CONSERVAR)} copias.")


if __name__ == "__main__":
    main()
