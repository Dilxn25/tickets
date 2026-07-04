# -*- coding: utf-8 -*-
"""
api.py - Servicio web FastAPI. Expone el recomendador por HTTP devolviendo JSON.

LEVANTAR:
    uvicorn api:app --reload --port 8000

PROBAR (navegador): http://localhost:8000/docs
PROBAR (curl):
    curl -X POST http://localhost:8000/recomendar ^
      -H "Content-Type: application/json" ^
      -d "{\"productos_en_mesa\":[6],\"fecha_hora\":\"2025-11-08 23:30:00\",\"k\":3}"
"""
from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel

from recomendador import Recomendador

app = FastAPI(title="Recomendador Euphoria", version="1.0")
rec = Recomendador()   # carga el artefacto una sola vez al arrancar


class Peticion(BaseModel):
    productos_en_mesa: List[int] = []
    fecha_hora: str
    k: int = 3
    stock: Optional[dict] = None   # opcional: {"9": 0} para marcar agotados en vivo


@app.get("/salud")
def salud():
    return {"estado": "ok", "modelo": rec.info}


@app.post("/recomendar")
def recomendar(p: Peticion):
    stock = None
    if p.stock:
        stock = {int(k): int(v) for k, v in p.stock.items()}
    return rec.recomendar(p.productos_en_mesa, p.fecha_hora, k=p.k, stock=stock)


# ---------------------------------------------------------------------------
# COMBOS y PACKS en vivo: el MODULO DE IA consulta la BD y arma las ofertas.
# El backend Node solo reenvia estos resultados (con respaldo local si este
# servicio esta apagado). tam admite 2 a 4; HAVING exige un minimo de
# repeticiones para no proponer combos sin evidencia estadistica.
# ---------------------------------------------------------------------------
import json as _json
from sqlalchemy import create_engine, text as _text

with open("config.json", encoding="utf-8") as _f:
    _CFG = _json.load(_f)
_ENG = create_engine(_CFG["database_url"], pool_pre_ping=True)


def _precio_atractivo(p: float) -> float:
    entero = int(p)
    dec = p - entero
    mejor, dmin = 0.0, 9e9
    for o in (0.0, 0.4, 0.5, 0.6, 0.9):
        d = abs(dec - o)
        if d < dmin:
            dmin, mejor = d, o
    return round(entero + mejor, 2)


@app.get("/combos")
def combos(tam: int = 2, descuento: float = 0.10, minimo: int = 5):
    tam = 2 if tam < 2 else (4 if tam > 4 else int(tam))
    sel, joins, grp = [], [], []
    for i in range(1, tam + 1):
        sel.append(f"p{i}.id_producto id{i}, p{i}.nombre_producto n{i}, p{i}.precio_base pr{i}, p{i}.url_imagen img{i}")
        grp.append(f"id{i}, n{i}, pr{i}, img{i}")
        if i > 1:
            joins.append(f"JOIN detalle_comanda d{i} ON d1.id_comanda=d{i}.id_comanda AND d{i-1}.id_producto<d{i}.id_producto")
    q = f"""
      SELECT {', '.join(sel)}, COUNT(*) veces
      FROM detalle_comanda d1
      {' '.join(joins)}
      JOIN comanda c ON c.id_comanda=d1.id_comanda AND c.estado_despacho<>'Cancelada'
      {' '.join(f'JOIN producto p{i} ON p{i}.id_producto=d{i}.id_producto' for i in range(1, tam + 1))}
      GROUP BY {', '.join(grp)}
      HAVING veces >= :minimo
      ORDER BY veces DESC LIMIT 6"""
    with _ENG.connect() as cx:
        filas = [dict(r._mapping) for r in cx.execute(_text(q), {"minimo": minimo})]
        tot = {}
        anclas = list({int(f["id1"]) for f in filas})
        if anclas:
            ids = ",".join(str(a) for a in anclas)
            for r in cx.execute(_text(f"SELECT id_producto, COUNT(DISTINCT id_comanda) t FROM detalle_comanda WHERE id_producto IN ({ids}) GROUP BY id_producto")):
                m = r._mapping
                tot[int(m["id_producto"])] = int(m["t"])
    out = []
    for f in filas:
        prods = [{"id_producto": int(f[f"id{i}"]), "nombre": f[f"n{i}"], "url_imagen": f[f"img{i}"]} for i in range(1, tam + 1)]
        normal = sum(float(f[f"pr{i}"]) for i in range(1, tam + 1))
        c = {
            "productos": prods,
            "nombre": " + ".join(p["nombre"] for p in prods),
            "precio_normal": round(normal, 2),
            "precio_combo": _precio_atractivo(normal * (1 - descuento)),
            "descuento_pct": round(descuento * 100, 1),
            "veces": int(f["veces"]),
        }
        t = tot.get(int(f["id1"]), 0)
        if t:
            c["razon"] = f"{round(c['veces'] / t * 100)}% de las {t} mesas que piden {f['n1']} llevan también el resto"
        out.append(c)
    return {"combos": out, "origen": "modelo-ia"}


