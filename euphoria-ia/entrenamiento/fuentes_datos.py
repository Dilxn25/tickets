# -*- coding: utf-8 -*-
"""
fuentes_datos.py - Abstraccion de la ORIGEN de datos.

CLAVE DEL DISENO: entrenar con la BD vieja HOY y con la nueva MANANA sin tocar el resto
del codigo. Solo cambias 'fuente' en config.json. Ambas funciones devuelven el MISMO
formato canonico:
    df_canastas: DataFrame[venta_id, producto_id, fecha_hora]
    meta:        dict con nombre/cat/costo/precio/precio_promo/minimo/stock por producto
"""
import re
import io
import pandas as pd


# ---------------------------------------------------------------- util
def _split_sql(s):
    out, cur, q, i = [], "", False, 0
    while i < len(s):
        ch = s[i]
        if ch == "'":
            if q and i + 1 < len(s) and s[i + 1] == "'":
                cur += "'"; i += 2; continue
            q = not q; cur += ch
        elif ch == "," and not q:
            out.append(cur.strip()); cur = ""
        else:
            cur += ch
        i += 1
    out.append(cur.strip())
    return out


def _u(x):
    x = x.strip()
    if x == "NULL":
        return None
    if x.startswith("'") and x.endswith("'"):
        return x[1:-1]
    return x


# ---------------------------------------------------------------- FUENTE 1: BD vieja (dump PostgreSQL)
def desde_dump_postgres(ruta_dump):
    pv = re.compile(r"^INSERT INTO public\.ventas \([^)]*\) VALUES \((.*)\);\s*$")
    pd_ = re.compile(r"^INSERT INTO public\.ventas_detalles \([^)]*\) VALUES \((.*)\);\s*$")
    pp = re.compile(r"^INSERT INTO public\.productos \([^)]*\) VALUES \((.*)\);\s*$")
    fechas, filas = {}, []
    meta = {"nombre": {}, "cat": {}, "costo": {}, "precio": {}, "precio_promo": {}, "minimo": {}, "stock": {}}
    # el dump PostgreSQL viene en Latin-1 (acentos: Caña, Tónica, Clásica)
    with io.open(ruta_dump, encoding="latin-1") as f:
        for ln in f:
            m = pp.match(ln)
            if m:
                v = _split_sql(m.group(1))
                pid = int(v[0])
                meta["nombre"][pid] = _u(v[4]); meta["cat"][pid] = int(v[5])
                meta["costo"][pid] = float(v[6]); meta["precio"][pid] = float(v[7])
                meta["precio_promo"][pid] = None if v[8] == "NULL" else float(v[8])
                meta["minimo"][pid] = int(v[10]); meta["stock"][pid] = int(v[11])
                continue
            m = pv.match(ln)
            if m:
                v = _split_sql(m.group(1)); fechas[int(v[0])] = _u(v[8]); continue
            m = pd_.match(ln)
            if m:
                v = _split_sql(m.group(1)); filas.append((int(v[1]), int(v[2])))
    # La BD vieja (POS) no registraba al cliente: cliente_id = None para todo.
    df = pd.DataFrame([(vid, pid, fechas.get(vid), None) for vid, pid in filas],
                      columns=["venta_id", "producto_id", "fecha_hora", "cliente_id"])
    df["fecha_hora"] = pd.to_datetime(df["fecha_hora"])
    return df, meta


# ---------------------------------------------------------------- FUENTE 2: BD nueva (MySQL / Prisma)
def desde_mysql_prisma(database_url):
    """Lee comanda + detalle_comanda + producto del schema nuevo.
    Requiere: pip install sqlalchemy pymysql. database_url ejemplo:
        mysql+pymysql://usuario:clave@host:3306/nombre_bd
    """
    from sqlalchemy import create_engine, text
    eng = create_engine(database_url)
    q_canastas = text("""
        SELECT c.id_comanda AS venta_id, d.id_producto AS producto_id,
               c.fecha_registro AS fecha_hora, c.id_cliente AS cliente_id
        FROM detalle_comanda d
        JOIN comanda c ON c.id_comanda = d.id_comanda
    """)
    q_prod = text("""
        SELECT id_producto, nombre_producto, id_categoria, precio_base,
               precio_promocion, stock_actual
        FROM producto
    """)
    with eng.connect() as con:
        df = pd.read_sql(q_canastas, con)
        pr = pd.read_sql(q_prod, con)
    df["fecha_hora"] = pd.to_datetime(df["fecha_hora"])
    meta = {"nombre": {}, "cat": {}, "costo": {}, "precio": {}, "precio_promo": {}, "minimo": {}, "stock": {}}
    for _, r in pr.iterrows():
        pid = int(r["id_producto"])
        meta["nombre"][pid] = r["nombre_producto"]
        meta["cat"][pid] = int(r["id_categoria"])
        # el schema nuevo aun no trae 'costo' -> la regla de margen se degrada con gracia
        meta["costo"][pid] = None
        meta["precio"][pid] = float(r["precio_base"])
        meta["precio_promo"][pid] = None if pd.isna(r["precio_promocion"]) else float(r["precio_promocion"])
        meta["minimo"][pid] = 0
        meta["stock"][pid] = int(r["stock_actual"]) if not pd.isna(r["stock_actual"]) else 0
    return df, meta


# ---------------------------------------------------------------- selector
def cargar(config):
    fuente = config.get("fuente", "postgres_dump")
    if fuente == "postgres_dump":
        return desde_dump_postgres(config["ruta_dump"])
    if fuente == "mysql_prisma":
        return desde_mysql_prisma(config["database_url"])
    raise ValueError("fuente desconocida: %s (usa 'postgres_dump' o 'mysql_prisma')" % fuente)
