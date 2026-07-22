# -*- coding: utf-8 -*-
"""Utilidades comunes del pipeline de Contrataciones públicas.

Reglas de oro del pipeline (no cambiar sin actualizar la documentación):
- El procesamiento es SIEMPRE fuera de línea. El navegador nunca descarga bases completas.
- Se generan JSON optimizados, separados por año/entidad/tipo de objeto.
- El monto adjudicado NO equivale al devengado ni al girado. Se guardan por separado.
- No se asume correspondencia uno a uno entre pliego, unidad ejecutora y entidad contratante.
- null significa "dato no incorporado", no "cero".
"""
import os, json, sys, hashlib, datetime, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(ROOT, "data", "contrataciones")
RAW_DIR = os.path.join(ROOT, "scripts", "contrataciones", "_raw")      # descargas crudas (ignoradas por git)
STATE_DIR = os.path.join(ROOT, "scripts", "contrataciones", "_estado") # huellas para detectar cambios de formato
LOG_PATH = os.path.join(ROOT, "scripts", "contrataciones", "pipeline.log")

for d in (DATA_DIR, RAW_DIR, STATE_DIR):
    os.makedirs(d, exist_ok=True)

def hoy():
    return datetime.date.today().isoformat()

def log(evento, estado="ok", extra=None):
    """Registra un evento en pipeline.log (append). estado: ok | warn | error."""
    linea = {"ts": datetime.datetime.now().isoformat(timespec="seconds"), "estado": estado, "evento": evento}
    if extra:
        linea["extra"] = extra
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(linea, ensure_ascii=False) + "\n")
    print(("[%s] " % estado.upper()) + evento, file=sys.stderr if estado == "error" else sys.stdout)

def guardar_json(nombre, obj, indent=1, optimizado=False):
    """Escribe un JSON en data/contrataciones/. optimizado=True minimiza el tamaño."""
    ruta = os.path.join(DATA_DIR, nombre)
    with open(ruta, "w", encoding="utf-8") as f:
        if optimizado:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=indent)
    log("Escrito %s (%d bytes)" % (nombre, os.path.getsize(ruta)))
    return ruta

def cargar_json(nombre, defecto=None):
    ruta = os.path.join(DATA_DIR, nombre)
    if not os.path.exists(ruta):
        return defecto
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)

def descargar(url, destino, timeout=120, headers=None):
    """Descarga un archivo a RAW_DIR. Devuelve la ruta local. Lanza en error de red."""
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "presupuesto-peru-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r, open(destino, "wb") as out:
        out.write(r.read())
    log("Descargado %s -> %s" % (url, os.path.basename(destino)))
    return destino

def huella(obj):
    """Huella estable de una estructura (para detectar cambios de esquema)."""
    txt = json.dumps(obj, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(txt.encode("utf-8")).hexdigest()

def config():
    """Lee config.json (si existe) o config.example.json."""
    base = os.path.dirname(__file__)
    for nombre in ("config.json", "config.example.json"):
        ruta = os.path.join(base, nombre)
        if os.path.exists(ruta):
            with open(ruta, encoding="utf-8") as f:
                return json.load(f)
    return {}

def num(v):
    try:
        n = float(v)
        return round(n, 2) if n == n else None  # descarta NaN
    except (TypeError, ValueError):
        return None
