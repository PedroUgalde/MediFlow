import os
from contextlib import contextmanager
from typing import Any, Generator

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "prueba2Hack")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "BD27-mVp+")
DB_MIN_CONN = int(os.getenv("DB_MIN_CONN", "1"))
DB_MAX_CONN = int(os.getenv("DB_MAX_CONN", "5"))
print(DB_HOST)
print(DB_PORT)
print(DB_NAME)
print(DB_USER)
print(DB_PASSWORD)

_connection_pool = SimpleConnectionPool(
    minconn=DB_MIN_CONN,
    maxconn=DB_MAX_CONN,
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
)


@contextmanager
def get_db_connection() -> Generator[Any, None, None]:
    """Entrega una conexion del pool y la regresa al terminar."""
    connection = _connection_pool.getconn()
    try:
        yield connection
    finally:
        _connection_pool.putconn(connection)


def execute_select(query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    """Ejecuta un SELECT y devuelve filas como lista de diccionarios."""
    with get_db_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]


def execute_modify(query: str, params: tuple[Any, ...] | None = None) -> int:
    """Ejecuta INSERT/UPDATE/DELETE y regresa el numero de filas afectadas."""
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            affected_rows = cursor.rowcount
        connection.commit()
        return affected_rows
def execute_insert(query: str, params: tuple[Any, ...] | None = None) -> int:
    """Ejecuta un INSERT y devuelve el ID generado (si aplica)."""
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            connection.commit()
            if cursor.description:  # Si el INSERT tiene RETURNING
                return cursor.fetchone()[0]
            return -1  # Indica que no se generó un ID




def close_pool() -> None:
    """Cierra todas las conexiones del pool."""
    _connection_pool.closeall()
