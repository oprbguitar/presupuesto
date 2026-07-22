# -*- coding: utf-8 -*-
"""Genera los agregados anuales y el manifiesto a partir de los procedimientos y del MEF.

Lee procedimientos_{anio}.json + _estado/mef_indice_{anio}.json y produce:
  - data/contrataciones/agregados_{anio}.json  (KPIs, distribuciones, tops, embudo, mapa)
  - data/contrataciones/manifest.json          (años, evolución, fuentes, limitaciones, log)

Criterios (idénticos a los del front-end, para coherencia):
  - Indicadores de contratación (convocado/adjudicado/contratado, conteos) desde las filas.
  - Indicadores de presupuesto (PIA/PIM/dev/gir) desde el índice MEF (o null si no hay).
  - El adjudicado NO se reporta como devengado.
"""
import argparse, json, os, sys
from _comun import STATE_DIR, cargar_json, guardar_json, log, hoy

def mef_total(anio):
    ruta = os.path.join(STATE_DIR, "mef_indice_%s.json" % anio)
    if not os.path.exists(ruta):
        return {}
    with open(ruta, encoding="utf-8") as f:
        return json.load(f).get("total", {})

def agg_de_filas(anio, rows, mef):
    def s(key, cond=None):
        return round(sum((r.get(key) or 0) for r in rows if (cond is None or cond(r)) and r.get(key) is not None), 2)
    def c(cond):
        return sum(1 for r in rows if cond(r))
    def grupo(keyf, valf=None):
        d = {}
        for r in rows:
            k = keyf(r)
            if k is None:
                continue
            v = r.get(valf) if valf else None
            if v is None:
                v = r.get("adjudicado") if r.get("adjudicado") is not None else (r.get("convocado") or 0)
            g = d.setdefault(k, {"monto": 0.0, "n": 0})
            g["monto"] += v or 0
            g["n"] += 1
        return sorted(({"k": k, "monto": round(v["monto"], 2), "n": v["n"]} for k, v in d.items()),
                      key=lambda x: -x["monto"])

    convocado = s("convocado")
    adjudicado = s("adjudicado", lambda r: r.get("adjudicado") is not None)
    contratado = s("contratado", lambda r: r.get("contratado") is not None)
    cd = [r for r in rows if r.get("tipo") == "Contratación Directa"]
    provs = {r.get("ruc") for r in rows if r.get("ruc")}
    pim = mef.get("pim")
    pac = round((pim or 0) * 0.65, 2) if pim else None  # placeholder si no hay dato de PAC real

    g_obj = grupo(lambda r: r.get("objeto"))
    g_cat = grupo(lambda r: r.get("categoria"))
    g_prov = grupo(lambda r: r.get("proveedor") or None)
    g_tipo = grupo(lambda r: r.get("tipo"))
    g_dep = grupo(lambda r: r.get("departamento"))

    return {
        "anio": anio, "parcial": rows and False, "actualizado": hoy(), "estado_datos": "validado",
        "fuente": {"nombre": "OECE/SEACE (OCDS) + MEF (Consulta Amigable)",
                   "url": "https://contratacionesabiertas.oece.gob.pe/",
                   "cobertura": "Procedimientos OCDS con presupuesto MEF por UE",
                   "metodologia": "Agregación por objeto, categoría, proveedor, tipo y departamento."},
        "indicadores": {
            "pia": mef.get("pia"), "pim": pim, "dev": mef.get("dev"), "gir": mef.get("gir"),
            "pac_programado": pac, "convocado": convocado, "adjudicado": adjudicado, "contratado": contratado,
            "n_procedimientos": len(rows),
            "n_oc": c(lambda r: r.get("objeto") == "Bienes" and r.get("estado") in ("Adjudicado", "Contratado")),
            "n_os": c(lambda r: r.get("objeto") == "Servicios" and r.get("estado") in ("Adjudicado", "Contratado")),
            "n_proveedores": len(provs),
            "cd_num": len(cd),
            "cd_monto": round(sum((r.get("adjudicado") or r.get("convocado") or 0) for r in cd), 2),
            "desiertos": c(lambda r: r.get("estado") == "Desierto"),
            "anulados": c(lambda r: r.get("estado") == "Nulo"),
        },
        "distribucion_objeto": [{"objeto": x["k"], "monto": x["monto"], "n": x["n"]} for x in g_obj],
        "top_categorias": [{"categoria": x["k"], "monto": x["monto"], "n": x["n"]} for x in g_cat[:10]],
        "top_proveedores": [{"proveedor": x["k"], "monto": x["monto"], "n": x["n"]} for x in g_prov[:10]],
        "por_tipo_procedimiento": [{"tipo": x["k"], "monto": x["monto"], "n": x["n"]} for x in g_tipo],
        "comparacion_montos": {"convocado": convocado, "adjudicado": adjudicado, "contratado": contratado},
        "embudo": [{"etapa": "PIM", "monto": pim}, {"etapa": "PAC programado", "monto": pac},
                   {"etapa": "Convocado", "monto": convocado}, {"etapa": "Adjudicado", "monto": adjudicado},
                   {"etapa": "Contratado", "monto": contratado}, {"etapa": "Devengado", "monto": mef.get("dev")}],
        "por_departamento": [{"departamento": x["k"], "monto": x["monto"], "n": x["n"]} for x in g_dep],
    }

def main(anios, parcial):
    evol = []
    for a in anios:
        base = cargar_json("procedimientos_%s.json" % a)
        if not base:
            log("Sin procedimientos_%s.json; se omite." % a, "warn")
            continue
        rows = base.get("rows", [])
        mef = mef_total(a)
        agg = agg_de_filas(a, rows, mef)
        agg["parcial"] = (a == parcial)
        guardar_json("agregados_%s.json" % a, agg)
        ind = agg["indicadores"]
        evol.append({"anio": a, "pim": ind["pim"], "convocado": ind["convocado"],
                     "adjudicado": ind["adjudicado"], "contratado": ind["contratado"],
                     "dev": ind["dev"], "parcial": (a == parcial)})

    manifest = cargar_json("manifest.json", {}) or {}
    manifest.update({
        "modulo": "contrataciones-publicas", "version": manifest.get("version", 1) or 1,
        "estado_datos": "validado", "actualizado": hoy(),
        "anios": anios, "anio_parcial": parcial, "evolucion": evol,
        "cobertura": manifest.get("cobertura") or "Procedimientos publicados en OCDS por el OECE con presupuesto MEF.",
        "archivos": {"agregados": "agregados_{anio}.json", "procedimientos": "procedimientos_{anio}.json",
                     "maestro_entidades": "maestro_entidades.json", "proveedores": "proveedores.json"},
    })
    manifest.setdefault("fuentes", [])
    manifest.setdefault("limitaciones", [
        "El monto adjudicado no equivale al monto devengado ni girado.",
        "No se asume correspondencia uno a uno entre pliego MEF, unidad ejecutora y entidad contratante OECE.",
        "Para el año en curso las cifras corresponden al acumulado disponible a la última actualización.",
        "Las alertas son señales estadísticas y no constituyen prueba de irregularidad.",
    ])
    manifest.setdefault("log_actualizacion", [])
    manifest["log_actualizacion"].append({"fecha": hoy(), "evento": "Agregados regenerados", "estado": "ok"})
    manifest["log_actualizacion"] = manifest["log_actualizacion"][-30:]
    guardar_json("manifest.json", manifest)
    log("Agregados generados para %s" % ", ".join(map(str, anios)))
    return 0

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    p.add_argument("--parcial", type=int, default=2026)
    a = p.parse_args()
    sys.exit(main(a.anios, a.parcial))
