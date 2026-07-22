# -*- coding: utf-8 -*-
"""Detecta cambios de estructura en las fuentes (esquema OCDS / columnas MEF / Perú Compras).

Guarda una huella del conjunto de claves de cada archivo crudo en _estado/esquemas.json.
Si en una ejecución posterior el conjunto de claves cambia, lo reporta con estado 'warn'
(campos nuevos) o 'error' (campos que desaparecieron y que el pipeline usa).

Uso en CI: si devuelve código != 0, el workflow NO publica y deja constancia en el log.
"""
import argparse, json, os, sys
from _comun import RAW_DIR, STATE_DIR, log, huella

ESQUEMAS = os.path.join(STATE_DIR, "esquemas.json")
# Campos mínimos que el pipeline necesita de cada fuente (si faltan -> error).
CRITICOS = {
    "oece_ocds": {"tender", "awards", "buyer"},
    "mef_ejecucion": {"pliego", "ue", "pia", "pim", "devengado", "girado"},
}

def claves_de(ruta):
    """Extrae el conjunto de claves de primer nivel de un JSON, o cabeceras de un CSV."""
    if ruta.endswith(".json"):
        with open(ruta, encoding="utf-8") as f:
            obj = json.load(f)
        muestra = None
        if isinstance(obj, dict):
            rels = obj.get("releases") or obj.get("records")
            muestra = (rels[0] if rels else obj)
        elif isinstance(obj, list) and obj:
            muestra = obj[0]
        muestra = muestra or {}
        if isinstance(muestra, dict) and "compiledRelease" in muestra:
            muestra = muestra["compiledRelease"]
        return set(muestra.keys()) if isinstance(muestra, dict) else set()
    # CSV
    with open(ruta, encoding="utf-8-sig") as f:
        cab = f.readline().strip()
    sep = ";" if cab.count(";") >= cab.count(",") else ","
    return set(h.strip() for h in cab.split(sep))

def familia(nombre):
    for fam in CRITICOS:
        if nombre.startswith(fam):
            return fam
    return None

def main():
    prev = {}
    if os.path.exists(ESQUEMAS):
        with open(ESQUEMAS, encoding="utf-8") as f:
            prev = json.load(f)
    actual, problemas = {}, 0
    for nombre in sorted(os.listdir(RAW_DIR)):
        ruta = os.path.join(RAW_DIR, nombre)
        if not os.path.isfile(ruta) or not (nombre.endswith(".json") or nombre.endswith(".csv")):
            continue
        try:
            claves = claves_de(ruta)
        except Exception as e:  # noqa: BLE001
            log("No se pudo leer esquema de %s: %s" % (nombre, e), "error")
            problemas += 1
            continue
        actual[nombre] = {"h": huella(sorted(claves)), "claves": sorted(claves)}
        fam = familia(nombre)
        if fam:
            faltan = CRITICOS[fam] - claves
            if faltan:
                log("Campos CRÍTICOS ausentes en %s: %s" % (nombre, ", ".join(sorted(faltan))), "error")
                problemas += 1
        if nombre in prev and prev[nombre]["h"] != actual[nombre]["h"]:
            antes, ahora = set(prev[nombre]["claves"]), claves
            log("Cambio de esquema en %s. Nuevos: %s. Perdidos: %s"
                % (nombre, sorted(ahora - antes), sorted(antes - ahora)), "warn")

    with open(ESQUEMAS, "w", encoding="utf-8") as f:
        json.dump(actual, f, ensure_ascii=False, indent=1)
    if problemas:
        log("detectar_cambios: %d problema(s) crítico(s). El pipeline NO debe publicar." % problemas, "error")
        return 3
    log("detectar_cambios: esquemas verificados (%d archivos)." % len(actual))
    return 0

if __name__ == "__main__":
    argparse.ArgumentParser().parse_args()
    sys.exit(main())
