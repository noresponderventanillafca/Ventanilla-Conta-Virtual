"""Datos iniciales para desarrollo.

    python -m scripts.seed               # crea las tablas que falten y siembra
    python -m scripts.seed --reiniciar   # BORRA todo y vuelve a empezar

Mientras el esquema siga cambiando, `--reiniciar` es la forma correcta de
aplicar esos cambios: todavía no hay migraciones y no hay datos que perder.
En cuanto el esquema se congele, se genera la primera migración con Alembic y
este script deja de tocar la estructura.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import crear_app
from app.extensions import db
from app.models import (
    Programa, Usuario, Rol, PadronAlumno, TipoDocumento, MomentoPago,
    CuentaInstitucional,
)

REINICIAR = "--reiniciar" in sys.argv

app = crear_app()

with app.app_context():
    uri = app.config["SQLALCHEMY_DATABASE_URI"] or ""
    destino = uri.rsplit("@", 1)[-1] or uri  # sin credenciales

    if REINICIAR:
        print(f"Se van a BORRAR todas las tablas de: {destino}")
        if input("Escribe BORRAR para confirmar: ").strip() != "BORRAR":
            print("Cancelado. No se tocó nada.")
            raise SystemExit(1)
        db.drop_all()
        print("Tablas eliminadas.")

    db.create_all()

    if Programa.query.first():
        print("La base ya tiene datos. Usa --reiniciar si quieres rehacerla.")
        raise SystemExit

    programa = Programa(clave="CV", nombre="Contaduría — Modalidad Virtual")
    db.session.add(programa)
    db.session.flush()

    # La clave es lo que el alumno escribe en el concepto junto a su matrícula.
    # Debe ser corta, estable y fácil de recordar: la van a teclear en el banco.
    documentos = [
        ("CONST", "Constancia de estudios", 180, MomentoPago.AL_SOLICITAR,
         "Acredita que estás inscrito en el programa durante el periodo vigente.",
         "Estar inscrito en el periodo actual."),
        ("CONSTCAL", "Constancia con calificaciones", 180, MomentoPago.AL_SOLICITAR,
         "Constancia de inscripción que incluye las calificaciones obtenidas.",
         "Tener calificaciones registradas en el periodo que solicitas."),
        ("HIST", "Historial académico", 220, MomentoPago.AL_SOLICITAR,
         "Documento oficial con todas las experiencias educativas cursadas y sus calificaciones.",
         "Ninguno."),
        ("KARDEX", "Kardex informativo", 0, MomentoPago.SIN_COSTO,
         "Reporte informativo de avance. No tiene validez oficial ante terceros.",
         "Ninguno."),
        ("VIGENCIA", "Constancia de vigencia de derechos", 0, MomentoPago.SIN_COSTO,
         "Acredita que tus derechos como estudiante están vigentes.",
         "Estar inscrito en el periodo actual."),
        ("TITUL", "Trámite de titulación", 1450, MomentoPago.TRAS_LINEA_DE_CAPTURA,
         "Inicio del proceso de titulación. Secretaría emite una línea de captura.",
         "Haber cubierto el 100% de créditos y el servicio social."),
    ]
    for clave, nombre, costo, momento, descripcion, requisitos in documentos:
        db.session.add(TipoDocumento(
            programa_id=programa.id, clave=clave, nombre=nombre,
            costo=costo, momento_pago=momento,
            descripcion=descripcion, requisitos=requisitos,
        ))

    # Datos de ejemplo: la Coordinación los reemplaza desde Ajustes.
    db.session.add(CuentaInstitucional(
        programa_id=programa.id,
        banco="Banco institucional", titular="Universidad Veracruzana",
        cuenta="0000 0000 0000", clabe="000000000000000000",
    ))

    # Cada persona con su propia cuenta, nunca una cuenta por rol. Así la
    # bitácora dice quién hizo cada cosa, y relevar un cargo es dar de baja a
    # alguien y dar de alta a otro, no heredar un acceso.
    # El identificador del personal es de puras letras: los alumnos entran con
    # matrícula, que lleva dígitos, así que no pueden colisionar.
    personal = [
        ("RAMIREZLM", "Laura Martínez Ramírez", Rol.COORDINADORA),
        ("HERNANDEZJC", "Juan Carlos Hernández", Rol.SECRETARIA),
        ("MENDOZAAP", "Ana Paula Mendoza", Rol.SECRETARIA),
        ("CASTROER", "Eduardo Ramos Castro", Rol.ADMINISTRADOR),
        ("VELAZQUEZSM", "Sofía Velázquez Mora", Rol.ADMINISTRADOR),
        ("TORRESDG", "Diego Torres García", Rol.ADMINISTRADOR),
    ]
    for identificador, nombre, rol in personal:
        u = Usuario(
            identificador=identificador, nombre=nombre,
            correo=f"{identificador.lower()}@uv.mx", rol=rol, programa_id=programa.id,
        )
        u.definir_password("cambiar-esta-clave", temporal=True)
        u.notificaciones_todas = (rol == Rol.COORDINADORA)
        db.session.add(u)

    db.session.add(PadronAlumno(
        matricula="S23012345", curp_prefijo="RUMA030214",
        nombre="Ana Ruiz Márquez",
        correo_institucional="zs23012345@estudiantes.uv.mx",
        programa_id=programa.id,
    ))

    db.session.commit()
    print("Listo.")
    print("  Personal (contraseña temporal 'cambiar-esta-clave'):")
    for identificador, nombre, rol in personal:
        print(f"    {identificador:<14} {nombre} — {rol.value}")
    print("  El sistema les exigirá cambiarla al entrar.")
    print("  Alumna:   matrícula S23012345, CURP RUMA030214")
