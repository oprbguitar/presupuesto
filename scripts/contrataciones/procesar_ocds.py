# -*- coding: utf-8 -*-
"""Procesa paquetes OCDS del OECE y genera procedimientos_{anio}.json normalizados.

OCDS (Open Contracting Data Standard) organiza la información en "releases" agrupados
por "ocid" (identificador de contratación). Un mismo procedimiento pasa por etapas:
  planning -> tender (convocatoria) -> award (adjudicación) -> contract (contrato).

Este script aplana cada procedimiento a UNA fila con las etapas separadas, sin asumir
que una etapa equivale a otra (convocado != adjudicado != contratado != devengado).

Entrada:  scripts/contrataciones/_raw/oece_ocds_{anio}.json
Salida:   data/contrataciones/procedimientos_{anio}.json
Depende del catálogo maestro para asignar entidad_id/ubigeo (catalogo_entidades.py).
"""
import argparse, json, os, sys
from _comun import RAW_DIR, guardar_json, cargar_json, log, num, hoy

OBJ_MAP = {"goods": "Bienes", "services": "Servicios", "works": "Obras", "consultingServices": "Consultoría de obras"}

def _first(lst, default=None):
    return lst[0] if lst else default

def aplanar_release(rel, maestro_idx):
    """Convierte un release/compiledRelease OCDS en una fila de la tabla detallada."""
    tender = rel.get("tender") or {}
    awards = rel.get("awards") or []
    contracts = rel.get("contracts") or []
    buyer = rel.get("buyer") or {}
    parties = {p.get("id"): p for p in (rel.get("parties") or [])}

    award = _first(awards, {})
    supplier = _first(award.get("suppliers") or [], {})
    ruc = (supplier.get("identifier") or {}).get("id")
    contract = _first(contracts, {})

    ent = maestro_idx.get((buyer.get("name") or "").strip().upper()) or {}
    obj = OBJ_MAP.get(tender.get("mainProcurementCategory"), tender.get("mainProcurementCategory") or "")

    return {
        "codigo": rel.get("ocid") or tender.get("id"),
        "entidad_id": ent.get("id"),
        "entidad": buyer.get("name"),
        "ue": (tender.get("procuringEntity") or {}).get("name") or "",
        "descripcion": tender.get("title") or tender.get("description") or "",
        "objeto": obj,
        "categoria": (tender.get("classification") or {}).get("description") or obj,
        "tipo": tender.get("procurementMethodDetails") or tender.get("procurementMethod") or "",
        "estado": (award.get("status") or tender.get("status") or "").capitalize(),
        "proveedor": supplier.get("name"),
        "ruc": ruc,
        "sancionado": False,  # se completa cruzando con proveedores.json (catalogo_proveedores.py)
        "convocado": num((tender.get("value") or {}).get("amount")),
        "adjudicado": num((award.get("value") or {}).get("amount")),
        "contratado": num((contract.get("value") or {}).get("amount")),
        "f_convocatoria": (tender.get("tenderPeriod") or {}).get("startDate", "")[:10] or None,
        "f_adjudicacion": (award.get("date") or "")[:10] or None,
        "postores": tender.get("numberOfTenderers"),
        "regimen": (tender.get("legalBasis") or {}).get("description") or "",
        "nivel": ent.get("nivel") or "",
        "sector": ent.get("sector") or "",
        "departamento": ent.get("departamento") or "",
        "ubigeo": ent.get("ubigeo") or "",
        "cierre_anio": ((tender.get("tenderPeriod") or {}).get("startDate", "")[5:7] == "12"),
        "url": rel.get("url") or "",
    }

def cargar_maestro_idx():
    m = cargar_json("maestro_entidades.json", {"entidades": []})
    idx = {}
    for e in m.get("entidades", []):
        if e.get("nombre"):
            idx[e["nombre"].strip().upper()] = e
    return idx

def main(anios):
    maestro_idx = cargar_maestro_idx()
    ok = True
    for a in anios:
        raw = os.path.join(RAW_DIR, "oece_ocds_%s.json" % a)
        if not os.path.exists(raw):
            log("No existe %s; ejecute descargar_oece.py primero." % os.path.basename(raw), "warn")
            ok = False
            continue
        with open(raw, encoding="utf-8") as f:
            paquete = json.load(f)
        releases = paquete.get("releases") or paquete.get("records") or paquete
        if isinstance(releases, dict):
            releases = releases.get("releases", [])
        rows = []
        for rel in releases:
            r = rel.get("compiledRelease", rel) if isinstance(rel, dict) else rel
            try:
                rows.append(aplanar_release(r, maestro_idx))
            except Exception as e:  # noqa: BLE001
                log("Release omitido (%s) en %s: %s" % (r.get("ocid"), a, e), "warn")
        parcial = (a == max(anios))
        guardar_json("procedimientos_%s.json" % a, {
            "anio": a, "parcial": parcial, "actualizado": hoy(), "estado_datos": "validado",
            "fuente": {"nombre": "OECE/SEACE — Contrataciones abiertas (OCDS)",
                       "url": "https://contratacionesabiertas.oece.gob.pe/",
                       "cobertura": "Procedimientos publicados en OCDS",
                       "metodologia": "Aplanado de releases OCDS a una fila por procedimiento."},
            "rows": rows,
        }, optimizado=True)
        log("Procesados %d procedimientos OCDS de %s" % (len(rows), a))
    return 0 if ok else 2

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    sys.exit(main(p.parse_args().anios))
