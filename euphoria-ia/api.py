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
