# -*- coding: utf-8 -*-
"""Incorpora órdenes de compra y de servicio de Perú Compras (catálogos electrónicos).

Perú Compras publica las órdenes derivadas de Acuerdos Marco y Subasta Inversa. Estas
órdenes complementan a los procedimientos OECE y se agregan como filas del mismo esquema,
marcando su procedencia. Una orden de compra corresponde a bienes; una de servicio, a servicios.

Entrada:  scripts/contrataciones/_raw/perucompras_ordenes_{anio}.csv
          (columnas: tipo_orden, entidad, ruc_proveedor, proveedor, descripcion, monto, fecha, ubigeo)
Salida:   fusiona en data/contrataciones/procedimientos_{anio}.json (append de filas tipo 'orden').
"""
import argparse, csv, os, sys
from _comun import RAW_DIR, cargar_json, guardar_json, log, num, hoy

def main(anios):
    ok = True
    for a in anios:
        raw = os.path.join(RAW_DIR, "perucompras_ordenes_%s.csv" % a)
        if not os.path.exists(raw):
            log("No existe %s; exporte las órdenes de Perú Compras." % os.path.basename(raw), "warn")
            ok = False
            continue
        base = cargar_json("procedimientos_%s.json" % a, {"anio": a, "rows": []})
        nuevas = []
        with open(raw, encoding="utf-8-sig", newline="") as f:
            for i, row in enumerate(csv.DictReader(f)):
                es_bien = "compra" in (row.get("tipo_orden", "").lower())
                monto = num(row.get("monto"))
                nuevas.append({
                    "codigo": "PC-%s-%d" % (a, i),
                    "entidad_id": None, "entidad": row.get("entidad"), "ue": "",
                    "descripcion": row.get("descripcion", ""),
                    "objeto": "Bienes" if es_bien else "Servicios",
                    "categoria": "Catálogo electrónico", "tipo": "Perú Compras — Acuerdo Marco",
                    "estado": "Contratado", "proveedor": row.get("proveedor"),
                    "ruc": row.get("ruc_proveedor"), "sancionado": False,
                    "convocado": monto, "adjudicado": monto, "contratado": monto,
                    "f_convocatoria": (row.get("fecha") or "")[:10] or None,
                    "f_adjudicacion": (row.get("fecha") or "")[:10] or None,
                    "postores": 1, "regimen": "D.L. 1439 (Perú Compras)",
                    "nivel": "", "sector": "", "departamento": "",
                    "ubigeo": row.get("ubigeo", ""), "cierre_anio": (row.get("fecha", "")[5:7] == "12"),
                    "url": "https://www.gob.pe/perucompras",
                })
        base["rows"] = [r for r in base.get("rows", []) if not str(r.get("codigo", "")).startswith("PC-")] + nuevas
        base["actualizado"] = hoy()
        guardar_json("procedimientos_%s.json" % a, base, optimizado=True)
        log("Perú Compras %s: %d órdenes incorporadas" % (a, len(nuevas)))
    return 0 if ok else 2

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    sys.exit(main(p.parse_args().anios))
