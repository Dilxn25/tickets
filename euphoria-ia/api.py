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
import os
import json
from typing import List, Optional, Union
from fastapi import FastAPI
from pydantic import BaseModel

from recomendador import Recomendador

app = FastAPI(title="Recomendador Euphoria", version="1.0")
rec = Recomendador()   # carga el artefacto una sola vez al arrancar

# ---- Modelos disponibles y conmutacion real/demo (para la DEMOSTRACION) ----
# 'real' = modelo de produccion (sin cliente). 'demo' = modelo PERSONALIZADO
# entrenado con consumo por cliente (solo existe en local; en produccion no se
# despliega). El boton del panel de IA conmuta entre ambos.
ARTEFACTOS = {"real": "artefacto_modelo.pkl", "demo": "artefacto_modelo_demo.pkl"}
_modo_actual = "real"

# ---- Versiones entrenadas -------------------------------------------------
# Cada reentrenamiento deja un archivo fechado en modelos/ (modelo-AAAA-MM-DD-hhmm.pkl)
# junto a su ficha .json. El anterior NO se borra: el administrador puede volver
# a el si el nuevo no le convence.
DIR_MODELOS = os.path.join(os.path.dirname(__file__), "modelos")
_version_actual = None   # nombre de archivo dentro de modelos/, o None si es el de base


def _ruta_version(archivo: str) -> str:
    """Ruta segura dentro de modelos/ (evita salirse de la carpeta)."""
    limpio = os.path.basename(str(archivo or ""))
    return os.path.join(DIR_MODELOS, limpio)


def _ficha(archivo: str) -> dict:
    """Datos del entrenamiento que acompanan al .pkl (fecha, canastas, AUC)."""
    ruta = _ruta_version(archivo)
    meta = os.path.splitext(ruta)[0] + ".json"
    datos = {}
    if os.path.exists(meta):
        try:
            with open(meta, encoding="utf-8") as f:
                datos = json.load(f)
        except Exception:
            datos = {}
    datos["archivo"] = os.path.basename(ruta)
    datos["tamano_kb"] = round(os.path.getsize(ruta) / 1024) if os.path.exists(ruta) else 0
    return datos


def listar_versiones() -> list:
    """Modelos entrenados disponibles, del mas nuevo al mas viejo."""
    if not os.path.isdir(DIR_MODELOS):
        return []
    archivos = [a for a in os.listdir(DIR_MODELOS) if a.endswith(".pkl")]
    archivos.sort(reverse=True)   # el nombre empieza por fecha: ordena solo
    return [_ficha(a) for a in archivos]


def _existe(modo: str) -> bool:
    ruta = ARTEFACTOS.get(modo)
    return bool(ruta) and os.path.exists(os.path.join(os.path.dirname(__file__), ruta))


def _cargar_modelo(modo: str) -> bool:
    global rec, _modo_actual, _version_actual
    if not _existe(modo):
        return False
    rec = Recomendador(ruta_artefacto=ARTEFACTOS[modo])
    _modo_actual = modo
    _version_actual = None
    return True


def cargar_version(archivo: str) -> bool:
    """Activa una version entrenada concreta (cambio en caliente, sin reiniciar)."""
    global rec, _modo_actual, _version_actual
    ruta = _ruta_version(archivo)
    if not os.path.exists(ruta):
        return False
    rec = Recomendador(ruta_artefacto=os.path.join("modelos", os.path.basename(ruta)))
    _modo_actual = "real"
    _version_actual = os.path.basename(ruta)
    return True


def _autocargar_ultima():
    """Al arrancar, si hay versiones entrenadas se usa la mas reciente.
    Asi el modelo nuevo entra solo despues de un reentrenamiento."""
    vs = listar_versiones()
    if vs:
        cargar_version(vs[0]["archivo"])


_autocargar_ultima()


class Peticion(BaseModel):
    productos_en_mesa: List[int] = []
    fecha_hora: str
    k: int = 3
    stock: Optional[dict] = None   # opcional: {"9": 0} para marcar agotados en vivo
    historial_cliente: Optional[List[int]] = None  # ids que ESE cliente ya consumio (personalizacion)
    # Clave de un CLIENTE DEMO embebido en el pkl (su historial sale del pkl). Se acepta
    # también un número: antes llegaba el id del cliente real como entero, Pydantic lo
    # rechazaba (422) y el mesero se quedaba sin sugerencias justo al elegir al cliente.
    cliente: Optional[Union[str, int]] = None


