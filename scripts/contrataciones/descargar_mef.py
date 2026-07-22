# -*- coding: utf-8 -*-
"""Incorpora datos del MEF (presupuesto y ejecución) por pliego/unidad ejecutora.

El portal Consulta Amigable del MEF expone PIA, PIM, devengado y girado. Este script
lee un extracto previamente descargado (CSV/JSON) desde scripts/contrataciones/_raw/ y
produce un índice por código de pliego/UE que luego usa generar_agregados.py.

IMPORTANTE: el presupuesto (MEF) y la contratación (OECE) son universos distintos.
El devengado NO se atribuye automáticamente a un procedimiento de contratación.

Entrada:  scripts/contrataciones/_raw/mef_ejecucion_{anio}.csv  (columnas: pliego, ue, pia, pim, devengado, girado)
Salida:   scripts/contrataciones/_estado/mef_indice_{anio}.json
"""
import argparse, csv, json, os, sys
from _comun import RAW_DIR, STATE_DIR, log, num, hoy

def main(anios):
    ok = True
    for a in anios:
        raw = os.path.join(RAW_DIR, "mef_ejecucion_%s.csv" % a)
        if not os.path.exists(raw):
            log("No existe %s; exporte la Consulta Amigable del MEF a CSV." % os.path.basename(raw), "warn")
            ok = False
            continue
        indice = {}
        total = {"pia": 0.0, "pim": 0.0, "dev": 0.0, "gir": 0.0}
        with open(raw, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                clave = "%s:%s" % (row.get("pliego", "").strip(), row.get("ue", "").strip())
                rec = {"pia": num(row.get("pia")), "pim": num(row.get("pim")),
                       "dev": num(row.get("devengado")), "gir": num(row.get("girado"))}
                indice[clave] = rec
                for k, campo in (("pia", "pia"), ("pim", "pim"), ("dev", "dev"), ("gir", "gir")):
                    total[k] += rec[campo] or 0
        salida = os.path.join(STATE_DIR, "mef_indice_%s.json" % a)
        with open(salida, "w", encoding="utf-8") as f:
            json.dump({"anio": a, "actualizado": hoy(), "total": total, "por_ue": indice},
                      f, ensure_ascii=False, separators=(",", ":"))
        log("MEF %s: %d unidades ejecutoras indexadas" % (a, len(indice)))
    return 0 if ok else 2

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    sys.exit(main(p.parse_args().anios))
