# -*- coding: utf-8 -*-
"""
entrenar.py - Entrena el modelo y genera UN SOLO artefacto portable (artefacto_modelo.pkl).

USO:
    python entrenar.py                # usa la fuente definida en config.json

Para pasar de la BD vieja a la nueva: edita config.json -> "fuente": "mysql_prisma".
NADA MAS cambia. El artefacto resultante se sirve igual.
"""
import os
import json
import argparse
import joblib
from datetime import datetime
import numpy as np
import pandas as pd
import lightgbm as lgb
from collections import Counter, defaultdict
from sklearn.metrics import roc_auc_score

import nucleo
import fuentes_datos

AQUI = os.path.dirname(os.path.abspath(__file__))


def cargar_config():
    with open(os.path.join(AQUI, "config.json"), encoding="utf-8") as f:
        return json.load(f)


def construir_afinidades(baskets, cliente_de, meta):
    """Para el modo PERSONALIZADO: por cada canasta con cliente, arma la afinidad de
    ESE cliente con leave-one-out (su historial SIN la canasta actual), para que el
    modelo no vea el item que tiene que predecir. Canastas sin cliente -> sin afinidad."""
    por_cliente = defaultdict(list)  # cliente -> [(venta, set(productos))]
    for v, its in baskets.items():
        cli = cliente_de.get(v)
        if cli is None or (isinstance(cli, float) and pd.isna(cli)):
            continue
        por_cliente[int(cli)].append((v, set(its)))
    total = {}  # cliente -> Counter(producto -> nº de canastas que lo contienen)
    for cli, lst in por_cliente.items():
        c = Counter()
        for _, s in lst:
            for p in s:
                c[p] += 1
        total[cli] = c
    afin_por_venta = {}
    for cli, lst in por_cliente.items():
        for v, s in lst:
            c = total[cli].copy()
            for p in s:
                c[p] -= 1  # leave-one-out
            hist = [p for p, cnt in c.items() if cnt > 0 for _ in range(cnt)]
            afin_por_venta[v] = nucleo.afinidad_cliente(hist, meta)
    return afin_por_venta


def construir_dataset(baskets_dict, hora, ids, est, meta, all_items, rng, neg=4,
                      con_cliente=False, afin_por_venta=None):
    X, y = [], []
    cols = nucleo.FC_CLIENTE if con_cliente else nucleo.FC
    afin_por_venta = afin_por_venta or {}

    def feat(pre, c, v):
        if con_cliente:
            return nucleo.features_cliente(pre, c, hora[v], est, meta, afin_por_venta.get(v, {}))
        return nucleo.features(pre, c, hora[v], est, meta)

    for v in ids:
        its = baskets_dict[v]
        if len(its) < 2:
            continue
        for held in its:
            pre = [x for x in its if x != held]
            X.append(feat(pre, held, v)); y.append(1)
            negs = [c for c in all_items if c not in its]
            if not negs:
                continue
            for c in rng.choice(negs, size=min(neg, len(negs)), replace=False):
                X.append(feat(pre, int(c), v)); y.append(0)
    return pd.DataFrame(X, columns=cols), np.array(y)


