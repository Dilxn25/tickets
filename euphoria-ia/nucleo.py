# -*- coding: utf-8 -*-
"""
nucleo.py - Ingenieria de caracteristicas COMPARTIDA entre entrenamiento y servicio.
Mantener esto en un solo lugar evita que el modelo se entrene con una formula y se
sirva con otra (fuente de errores clasica).
"""
import numpy as np
import pandas as pd
from collections import defaultdict, Counter
from sklearn.metrics.pairwise import cosine_similarity

# Orden EXACTO de las variables que consume el modelo. No cambiar sin reentrenar.
FC = ["coocc", "simax", "pop", "precio", "cat", "catmatch", "tam", "finde", "hora"]
# Version PERSONALIZADA (modelo demo): agrega dos variables que el modelo APRENDE
# sobre el CLIENTE — cli_freq (cuanto pide ESE cliente el candidato) y cli_cat (su
# afinidad a la categoria del candidato). Con cliente nuevo/sin historial valen 0,
# y el modelo cae a las 9 senales globales (arranque en frio).
FC_CLIENTE = FC + ["cli_freq", "cli_cat"]


def afinidad_cliente(cli_hist, meta):
    """Precalcula, del historial de UN cliente (lista de product_id ya consumidos),
    su frecuencia por producto y por categoria, normalizadas a 0..1. Se calcula una
    sola vez por cliente (entrenamiento) o por peticion (servicio)."""
    if not cli_hist:
        return {"freq": {}, "cat": {}}
    cf = Counter(int(p) for p in cli_hist)
    mx = max(cf.values())
    freq = {p: c / mx for p, c in cf.items()}
    catc = Counter(meta["cat"][int(p)] for p in cli_hist if int(p) in meta["cat"])
    n = sum(catc.values())
    catn = {k: v / n for k, v in catc.items()} if n else {}
    return {"freq": freq, "cat": catn}


def es_finde(ts):
    return pd.Timestamp(ts).weekday() >= 4


def construir_estructuras(lista_baskets, all_items):
    """A partir de las canastas de entrenamiento calcula co-ocurrencia, similitud y popularidad."""
    idx = {it: i for i, it in enumerate(all_items)}
    N = len(all_items)
    M = np.zeros((len(lista_baskets), N))
    pop = Counter()
    co = defaultdict(lambda: defaultdict(int))
    for ri, its in enumerate(lista_baskets):
        for it in its:
            if it in idx:
                M[ri, idx[it]] = 1
                pop[it] += 1
        for x in its:
            for y in its:
                if x != y:
                    co[x][y] += 1
    S = cosine_similarity(M.T)
    np.fill_diagonal(S, 0)
    return {
        "idx": idx,
        "S": S,
        "pop": dict(pop),
        "co": {k: dict(v) for k, v in co.items()},
    }


def features(pre, c, ts, est, meta):
    """Vector de 9 variables para un producto candidato 'c' dado el prefijo 'pre' y el contexto 'ts'."""
    ts = pd.Timestamp(ts)
    idx, S, pop, co = est["idx"], est["S"], est["pop"], est["co"]
    cat, precio = meta["cat"], meta["precio"]
    coocc = sum(co.get(p, {}).get(c, 0) for p in pre)
    simax = max((S[idx[p], idx[c]] for p in pre if p in idx and c in idx), default=0.0)
    catmatch = int(cat[c] in {cat[p] for p in pre})
    return [coocc, simax, pop.get(c, 0), precio[c], cat[c],
            catmatch, len(pre), int(es_finde(ts)), ts.hour]


def features_cliente(pre, c, ts, est, meta, afin):
    """Las 9 variables base + las 2 del cliente. 'afin' viene de afinidad_cliente().
    Con afin vacio (cliente sin historial) las dos ultimas son 0."""
    base = features(pre, c, ts, est, meta)
    ci = int(c)
    cli_freq = afin["freq"].get(ci, 0.0) if afin else 0.0
    cli_cat = afin["cat"].get(meta["cat"].get(ci), 0.0) if afin else 0.0
    return base + [cli_freq, cli_cat]
