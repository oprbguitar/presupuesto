# -*- coding: utf-8 -*-
"""Construye/actualiza el catálogo maestro de entidades (tabla de normalización).

Relaciona los distintos identificadores de una misma entidad SIN asumir correspondencia
uno a uno entre pliego (MEF), unidad ejecutora (MEF) y entidad contratante (OECE):

  id (interno) | nombre oficial | RUC | cod_oece | cod_pliego_mef | cod_ue_mef |
  sector | nivel | ubigeo | departamento

Fuentes de entrada (config.json -> 'maestro.fuentes'):
  - Padrón de entidades OECE (RUC, nombre, cod_oece)
  - Clasificador institucional MEF (pliego, unidad ejecutora)
  - RENIEC/INEI para ubigeo
Este script fusiona las que existan en _raw/ y deja los campos faltantes en null.

Salida: data/contrataciones/maestro_entidades.json
"""
import argparse, csv, json, os, sys
from _comun import RAW_DIR, guardar_json, cargar_json, log, hoy

def leer_csv(nombre):
    ruta = os.path.join(RAW_DIR, nombre)
    if not os.path.exists(ruta):
        return []
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def main():
    # Punto de partida: lo ya existente (para no perder ids internos estables).
    existente = cargar_json("maestro_entidades.json", {"entidades": []})
    por_ruc = {}
    for e in existente.get("entidades", []):
        if e.get("ruc"):
            por_ruc[e["ruc"]] = dict(e)

    oece = leer_csv("oece_entidades.csv")   # ruc, nombre, cod_oece, ubigeo
    mef = leer_csv("mef_pliegos.csv")        # ruc, pliego, unidad_ejecutora, sector, nivel
    if not oece and not mef and not existente.get("entidades"):
        log("Sin fuentes de entidades (oece_entidades.csv / mef_pliegos.csv). Se mantiene el catálogo actual.", "warn")

    def upsert(ruc, **campos):
        if not ruc:
            return
        rec = por_ruc.get(ruc, {"id": None, "ruc": ruc})
        for k, v in campos.items():
            if v:
                rec[k] = v
        por_ruc[ruc] = rec

    for r in oece:
        upsert(r.get("ruc"), nombre=r.get("nombre"), cod_oece=r.get("cod_oece"),
               ubigeo=r.get("ubigeo"), departamento=r.get("departamento"))
    for r in mef:
        upsert(r.get("ruc"), cod_pliego_mef=r.get("pliego"), cod_ue_mef=r.get("unidad_ejecutora"),
               sector=r.get("sector"), nivel=r.get("nivel"))

    # Asigna ids internos estables (E-0001…) preservando los existentes.
    usados = {e["id"] for e in por_ruc.values() if e.get("id")}
    n = max([int(i.split("-")[1]) for i in usados], default=0)
    salida = []
    for ruc in sorted(por_ruc):
        e = por_ruc[ruc]
        if not e.get("id"):
            n += 1
            e["id"] = "E-%04d" % n
        salida.append({k: e.get(k) for k in
                       ("id", "nombre", "ruc", "cod_oece", "cod_pliego_mef", "cod_ue_mef",
                        "sector", "nivel", "ubigeo", "departamento")})

    guardar_json("maestro_entidades.json", {
        "actualizado": hoy(), "estado_datos": "validado",
        "nota": "No se asume correspondencia uno a uno entre pliego, unidad ejecutora y entidad contratante.",
        "entidades": salida,
    })
    log("Catálogo maestro: %d entidades" % len(salida))
    return 0

if __name__ == "__main__":
    argparse.ArgumentParser().parse_args()
    sys.exit(main())
