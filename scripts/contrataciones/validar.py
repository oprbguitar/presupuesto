# -*- coding: utf-8 -*-
"""Valida los JSON públicos antes de publicar. Código != 0 => el workflow NO publica.

Comprobaciones:
  - manifest.json presente y con años/evolución/fuentes/limitaciones.
  - Para cada año: agregados_{anio}.json y procedimientos_{anio}.json presentes y bien formados.
  - Coherencia de tipos y reglas: adjudicado y devengado NUNCA se copian entre sí.
  - Campos obligatorios en las filas de la tabla detallada.
  - Ningún indicador de presupuesto es negativo.
"""
import json, os, sys
from _comun import DATA_DIR, cargar_json, log

CAMPOS_FILA = ["codigo", "entidad", "objeto", "tipo", "estado", "convocado", "adjudicado",
               "contratado", "f_convocatoria", "regimen", "url"]

def err(msg, acc):
    log("VALIDACIÓN: " + msg, "error")
    acc.append(msg)

def main():
    fallos = []
    manifest = cargar_json("manifest.json")
    if not manifest:
        err("Falta manifest.json", fallos)
        return _fin(fallos)
    for k in ("anios", "evolucion", "fuentes", "limitaciones"):
        if k not in manifest:
            err("manifest.json sin clave '%s'" % k, fallos)
    anios = manifest.get("anios", [])
    for a in anios:
        agg = cargar_json("agregados_%s.json" % a)
        proc = cargar_json("procedimientos_%s.json" % a)
        if not agg:
            err("Falta agregados_%s.json" % a, fallos); continue
        if not proc:
            err("Falta procedimientos_%s.json" % a, fallos); continue
        ind = agg.get("indicadores", {})
        for k in ("pia", "pim", "dev", "gir"):
            v = ind.get(k)
            if v is not None and v < 0:
                err("Indicador negativo %s en %s" % (k, a), fallos)
        # Regla: adjudicado no debe ser idéntico a devengado por defecto (heurística de seguridad)
        if ind.get("adjudicado") is not None and ind.get("dev") is not None \
           and ind["adjudicado"] == ind["dev"] and ind["adjudicado"] != 0:
            err("En %s el adjudicado es idéntico al devengado (revisar: no deben copiarse)." % a, fallos)
        rows = proc.get("rows", [])
        if not isinstance(rows, list):
            err("procedimientos_%s.json: 'rows' no es lista" % a, fallos); continue
        for i, r in enumerate(rows[:5000]):
            faltan = [c for c in CAMPOS_FILA if c not in r]
            if faltan:
                err("procedimientos_%s.json fila %d sin campos: %s" % (a, i, ", ".join(faltan)), fallos)
                break
    return _fin(fallos)

def _fin(fallos):
    if fallos:
        log("Validación FALLIDA con %d error(es). No publicar." % len(fallos), "error")
        return 1
    log("Validación OK.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
