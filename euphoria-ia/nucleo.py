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
