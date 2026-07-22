# -*- coding: utf-8 -*-
"""Construye el catálogo de proveedores y marca sancionados/inhabilitados.

Agrega los proveedores presentes en los procedimientos y cruza con el registro de
sanciones/inhabilitaciones (OECE/Contraloría) para marcar 'sancionado'. Además,
propaga la marca 'sancionado' a las filas de procedimientos_{anio}.json.

Entrada:
  - data/contrataciones/procedimientos_{anio}.json (proveedores observados)
  - scripts/contrataciones/_raw/sanciones.csv (columnas: ruc, detalle, vigente)
Salida:
  - data/contrataciones/proveedores.json
"""
import argparse, csv, os, sys
from _comun import RAW_DIR, cargar_json, guardar_json, log, hoy

def leer_sanciones():
    ruta = os.path.join(RAW_DIR, "sanciones.csv")
    if not os.path.exists(ruta):
        log("Sin sanciones.csv; no se marcarán proveedores sancionados.", "warn")
        return {}
    d = {}
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if str(r.get("vigente", "")).strip().lower() in ("1", "true", "si", "sí", "vigente"):
                d[r.get("ruc", "").strip()] = r.get("detalle", "Sanción vigente")
    return d

def main(anios):
    sanciones = leer_sanciones()
    prov = {}
    for a in anios:
        base = cargar_json("procedimientos_%s.json" % a)
        if not base:
            continue
        cambiado = False
        for r in base.get("rows", []):
            ruc = r.get("ruc")
            if ruc and ruc in sanciones and not r.get("sancionado"):
                r["sancionado"] = True
                cambiado = True
            if not ruc:
                continue
            g = prov.setdefault(ruc, {"ruc": ruc, "nombre": r.get("proveedor"),
                                      "sancionado": ruc in sanciones,
                                      "sancion_detalle": sanciones.get(ruc, "")})
        if cambiado:
            base["actualizado"] = hoy()
            guardar_json("procedimientos_%s.json" % a, base, optimizado=True)

    guardar_json("proveedores.json", {
        "actualizado": hoy(), "estado_datos": "validado",
        "proveedores": [prov[k] for k in sorted(prov)],
    })
    log("Catálogo de proveedores: %d (sancionados: %d)"
        % (len(prov), sum(1 for p in prov.values() if p["sancionado"])))
    return 0

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    sys.exit(main(p.parse_args().anios))