class ModeloReq(BaseModel):
    modo: str


@app.get("/salud")
def salud():
    return {"estado": "ok", "modelo": rec.info, "modo": _modo_actual}


@app.post("/recomendar")
def recomendar(p: Peticion):
    stock = None
    if p.stock:
        stock = {int(k): int(v) for k, v in p.stock.items()}
    # Historial del cliente: si viene la CLAVE de un cliente demo, su historial sale
    # del pkl (self-contained, sin base). Si no, se usa el historial que mande el
    # backend (clientes reales, tomado de la base en producción).
    historial = p.historial_cliente
    clave = str(p.cliente) if p.cliente is not None else None
    if clave and clave in rec.clientes_demo:
        historial = rec.clientes_demo[clave]["historial"]
    return rec.recomendar(p.productos_en_mesa, p.fecha_hora, k=p.k, stock=stock,
                          historial_cliente=historial)


@app.get("/clientes")
def clientes():
    """Clientes DEMO embebidos en el pkl activo (self-contained). Vacío si el modelo
    activo no es el de demostración."""
    return [{"id": k, "nombre": v.get("nombre", k), "n": len(v.get("historial", []))}
            for k, v in rec.clientes_demo.items()]


@app.get("/modelo/estado")
def modelo_estado():
    return {"modo": _modo_actual, "personalizado": rec.personalizado,
            "disponibles": [m for m in ARTEFACTOS if _existe(m)],
            "version_activa": _version_actual,
            "versiones": listar_versiones()}


@app.get("/modelo/versiones")
def modelo_versiones():
    """Historial de modelos entrenados, del mas nuevo al mas viejo."""
    return {"activa": _version_actual, "versiones": listar_versiones()}


class VersionReq(BaseModel):
    archivo: str


@app.post("/modelo/version")
def modelo_version(r: VersionReq):
    """Vuelve a una version anterior (o adelanta a otra) sin reiniciar el servicio."""
    if cargar_version(r.archivo):
        return {"ok": True, "activa": _version_actual, "info": rec.info}
    return {"ok": False, "error": "No existe esa version"}


@app.post("/modelo/activar")
def modelo_activar(r: ModeloReq):
    if _cargar_modelo(r.modo):
        return {"ok": True, "modo": _modo_actual, "personalizado": rec.personalizado}
    return {"ok": False, "error": f"Modelo '{r.modo}' no disponible en este entorno"}


# ---------------------------------------------------------------------------
# COMBOS y PACKS en vivo: el MODULO DE IA consulta la BD y arma las ofertas.
# El backend Node solo reenvia estos resultados (con respaldo local si este
# servicio esta apagado). tam admite 2 a 4; HAVING exige un minimo de
# repeticiones para no proponer combos sin evidencia estadistica.
# ---------------------------------------------------------------------------
import json as _json
from sqlalchemy import create_engine, text as _text

import os as _os
import ssl as _ssl
with open("config.json", encoding="utf-8") as _f:
    _CFG = _json.load(_f)
# En produccion (Render + Aiven) la URL de la BD llega por variable de entorno;
# en local se usa la de config.json.
_DB_URL = _os.environ.get("DATABASE_URL_IA") or _CFG["database_url"]
# Aiven exige TLS: si IA_DB_SSL esta activo, conectamos por SSL.
_connect_args = {}
if _os.environ.get("IA_DB_SSL", "").lower() in ("1", "true", "yes"):
    _ctx = _ssl.create_default_context()
    _ctx.check_hostname = False
    _ctx.verify_mode = _ssl.CERT_NONE
    _connect_args = {"ssl": _ctx}
