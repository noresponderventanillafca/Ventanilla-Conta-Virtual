from datetime import datetime, timezone

# MySQL necesita esto explícito: InnoDB para llaves foráneas y transacciones,
# utf8mb4 para que la ñ y los acentos no se corrompan.
ARGS_MYSQL = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def ahora():
    return datetime.now(timezone.utc)