def main():
    ap = argparse.ArgumentParser()

    ap.add_argument("--versionar", default=None, help="carpeta donde dejar la version fechada")

    ap.add_argument("--conservar", type=int, default=6, help="cuantas versiones guardar")
    ap.add_argument("--cliente", action="store_true",
                    help="modelo PERSONALIZADO: agrega la afinidad del cliente como caracteristica")
    ap.add_argument("--salida", default=None, help="ruta del .pkl de salida (sobreescribe config.json)")
    args = ap.parse_args()
    con_cliente = args.cliente

    cfg = cargar_config()
    rng = np.random.default_rng(42)
    print("[1/5] Cargando datos desde fuente:", cfg["fuente"], "| personalizado:", con_cliente)
    df, meta = fuentes_datos.cargar(cfg)
    all_items = sorted(meta["cat"].keys())
    print("      canastas:", df.venta_id.nunique(), "| productos:", len(all_items))

    print("[2/5] Armando canastas + split temporal (80/20)")
    fb = df.groupby("venta_id")["fecha_hora"].min()
    baskets = df.groupby("venta_id")["producto_id"].apply(lambda s: sorted(set(s))).to_dict()
    hora = {v: fb[v] for v in baskets}
    # Afinidades por cliente (solo modo personalizado)
    afin_por_venta = {}
    if con_cliente:
        cliente_de = df.groupby("venta_id")["cliente_id"].first().to_dict()
        afin_por_venta = construir_afinidades(baskets, cliente_de, meta)
        print("      clientes con historial:", len({c for c in cliente_de.values() if c is not None and not (isinstance(c, float) and pd.isna(c))}))
    orden = fb.sort_values().index.tolist()
    corte = int(len(orden) * 0.8)
    train_ids = orden[:corte]
    test_ids = [v for v in orden[corte:] if len(baskets[v]) >= 2]

    print("[3/5] Construyendo estructuras (co-ocurrencia / similitud / popularidad)")
    est = nucleo.construir_estructuras([baskets[v] for v in train_ids], all_items)

    print("[4/5] Entrenando LightGBM")
    hp_path = os.path.join(AQUI, "mejores_hiperparametros.json")
    if os.path.exists(hp_path):
        params = json.load(open(hp_path, encoding="utf-8"))
    else:
        params = dict(n_estimators=500, learning_rate=0.05, num_leaves=31,
                      subsample=0.8, colsample_bytree=0.8)
    params.update(random_state=42, verbose=-1)
    Xtr, ytr = construir_dataset(baskets, hora, train_ids, est, meta, all_items, rng,
                                 con_cliente=con_cliente, afin_por_venta=afin_por_venta)
    modelo = lgb.LGBMClassifier(**params)
    modelo.fit(Xtr, ytr, categorical_feature=["cat"])

    auc = None
    if test_ids:
        Xte, yte = construir_dataset(baskets, hora, test_ids, est, meta, all_items, rng,
                                     con_cliente=con_cliente, afin_por_venta=afin_por_venta)
        auc = float(roc_auc_score(yte, modelo.predict_proba(Xte)[:, 1]))
        print("      AUC test:", round(auc, 4))

    print("[5/5] Guardando artefacto portable")
    artefacto = {
        "modelo": modelo,
        "estructuras": est,
        "meta_productos": meta,
        "all_items": all_items,
        "FC": nucleo.FC_CLIENTE if con_cliente else nucleo.FC,
        "info": {
            "fuente": cfg["fuente"],
            "n_canastas": int(df.venta_id.nunique()),
            "auc_test": auc,
            "version": cfg.get("version", "1.0"),
            "personalizado": con_cliente,
        },
    }
    salida = os.path.join(AQUI, args.salida or cfg.get("salida_artefacto", "artefacto_modelo.pkl"))
    joblib.dump(artefacto, salida)
    print("OK ->", salida, "| FC:", len(artefacto["FC"]), "variables")

    # Version fechada: cada reentrenamiento deja su propio archivo y NO pisa al
    # anterior, para poder volver atras si el modelo nuevo no convence.
    if args.versionar:
        carpeta = os.path.abspath(args.versionar)
        os.makedirs(carpeta, exist_ok=True)
        sello = datetime.now().strftime("%Y-%m-%d-%H%M")
        base = "modelo-%s" % sello
        ruta_pkl = os.path.join(carpeta, base + ".pkl")
        joblib.dump(artefacto, ruta_pkl)

        ficha = {
            "archivo": base + ".pkl",
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "n_canastas": artefacto["info"]["n_canastas"],
            "n_productos": len(all_items),
            "auc_test": round(auc, 4) if auc is not None else None,
            "version_motor": artefacto["info"]["version"],
            "personalizado": con_cliente,
        }
        with open(os.path.join(carpeta, base + ".json"), "w", encoding="utf-8") as f:
            json.dump(ficha, f, ensure_ascii=False, indent=2)

        # Se conservan las ultimas versiones; las mas viejas se retiran para que
        # el repositorio no crezca sin control.
        conservar = max(2, int(args.conservar))
        pkls = sorted([a for a in os.listdir(carpeta) if a.endswith(".pkl")], reverse=True)
        for viejo_pkl in pkls[conservar:]:
            try:
                os.remove(os.path.join(carpeta, viejo_pkl))
                meta_viejo = os.path.join(carpeta, os.path.splitext(viejo_pkl)[0] + ".json")
                if os.path.exists(meta_viejo):
                    os.remove(meta_viejo)
                print("   retirada version antigua:", viejo_pkl)
            except OSError:
                pass

        print("VERSION ->", ruta_pkl)
        print("FICHA   ->", json.dumps(ficha, ensure_ascii=False))


if __name__ == "__main__":
    main()
