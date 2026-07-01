# -*- coding: utf-8 -*-
"""
reglas.py - Capa de negocio POST-prediccion (Paso 8).
Re-rankea el score puro del modelo. Configurable via reglas.json.
    score_final = score_modelo x stock x temporal x margen x promocion
"""
import pandas as pd


def disponible(c, stock, minimo, activa):
    if not activa:
        return True
    return stock.get(c, 0) > minimo.get(c, 0)


def margen(c, meta):
    costo = meta["costo"].get(c)
    precio = meta["precio"].get(c)
    if costo is None or not precio:
        return 0.0
    return (precio - costo) / precio


def _en_franja(h, hmin, hmax):
    return (hmin <= h or h < hmax) if hmin > hmax else (hmin <= h < hmax)


def boost_temporal(c, ts, meta, cfg):
    if not cfg.get("activa", True):
        return 1.0
    h = pd.Timestamp(ts).hour
    f = 1.0
    for cat, hmin, hmax, fac in cfg.get("boosts", []):
        if meta["cat"][c] == cat and _en_franja(h, hmin, hmax):
            f *= fac
    return f


def factor_margen(c, meta, cfg):
    if not cfg.get("activa", True):
        return 1.0
    return 1.0 + cfg.get("peso", 0.6) * margen(c, meta)


def boost_promo(c, meta, cfg):
    if cfg.get("activa", True) and meta["precio_promo"].get(c) is not None:
        return cfg.get("boost", 1.3)
    return 1.0


def combos_sugeridos(est, meta, min_co=200, desc=0.10):
    """Combos por co-compra frecuente: cada botella (cat 3) con su mezclador (cat 4) top."""
    co = est["co"]
    items = list(meta["cat"].keys())
    botellas = [c for c in items if meta["cat"][c] == 3]
    mezcladores = [c for c in items if meta["cat"][c] == 4]
    out = []
    for a in botellas:
        if not mezcladores:
            break
        b, cnt = max(((b, co.get(a, {}).get(b, 0)) for b in mezcladores), key=lambda x: x[1])
        if cnt >= min_co:
            out.append({
                "tipo": "combo", "id_producto": a, "combo_con": b,
                "nombre": "%s + %s" % (meta["nombre"][a], meta["nombre"][b]),
                "descuento_pct": round(desc * 100, 1),
                "motivo": "co-comprado %d veces" % cnt,
            })
    return out
