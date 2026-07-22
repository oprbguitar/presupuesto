# -*- coding: utf-8 -*-
"""Descarga los datos abiertos del OECE/SEACE (contrataciones abiertas, estándar OCDS).

El OECE publica los datos en el estándar OCDS (Open Contracting Data Standard) a través de
su portal de contrataciones abiertas y del portal de datos abiertos del Estado.
Este script descarga los paquetes por año a scripts/contrataciones/_raw/ para su
procesamiento posterior (procesar_ocds.py). NO transforma los datos aquí.

Fuentes de referencia (confirmar el endpoint vigente en config.json):
  - Contrataciones abiertas OECE: https://contratacionesabiertas.oece.gob.pe/
  - Datos Abiertos del Estado:    https://www.datosabiertos.gob.pe/

Uso:
  python descargar_oece.py --anios 2023 2024 2025 2026
"""
import argparse, os, sys
from _comun import descargar, log, config, RAW_DIR

def main(anios):
    cfg = config()
    plantilla = (cfg.get("oece") or {}).get("ocds_url_por_anio")
    if not plantilla:
        log("No hay 'oece.ocds_url_por_anio' en config.json. "
            "Configure la plantilla del endpoint OCDS del OECE (ej.: '.../releases/{anio}.json'). "
            "El script no inventa URLs.", "warn")
        return 1
    ok = True
    for a in anios:
        url = plantilla.format(anio=a)
        destino = os.path.join(RAW_DIR, "oece_ocds_%s.json" % a)
        try:
            descargar(url, destino, timeout=(cfg.get("timeout") or 300))
        except Exception as e:  # noqa: BLE001
            log("Fallo al descargar OECE %s: %s" % (a, e), "error")
            ok = False
    return 0 if ok else 2

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    sys.exit(main(p.parse_args().anios))