@app.get("/packs")
def packs(descuento: float = 0.10):
    q = """SELECT p.id_producto, p.nombre_producto nombre, p.precio_base precio, p.url_imagen,
             cat.nombre_categoria categoria, COALESCE(SUM(d.cantidad),0) vendidos
           FROM producto p
           JOIN categoria cat ON cat.id_categoria=p.id_categoria
           LEFT JOIN detalle_comanda d ON d.id_producto=p.id_producto
           LEFT JOIN comanda c ON c.id_comanda=d.id_comanda AND c.estado_despacho<>'Cancelada'
           WHERE p.stock_actual>0
           GROUP BY p.id_producto, nombre, precio, p.url_imagen, categoria
           ORDER BY vendidos DESC"""
    with _ENG.connect() as cx:
        filas = [dict(r._mapping) for r in cx.execute(_text(q))]

    def es(f, *claves):
        c = (f["categoria"] or "").lower()
        return any(k in c for k in claves)

    licores = [f for f in filas if es(f, "ron", "whisky", "vodka", "singani", "licor")]
    mezc = [f for f in filas if es(f, "sin alcohol", "bebida", "gaseosa", "energ")]
    snacks = [f for f in filas if es(f, "snack")]
    cerv = [f for f in filas if es(f, "cerveza")]
    g = lambda lst, i: lst[i] if len(lst) > i else None

    def armar(nombre, desc_txt, items, regla=""):
        items = [(f, c) for f, c in items if f]
        if len(items) < 2:
            return None
        normal = sum(float(f["precio"]) * c for f, c in items)
        return {
            "nombre": nombre, "descripcion": desc_txt, "razon": regla,
            "items": [{"id_producto": int(f["id_producto"]), "nombre": f["nombre"], "cantidad": c, "url_imagen": f["url_imagen"]} for f, c in items],
            "precio_normal": round(normal, 2),
            "precio_pack": _precio_atractivo(normal * (1 - descuento)),
            "descuento_pct": round(descuento * 100, 1),
        }

    out = [x for x in [
        armar("Pack Fiesta", "Para una mesa completa: 2 botellas con sus mezcladores y algo para picar",
              [(g(licores, 0), 2), (g(mezc, 0), 3), (g(snacks, 0), 1)],
              "Regla del modulo: licor N.1 en ventas + mezclador N.1 + snack N.1 (solo con stock)"),
        armar("Pack Premium", "Segunda botella mas vendida para mesas exigentes",
              [(g(licores, 1), 1), (g(mezc, 1) or g(mezc, 0), 2), (g(snacks, 1) or g(snacks, 0), 1)],
              "Regla del modulo: licor N.2 en ventas (para variar la oferta) + mezclador y snack top"),
        armar("Pack Amigos", "Balde para compartir: 10 cervezas y snacks dobles",
              [(g(cerv, 0), 10), (g(snacks, 0), 2)],
              "Regla del modulo: la cerveza N.1 en ventas x10 (balde) + snack N.1 x2"),
    ] if x]
    return {"packs": out, "origen": "modelo-ia"}
