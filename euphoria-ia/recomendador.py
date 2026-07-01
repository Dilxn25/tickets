# -*- coding: utf-8 -*-
"""
recomendador.py - Carga el artefacto entrenado y devuelve recomendaciones en JSON.

USO RAPIDO (linea de comando):
    python recomendador.py --productos 6 --fecha "2025-11-08 23:30:00" --k 3

USO COMO LIBRERIA:
    from recomendador import Recomendador
    rec = Recomendador()
    print(rec.recomendar([6], "2025-11-08 23:30:00", k=3))   # -> dict listo para JSON
"""
import os
import json
import joblib
import pandas as pd

import nucleo
import reglas as R

AQUI = os.path.dirname(os.path.abspath(__file__))
CATN = {1: "Cerveza", 2: "Coctel", 3: "Botella", 4: "Mezclador", 5: "Vino"}


class Recomendador:
    def __init__(self, ruta_artefacto="artefacto_modelo.pkl", ruta_reglas="reglas.json"):
        b = joblib.load(os.path.join(AQUI, ruta_artefacto))
        self.modelo = b["modelo"]
        self.est = b["estructuras"]
        self.meta = b["meta_productos"]
        self.all_items = b["all_items"]
        self.info = b.get("info", {})
        with open(os.path.join(AQUI, ruta_reglas), encoding="utf-8") as f:
            self.reglas = json.load(f)

    def _score_modelo(self, pre, cands, ts):
        Xc = pd.DataFrame([nucleo.features(pre, c, ts, self.est, self.meta) for c in cands],
                          columns=nucleo.FC)
        return dict(zip(cands, self.modelo.predict_proba(Xc)[:, 1]))

    def recomendar(self, productos_en_mesa, fecha_hora, k=3, stock=None, incluir_promos=True):
        meta, cfg = self.meta, self.reglas
        # el stock recibido es un OVERRIDE PARCIAL sobre el inventario conocido (no lo reemplaza)
        stock_efectivo = dict(meta["stock"])
        if stock:
            stock_efectivo.update(stock)
        stock = stock_efectivo
        pset = set(productos_en_mesa)

        # 1) filtro DURO de stock
        cands = [c for c in self.all_items
                 if c not in pset and R.disponible(c, stock, meta["minimo"], cfg["stock"]["activa"])]

        recomendaciones = []
        if cands:
            crudo = self._score_modelo(productos_en_mesa, cands, fecha_hora)
            filas = []
            for c in cands:
                s = float(crudo[c])
                bt = R.boost_temporal(c, fecha_hora, meta, cfg["temporal"])
                fm = R.factor_margen(c, meta, cfg["margen"])
                bp = R.boost_promo(c, meta, cfg["promo"])
                filas.append((c, s, bt, fm, bp, s * bt * fm * bp))
            filas.sort(key=lambda x: -x[-1])
            for rank, (c, s, bt, fm, bp, sf) in enumerate(filas[:k], start=1):
                recomendaciones.append({
                    "ranking": rank,
                    "id_producto": int(c),
                    "nombre": meta["nombre"][c],
                    "categoria": CATN.get(meta["cat"][c], str(meta["cat"][c])),
                    "probabilidad": round(s, 4),
                    "score_final": round(sf, 4),
                    "margen_pct": round(R.margen(c, meta) * 100, 1),
                    "en_promocion": meta["precio_promo"].get(c) is not None,
                })

        ts = pd.Timestamp(fecha_hora)
        salida = {
            "contexto": {
                "fecha_hora": str(fecha_hora),
                "dia_semana": ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"][ts.weekday()],
                "hora": int(ts.hour),
                "productos_en_mesa": [int(p) for p in productos_en_mesa],
            },
            "recomendaciones": recomendaciones,
            "modelo": {"version": self.info.get("version"), "auc_test": self.info.get("auc_test")},
        }
        if incluir_promos:
            salida["promociones"] = R.combos_sugeridos(self.est, self.meta)
        return salida


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--productos", nargs="*", type=int, default=[6], help="ids ya en la mesa")
    ap.add_argument("--fecha", default="2025-11-08 23:30:00")
    ap.add_argument("--k", type=int, default=3)
    a = ap.parse_args()
    rec = Recomendador()
    print(json.dumps(rec.recomendar(a.productos, a.fecha, k=a.k), ensure_ascii=False, indent=2))