_ENG = create_engine(_DB_URL, pool_pre_ping=True, connect_args=_connect_args)


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
def packs(descuento: float = 0.10, min_repeticiones: int = 3):
    """Packs 100% DINAMICOS: se aprenden de las MESAS GRANDES reales del historial.
    1) Cada comanda se resume como su composicion por categoria (ej. 6x Cerveza + 2x Snack).
    2) Se toman las comandas grandes (top de consumo) y se buscan las composiciones
       que MAS SE REPITEN (patrones reales, no recetas escritas a mano).
    3) Cada patron se instancia con el producto mas vendido de cada categoria (con stock).
    Un pack que ninguna mesa pidio nunca, NO puede aparecer."""
    q_comp = """SELECT d.id_comanda, cat.nombre_categoria categoria, SUM(d.cantidad) cant
                FROM detalle_comanda d
                JOIN comanda c ON c.id_comanda=d.id_comanda AND c.estado_despacho<>'Cancelada'
                JOIN producto p ON p.id_producto=d.id_producto
                JOIN categoria cat ON cat.id_categoria=p.id_categoria
                GROUP BY d.id_comanda, categoria"""
    q_top = """SELECT p.id_producto, p.nombre_producto nombre, p.precio_base precio, p.url_imagen,
                 cat.nombre_categoria categoria, COALESCE(SUM(d.cantidad),0) vendidos
               FROM producto p
               JOIN categoria cat ON cat.id_categoria=p.id_categoria
               LEFT JOIN detalle_comanda d ON d.id_producto=p.id_producto
               LEFT JOIN comanda c ON c.id_comanda=d.id_comanda AND c.estado_despacho<>'Cancelada'
               WHERE p.stock_actual>0 AND p.es_combo=0
               GROUP BY p.id_producto, nombre, precio, p.url_imagen, categoria
               ORDER BY vendidos DESC"""
    with _ENG.connect() as cx:
        comp_filas = [dict(r._mapping) for r in cx.execute(_text(q_comp))]
        top_filas = [dict(r._mapping) for r in cx.execute(_text(q_top))]

    # Producto N.1 por categoria (dinamico: cambia solo con las ventas y el stock)
    top_por_cat = {}
    for f in top_filas:
        top_por_cat.setdefault(f["categoria"], f)

    # Composicion por comanda: {categoria: cantidad}
    comandas = {}
    for f in comp_filas:
        comandas.setdefault(f["id_comanda"], {})[f["categoria"]] = int(f["cant"])
    if not comandas:
        return {"packs": [], "origen": "modelo-ia"}

    # Umbral de "mesa grande": percentil 80 del total de items (minimo 5)
    totales = sorted(sum(c.values()) for c in comandas.values())
    umbral = max(5, totales[int(len(totales) * 0.80)])

    # Contar los patrones de composicion que mas se repiten entre las mesas grandes
    patrones = {}
    for comp in comandas.values():
        if sum(comp.values()) < umbral:
            continue
        firma = tuple(sorted(comp.items()))
        patrones[firma] = patrones.get(firma, 0) + 1

    candidatos = sorted(patrones.items(), key=lambda kv: -kv[1])
    out = []
    for firma, veces in candidatos:
        if len(out) >= 3:
            break
        if veces < min_repeticiones:
            continue
        # Instanciar el patron con el N.1 actual (con stock) de cada categoria
        items = []
        for categoria, cant in firma:
            prod = top_por_cat.get(categoria)
            if prod:
                items.append((prod, int(cant)))
        if len(items) < 2 or len(items) < len(firma):
            continue  # falta stock en alguna categoria: el patron no se ofrece incompleto
        normal = sum(float(f["precio"]) * c for f, c in items)
        etiqueta = " + ".join(f"{c}× {cat}" for (f, c), (cat, _) in zip(items, firma))
        # El pack se nombra por su producto ANCLA: la categoría del item más caro (el licor/botella)
        ancla = max(zip(items, firma), key=lambda x: float(x[0][0]["precio"]))[1][0]
        nombre = f"Pack {ancla} para mesa"
        usados = {p["nombre"] for p in out}
        if nombre in usados:
            nombre = f"Pack {dominante} ({etiqueta})"
        out.append({
            "nombre": nombre,
            "descripcion": f"Como lo piden las mesas grandes: {etiqueta}",
            "razon": f"Patrón real del historial: {veces} mesas grandes pidieron exactamente esta combinación "
                     f"(se arma con el más vendido de cada categoría, solo con stock)",
            "veces": int(veces),
            "items": [{"id_producto": int(f["id_producto"]), "nombre": f["nombre"], "cantidad": c,
                       "url_imagen": f["url_imagen"]} for f, c in items],
            "precio_normal": round(normal, 2),
            "precio_pack": _precio_atractivo(normal * (1 - descuento)),
            "descuento_pct": round(descuento * 100, 1),
        })
    return {"packs": out, "origen": "modelo-ia"}
