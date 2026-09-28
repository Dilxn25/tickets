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
from collections import Counter

import joblib
import pandas as pd

import nucleo
import reglas as R

AQUI = os.path.dirname(os.path.abspath(__file__))
# Nombres de las categorías tal como están en la base (id_categoria). El backend
# igual los reemplaza por el nombre vigente de la tabla categoria.
CATN = {1: "Bebidas", 2: "Cócteles", 3: "Cervezas", 4: "Snacks", 5: "Combos", 6: "Sin Alcohol",
        7: "Vodka", 8: "Ron", 9: "Whisky", 11: "Gin", 12: "Singani", 13: "Tequila",
        14: "Licores", 15: "Espumantes", 16: "Cigarrillos"}
# Una categoría entra al perfil del cliente si pesa al menos esto en su historial
# (evita que un pedido suelto cuente como "categoría favorita").
CUOTA_MIN_CATEGORIA = 0.05


class Recomendador:
    def __init__(self, ruta_artefacto="artefacto_modelo.pkl", ruta_reglas="reglas.json"):
        b = joblib.load(os.path.join(AQUI, ruta_artefacto))
        self.modelo = b["modelo"]
        self.est = b["estructuras"]
        self.meta = b["meta_productos"]
        self.all_items = b["all_items"]
        self.info = b.get("info", {})
        # FC del artefacto: si incluye las variables de cliente, es el modelo
        # PERSONALIZADO (aprende el gusto de cada cliente). Si no, es el real (9 vars).
        self.FC = b.get("FC", nucleo.FC)
        self.personalizado = "cli_freq" in self.FC
        # Clientes DEMO embebidos en el pkl (para la demostración self-contained: su
        # historial viaja DENTRO del pkl, no hace falta cargar nada a la base de datos).
        self.clientes_demo = b.get("clientes_demo", {})
        with open(os.path.join(AQUI, ruta_reglas), encoding="utf-8") as f:
            self.reglas = json.load(f)

    def _score_modelo(self, pre, cands, ts, afin=None):
        if self.personalizado:
            filas = [nucleo.features_cliente(pre, c, ts, self.est, self.meta, afin or {}) for c in cands]
        else:
            filas = [nucleo.features(pre, c, ts, self.est, self.meta) for c in cands]
        Xc = pd.DataFrame(filas, columns=self.FC)
        return dict(zip(cands, self.modelo.predict_proba(Xc)[:, 1]))

    def perfil_cliente(self, historial_cliente):
        """Del historial de UN cliente saca sus categorías ordenadas por peso (las que
        pasan la cuota mínima) y cuántas veces pidió cada producto. Las cortesías
        (precio 0) no cuentan: no las eligió él."""
        meta = self.meta
        validos = [int(p) for p in (historial_cliente or [])
                   if int(p) in meta["cat"] and float(meta["precio"].get(int(p), 0) or 0) > 0]
        if not validos:
            return {"categorias": [], "freq": {}, "veces": {}}
        veces = Counter(validos)
        tope = max(veces.values())
        por_cat = Counter(meta["cat"][p] for p in validos)
        total = sum(por_cat.values())
        orden = sorted(por_cat.items(), key=lambda kv: -kv[1])
        categorias = [(cat, n / total) for cat, n in orden if n / total >= CUOTA_MIN_CATEGORIA]
        return {
            "categorias": categorias or [(orden[0][0], orden[0][1] / total)],
            "freq": {p: v / tope for p, v in veces.items()},
            "veces": dict(veces),
        }

    def _elegir_por_perfil(self, perfil, filas, k):
        """Regla del perfil: un producto por cada categoría que más consume el cliente,
        en orden de peso. Si consume una sola categoría salen sus productos más pedidos
        de esa categoría. Dentro de cada categoría va primero lo que él más pidió y, a
        igual cantidad, lo que el modelo ubica más arriba. Si el perfil no alcanza a
        llenar las k posiciones, completa el ranking del modelo."""
        meta, veces = self.meta, perfil["veces"]
        puesto = {f[0]: i for i, f in enumerate(filas)}
        colas = []
        for cat, cuota in perfil["categorias"]:
            de_cat = [f for f in filas if meta["cat"].get(f[0]) == cat]
            de_cat.sort(key=lambda f: (-veces.get(int(f[0]), 0), puesto[f[0]]))
            colas.append((cat, cuota, de_cat))

        elegidas, usados, ronda = [], set(), 0
        while len(elegidas) < k and any(ronda < len(q) for _, _, q in colas):
            for cat, cuota, q in colas:
                if len(elegidas) >= k:
                    break
                if ronda >= len(q) or q[ronda][0] in usados:
                    continue
                f = q[ronda]
                usados.add(f[0])
                elegidas.append((f, {
                    "id_categoria": int(cat),
                    "categoria": CATN.get(cat, str(cat)),
                    "cuota_categoria": round(float(cuota), 3),
                    "veces": int(veces.get(int(f[0]), 0)),
                }))
            ronda += 1
        for f in filas:
            if len(elegidas) >= k:
                break
            if f[0] not in usados:
                usados.add(f[0])
                elegidas.append((f, None))
        return elegidas

    def recomendar(self, productos_en_mesa, fecha_hora, k=3, stock=None, incluir_promos=True, historial_cliente=None):
        meta, cfg = self.meta, self.reglas
        # el stock recibido es un OVERRIDE PARCIAL sobre el inventario conocido (no lo reemplaza)
        stock_efectivo = dict(meta["stock"])
        if stock:
            stock_efectivo.update(stock)
        stock = stock_efectivo
        pset = set(productos_en_mesa)
        # PERSONALIZACION: si el modelo es personalizado, se calcula la afinidad del
        # cliente (freq por producto y por categoria) desde SU historial. Con historial
        # vacio -> afinidad vacia -> el modelo cae a las senales globales (arranque en frio).
        afin = nucleo.afinidad_cliente(historial_cliente, meta) if self.personalizado else {}

        # 1) filtro DURO de stock. Las cortesías (precio 0) no se venden: nunca se sugieren.
        cands = [c for c in self.all_items
                 if c not in pset and R.disponible(c, stock, meta["minimo"], cfg["stock"]["activa"])
                 and float(meta["precio"].get(c, 0) or 0) > 0]

        recomendaciones = []
        perfil = self.perfil_cliente(historial_cliente)
        if cands:
            crudo = self._score_modelo(productos_en_mesa, cands, fecha_hora, afin)
            filas = []
            for c in cands:
                s = float(crudo[c])
                bt = R.boost_temporal(c, fecha_hora, meta, cfg["temporal"])
                fm = R.factor_margen(c, meta, cfg["margen"])
                bp = R.boost_promo(c, meta, cfg["promo"])
                filas.append((c, s, bt, fm, bp, s * bt * fm * bp))
            filas.sort(key=lambda x: -x[-1])
            # Con cliente identificado manda su perfil: un producto por cada categoría
            # que más consume. Sin historial queda el ranking del modelo tal cual.
            elegidas = self._elegir_por_perfil(perfil, filas, k) if perfil["categorias"] else [(f, None) for f in filas[:k]]
            for rank, ((c, s, bt, fm, bp, sf), motivo) in enumerate(elegidas, start=1):
                recomendaciones.append({
                    "ranking": rank,
                    "id_producto": int(c),
                    "nombre": meta["nombre"][c],
                    "id_categoria": int(meta["cat"][c]),
                    "categoria": CATN.get(meta["cat"][c], str(meta["cat"][c])),
                    # 6 decimales: con la mesa vacía la probabilidad es chica y a 4
                    # decimales llegaba como 0, y la toma de pedidos la descartaba.
                    "probabilidad": round(s, 6),
                    "score_final": round(sf, 6),
                    "margen_pct": round(R.margen(c, meta) * 100, 1),
                    "en_promocion": meta["precio_promo"].get(c) is not None,
                    # Cuánto coincide con el gusto del cliente (0..1): veces que lo pidió
                    # frente a su producto favorito.
                    "afinidad_cliente": round(float(perfil["freq"].get(int(c), 0.0)), 3),
                    # Por qué entró por el perfil (categoría, peso y veces pedidas)
                    "motivo_cliente": motivo,
                    # Factores del ranking (para explicar el "porqué" en el panel):
                    # >1 empuja al producto, <1 lo castiga
                    "factores": {
                        "temporal": round(float(bt), 3),
                        "margen": round(float(fm), 3),
                        "promo": round(float(bp), 3),
                    },
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
            # Categorías que más consume el cliente, con su peso (vacío sin cliente)
            "perfil_cliente": [{"id_categoria": int(c), "categoria": CATN.get(c, str(c)), "cuota": round(float(q), 3)}
                               for c, q in perfil["categorias"]],
            "modelo": {"version": self.info.get("version"), "auc_test": self.info.get("auc_test"),
                       "personalizado": self.personalizado},
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
