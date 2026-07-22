# -*- coding: utf-8 -*-
"""Ingesta REAL de órdenes de Perú Compras (Catálogos Electrónicos) desde Datos Abiertos.

Fuente oficial (directa, CSV mensual):
  - Órdenes de compra (bienes):    dataset OECE/Perú Compras en datosabiertos.gob.pe
  - Órdenes de servicio (servicios): idem
Los recursos se resuelven dinámicamente vía la API CKAN (robusto ante cambios de nombre).

Cobertura: Catálogos Electrónicos / Acuerdos Marco de Perú Compras. Es un subconjunto real
y bien definido de la contratación pública (no incluye licitaciones SEACE, que el OECE
publica solo vía Pentaho BI, sin CSV directo).

Genera, con la MISMA estructura del módulo:
  data/contrataciones/agregados_{anio}.json, procedimientos_{anio}.json,
  maestro_entidades.json, proveedores.json, manifest.json

Streaming: nunca mantiene en memoria todas las filas; solo agregados + top-N para la tabla.
"""
import argparse, csv, io, json, re, sys, heapq, urllib.request, urllib.parse, datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
try:
    from _comun import guardar_json, log, hoy, DATA_DIR
except Exception:
    import os
    DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "contrataciones"))
    os.makedirs(DATA_DIR, exist_ok=True)
    def hoy(): return datetime.date.today().isoformat()
    def log(m, e="ok", extra=None): print("[%s] %s" % (e.upper(), m))
    def guardar_json(nombre, obj, indent=1, optimizado=False):
        import os
        with open(os.path.join(DATA_DIR, nombre), "w", encoding="utf-8") as f:
            if optimizado: json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
            else: json.dump(obj, f, ensure_ascii=False, indent=indent)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36"}
CKAN = "https://www.datosabiertos.gob.pe/api/3/action/"
TOP_FILAS = 4000  # órdenes más grandes por año que se guardan para la tabla detallada

def ckan(action, **params):
    q = "&".join("%s=%s" % (k, urllib.parse.quote(str(v))) for k, v in params.items())
    req = urllib.request.Request(CKAN + action + ("?" + q if q else ""), headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=120))["result"]

def resolver_recursos(substr):
    names = ckan("package_list")
    m = [n for n in names if substr.lower() in n.lower()]
    if not m:
        return []
    pkg = ckan("package_show", id=m[0])
    pkg = pkg[0] if isinstance(pkg, list) else pkg
    out = []
    for x in pkg.get("resources", []):
        if (x.get("format") or "").lower() != "csv":
            continue
        ym = re.search(r"(20\d{2})(\d{2})", (x.get("url") or "") + (x.get("name") or ""))
        if ym:
            out.append((int(ym.group(1)), int(ym.group(2)), x["url"]))
    return out

def descargar_texto(url):
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1", "replace")

def parse_monto(v):
    if not v:
        return None
    v = str(v).strip().replace(" ", "")
    if v.count(",") and v.count("."):
        v = v.replace(".", "").replace(",", ".") if v.rfind(",") > v.rfind(".") else v.replace(",", "")
    elif v.count(","):
        v = v.replace(",", ".")
    try:
        return round(float(v), 2)
    except ValueError:
        return None

def nivel_de(nombre):
    n = (nombre or "").upper()
    if "GOBIERNO REGIONAL" in n or n.startswith("REGION "):
        return "Regional"
    if "MUNICIPALIDAD" in n:
        return "Local"
    return "Nacional"

# --- Atribución geográfica (departamento) por nombre/ámbito de la entidad ---
import unicodedata
def _norm(s):
    s = unicodedata.normalize("NFD", (s or "").upper())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")

DEPARTAMENTOS = ["AMAZONAS", "ANCASH", "APURIMAC", "AREQUIPA", "AYACUCHO", "CAJAMARCA",
                 "CALLAO", "CUSCO", "HUANCAVELICA", "HUANUCO", "ICA", "JUNIN", "LA LIBERTAD",
                 "LAMBAYEQUE", "LIMA", "LORETO", "MADRE DE DIOS", "MOQUEGUA", "PASCO",
                 "PIURA", "PUNO", "SAN MARTIN", "TACNA", "TUMBES", "UCAYALI"]
# Sinónimos frecuentes (capital / provincia notable / variantes) -> departamento
SINONIMOS = {
    "CUZCO": "CUSCO", "TRUJILLO": "LA LIBERTAD", "CHICLAYO": "LAMBAYEQUE",
    "IQUITOS": "LORETO", "MAYNAS": "LORETO", "HUARAZ": "ANCASH", "CHIMBOTE": "ANCASH",
    "SANTA": "ANCASH", "HUANCAYO": "JUNIN", "PUCALLPA": "UCAYALI", "CORONEL PORTILLO": "UCAYALI",
    "TARAPOTO": "SAN MARTIN", "MOYOBAMBA": "SAN MARTIN", "ABANCAY": "APURIMAC",
    "CHACHAPOYAS": "AMAZONAS", "PUERTO MALDONADO": "MADRE DE DIOS", "TAMBOPATA": "MADRE DE DIOS",
    "CERRO DE PASCO": "PASCO", "HUAMANGA": "AYACUCHO", "MARISCAL NIETO": "MOQUEGUA",
    "CALLAO CALLAO": "CALLAO", "METROPOLITANA DE LIMA": "LIMA",
}

def departamento_de(nombre):
    n = _norm(nombre)
    # coincidencia directa con nombre de departamento
    for d in sorted(DEPARTAMENTOS, key=len, reverse=True):
        if d in n:
            return d
    for k, d in SINONIMOS.items():
        if k in n:
            return d
    return None  # no determinado (p. ej. muchas entidades nacionales sin ámbito geográfico)

def col(row, *claves):
    for k in claves:
        for kk in row:
            if kk and kk.strip().upper() == k.upper():
                return row[kk]
    return None

class Agg:
    def __init__(self):
        self.n = 0
        self.total = 0.0
        self.n_oc = 0
        self.n_os = 0
        self.anulados = 0
        self.provs = {}
        self.ents = {}     # ruc -> {nombre, nivel, monto, n}
        self.cats = {}
        self.tipos = {}
        self.deps = {}     # DEPARTAMENTO -> [monto, n]
        self.obj = {"Bienes": [0.0, 0], "Servicios": [0.0, 0]}
        self.heap = []     # (monto, contador, fila)
        self._c = 0

def procesar_mes(url, objeto, agg, anio):
    txt = descargar_texto(url)
    rd = csv.DictReader(io.StringIO(txt), delimiter=";")
    for row in rd:
        monto = parse_monto(col(row, "TOTAL"))
        if monto is None:
            monto = parse_monto(col(row, "MONTO_TOTAL", "SUB_TOTAL"))
        ent = (col(row, "ENTIDAD") or "").strip()
        ruc_ent = (col(row, "RUC_ENTIDAD") or "").strip()
        prov = (col(row, "PROVEEDOR") or "").strip()
        ruc_prov = (col(row, "RUC_PROVEEDOR") or "").strip()
        tipo = (col(row, "TIPO_PROCEDIMIENTO") or "Catálogo Electrónico").strip()
        cat = (col(row, "ACUERDO_MARCO") or "Catálogo Electrónico").strip()
        estado_desc = (col(row, "DESCRIPCIÓN_ESTADO", "ESTADO_ORDEN_ELECTRÓNICA", "ESTADO_ORDEN") or "").strip()
        orden = (col(row, "ORDEN_ELECTRÓNICA", "ORDEN_ELECTRONICA") or "").strip()
        link = (col(row, "ORDEN_ELECTRÓNICA_GENERADA", "ORDEN_DIGITALIZADA") or "").strip()
        fecha = (col(row, "FECHA_PROCESO", "FECHA_FORMALIZACIÓN") or "").strip()

        agg.n += 1
        m = monto or 0.0
        agg.total += m
        if objeto == "Bienes":
            agg.n_oc += 1
        else:
            agg.n_os += 1
        if re.search(r"ANULAD|RECHAZ|DESIERT", estado_desc, re.I):
            agg.anulados += 1
        agg.obj[objeto][0] += m
        agg.obj[objeto][1] += 1
        if ruc_prov:
            p = agg.provs.setdefault(ruc_prov, {"nombre": prov, "monto": 0.0, "n": 0})
            p["monto"] += m
            p["n"] += 1
        if ruc_ent:
            e = agg.ents.setdefault(ruc_ent, {"nombre": ent, "nivel": nivel_de(ent), "monto": 0.0, "n": 0,
                                              "bienes": 0.0, "servicios": 0.0})
            e["monto"] += m
            e["n"] += 1
            e["bienes" if objeto == "Bienes" else "servicios"] += m
        agg.cats[cat] = agg.cats.get(cat, [0.0, 0]); agg.cats[cat][0] += m; agg.cats[cat][1] += 1
        agg.tipos[tipo] = agg.tipos.get(tipo, [0.0, 0]); agg.tipos[tipo][0] += m; agg.tipos[tipo][1] += 1
        dep = departamento_de(ent)
        if dep:
            agg.deps[dep] = agg.deps.get(dep, [0.0, 0]); agg.deps[dep][0] += m; agg.deps[dep][1] += 1

        agg._c += 1
        fila = {
            "codigo": orden or ("PC-%s-%d" % (anio, agg._c)),
            "ruc_ent": ruc_ent, "entidad": ent, "objeto": objeto, "categoria": cat,
            "tipo": tipo, "estado": estado_desc or "Aceptada", "proveedor": prov, "ruc": ruc_prov,
            "monto": monto, "fecha": fecha, "departamento": dep or "", "url": link if link.startswith("http") else "",
        }
        item = (m, agg._c, fila)
        if len(agg.heap) < TOP_FILAS:
            heapq.heappush(agg.heap, item)
        elif m > agg.heap[0][0]:
            heapq.heapreplace(agg.heap, item)

def fecha_iso(f):
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", f or "")
    if m:
        return "%s-%02d-%02d" % (m.group(3), int(m.group(2)), int(m.group(1)))
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", f or "")
    return m.group(0) if m else None

def construir(anio, agg, parcial, ent_ids):
    def topd(d, n):
        return sorted(({"k": k, "monto": round(v[0], 2), "n": v[1]} for k, v in d.items()), key=lambda x: -x["monto"])[:n]
    top_cat = topd(agg.cats, 15)
    top_tipo = topd(agg.tipos, 30)
    top_prov = sorted(({"proveedor": v["nombre"], "ruc": k, "monto": round(v["monto"], 2), "n": v["n"]}
                       for k, v in agg.provs.items()), key=lambda x: -x["monto"])[:25]
    por_ent = sorted(({"id": ent_ids.get(k), "entidad": v["nombre"], "ruc": k, "nivel": v["nivel"],
                       "sector": "", "convocado": round(v["monto"], 2), "adjudicado": round(v["monto"], 2),
                       "contratado": round(v["monto"], 2), "bienes": round(v["bienes"], 2),
                       "servicios": round(v["servicios"], 2), "n": v["n"]}
                      for k, v in agg.ents.items()), key=lambda x: -x["adjudicado"])
    dist = [{"objeto": o, "monto": round(agg.obj[o][0], 2), "n": agg.obj[o][1]} for o in ("Bienes", "Servicios")]
    total = round(agg.total, 2)

    agregados = {
        "anio": anio, "parcial": parcial, "actualizado": hoy(), "estado_datos": "validado",
        "fuente": {"nombre": "Perú Compras — Órdenes por Catálogos Electrónicos (Datos Abiertos del Estado)",
                   "url": "https://www.datosabiertos.gob.pe/group/organismo-especializado-para-las-contrataciones-p%C3%BAblicas-eficientes-oece",
                   "cobertura": "Órdenes de compra (bienes) y de servicio formalizadas por Catálogos Electrónicos / Acuerdos Marco.",
                   "metodologia": "Suma del importe TOTAL (con IGV) de cada orden, agregada por entidad, objeto, categoría, tipo y proveedor."},
        "indicadores": {
            "pia": None, "pim": None, "dev": None, "gir": None, "pac_programado": None,
            "convocado": total, "adjudicado": total, "contratado": total,
            "n_procedimientos": agg.n, "n_oc": agg.n_oc, "n_os": agg.n_os,
            "n_proveedores": len(agg.provs), "cd_num": 0, "cd_monto": 0,
            "desiertos": 0, "anulados": agg.anulados,
        },
        "distribucion_objeto": dist,
        "top_categorias": [{"categoria": x["k"], "monto": x["monto"], "n": x["n"]} for x in top_cat],
        "top_proveedores": top_prov,
        "por_tipo_procedimiento": [{"tipo": x["k"], "monto": x["monto"], "n": x["n"]} for x in top_tipo],
        "comparacion_montos": {"convocado": total, "adjudicado": total, "contratado": total},
        "embudo": [{"etapa": "PIM", "monto": None}, {"etapa": "PAC programado", "monto": None},
                   {"etapa": "Convocado", "monto": total}, {"etapa": "Adjudicado", "monto": total},
                   {"etapa": "Contratado", "monto": total}, {"etapa": "Devengado", "monto": None}],
        "por_departamento": sorted(({"departamento": k.title(), "monto": round(v[0], 2), "n": v[1]}
                                     for k, v in agg.deps.items()), key=lambda x: -x["monto"]),
        "por_entidad": por_ent,
    }
    guardar_json("agregados_%s.json" % anio, agregados)

    filas = sorted(agg.heap, key=lambda t: -t[0])
    rows = []
    for _, _, f in filas:
        rows.append({
            "codigo": f["codigo"], "entidad_id": ent_ids.get(f["ruc_ent"]), "entidad": f["entidad"],
            "ue": "", "descripcion": (f["categoria"] or f["tipo"]),
            "objeto": f["objeto"], "categoria": f["categoria"], "tipo": f["tipo"],
            "estado": f["estado"], "proveedor": f["proveedor"], "ruc": f["ruc"], "sancionado": False,
            "convocado": f["monto"], "adjudicado": f["monto"], "contratado": f["monto"],
            "f_convocatoria": fecha_iso(f["fecha"]), "f_adjudicacion": fecha_iso(f["fecha"]),
            "postores": 1, "regimen": "Catálogo Electrónico (Perú Compras)",
            "nivel": nivel_de(f["entidad"]), "sector": "",
            "departamento": (f["departamento"] or "").title(), "ubigeo": "",
            "cierre_anio": (fecha_iso(f["fecha"]) or "")[5:7] == "12",
            "url": f["url"] or "https://www.gob.pe/perucompras",
        })
    guardar_json("procedimientos_%s.json" % anio, {
        "anio": anio, "parcial": parcial, "actualizado": hoy(), "estado_datos": "validado",
        "rows_tope": TOP_FILAS, "rows_total": agg.n,
        "fuente": agregados["fuente"], "rows": rows,
    }, optimizado=True)
    return agregados, {"anio": anio, "pim": None, "convocado": total, "adjudicado": total,
                       "contratado": total, "dev": None, "parcial": parcial}

def main(anios, parcial):
    log("Resolviendo recursos CSV de Perú Compras…")
    rec_bienes = resolver_recursos("órdenes-de-compra-realizadas")
    rec_serv = resolver_recursos("órdenes-de-servicios-realizadas")
    log("Bienes: %d meses | Servicios: %d meses" % (len(rec_bienes), len(rec_serv)))

    ent_global = {}   # ruc -> nombre (para ids estables)
    evol = []
    resumen_anios = {}
    for anio in anios:
        agg = Agg()
        meses = [(m, u, "Bienes") for (y, m, u) in rec_bienes if y == anio] + \
                [(m, u, "Servicios") for (y, m, u) in rec_serv if y == anio]
        meses.sort()
        if not meses:
            log("Sin recursos para %d; se omite." % anio, "warn")
            continue
        for i, (mes, url, objeto) in enumerate(meses, 1):
            try:
                procesar_mes(url, objeto, agg, anio)
                log("  %d: %s %02d (%d/%d) filas acum=%d" % (anio, objeto, mes, i, len(meses), agg.n))
            except Exception as e:  # noqa: BLE001
                log("  Fallo mes %02d %s de %d: %s" % (mes, objeto, anio, e), "warn")
        # ids de entidad
        for ruc, v in agg.ents.items():
            ent_global.setdefault(ruc, v["nombre"])
        resumen_anios[anio] = agg
    # ids estables E-#### ordenados por ruc
    ent_ids = {ruc: "E-%04d" % (i + 1) for i, ruc in enumerate(sorted(ent_global))}

    prov_global = {}
    for anio, agg in resumen_anios.items():
        _, e = construir(anio, agg, anio == parcial, ent_ids)
        evol.append(e)
        for ruc, v in agg.provs.items():
            prov_global.setdefault(ruc, v["nombre"])

    # Maestro de entidades (real, desde las órdenes)
    ents = []
    for ruc in sorted(ent_global):
        nombre = ent_global[ruc]
        dep = departamento_de(nombre)
        ents.append({"id": ent_ids[ruc], "nombre": nombre, "ruc": ruc, "cod_oece": None,
                     "cod_pliego_mef": None, "cod_ue_mef": None, "sector": "",
                     "nivel": nivel_de(nombre), "ubigeo": "", "departamento": (dep or "").title()})
    guardar_json("maestro_entidades.json", {
        "actualizado": hoy(), "estado_datos": "validado",
        "nota": "Entidades observadas en las órdenes de Perú Compras. No se asume correspondencia 1:1 con pliego/UE del MEF.",
        "entidades": ents})

    guardar_json("proveedores.json", {
        "actualizado": hoy(), "estado_datos": "validado",
        "proveedores": [{"ruc": r, "nombre": prov_global[r], "sancionado": False, "sancion_detalle": ""}
                        for r in sorted(prov_global)]})

    evol.sort(key=lambda x: x["anio"])
    manifest = {
        "modulo": "contrataciones-publicas", "version": 2, "estado_datos": "validado",
        "actualizado": hoy(),
        "cobertura": "Órdenes de compra (bienes) y de servicio por Catálogos Electrónicos de Perú Compras. "
                     "Subconjunto real de la contratación pública; no incluye licitaciones/adjudicaciones SEACE.",
        "anios": anios, "anio_parcial": parcial,
        "archivos": {"agregados": "agregados_{anio}.json", "procedimientos": "procedimientos_{anio}.json",
                     "maestro_entidades": "maestro_entidades.json", "proveedores": "proveedores.json",
                     "geo_departamentos": "peru_departamentos.json"},
        "geo_nota": "Departamento atribuido por el nombre/ámbito de la entidad contratante (sede aproximada). "
                    "Las entidades nacionales sin ámbito geográfico no se atribuyen a ningún departamento.",
        "evolucion": evol,
        "fuentes": [
            {"nombre": "Perú Compras — Órdenes por Catálogos Electrónicos (bienes y servicios)",
             "url": "https://www.datosabiertos.gob.pe/group/organismo-especializado-para-las-contrataciones-p%C3%BAblicas-eficientes-oece",
             "descripcion": "Órdenes formalizadas mediante Acuerdos Marco. CSV mensual oficial."},
            {"nombre": "OECE/SEACE — Adjudicaciones y contratos (Pentaho BI)",
             "url": "https://bi.seace.gob.pe/", "descripcion": "Licitaciones y adjudicaciones SEACE (integración futura)."},
            {"nombre": "MEF — Consulta Amigable", "url": "https://apps5.mineco.gob.pe/transparencia/Navegador/default.aspx",
             "descripcion": "PIA, PIM, devengado y girado (integración futura para el embudo presupuestal)."},
            {"nombre": "Datos Abiertos del Estado Peruano", "url": "https://www.datosabiertos.gob.pe/",
             "descripcion": "Portal CKAN que sirve los CSV oficiales usados por este módulo."},
        ],
        "limitaciones": [
            "Cobertura: solo Catálogos Electrónicos / Acuerdos Marco de Perú Compras (no toda la contratación pública).",
            "El importe mostrado es el TOTAL de la orden (con IGV); no equivale al devengado ni al girado del MEF.",
            "La tabla detallada muestra las %d órdenes de mayor monto por año; los agregados usan el universo completo." % TOP_FILAS,
            "No hay dato geográfico (departamento) en esta fuente; el mapa se mostrará al integrar SEACE.",
            "El año en curso corresponde al acumulado disponible hasta la última fecha de actualización.",
            "Las alertas son señales estadísticas y no constituyen prueba de irregularidad.",
        ],
        "log_actualizacion": [{"fecha": hoy(), "evento": "Ingesta real Perú Compras (%s)" % ", ".join(map(str, anios)), "estado": "ok"}],
    }
    guardar_json("manifest.json", manifest)
    log("LISTO. Entidades: %d | Proveedores: %d | Años: %s" % (len(ents), len(prov_global), anios))
    for e in evol:
        log("  %s: total=%.0f" % (e["anio"], e["convocado"] or 0))
    return 0

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--anios", nargs="+", type=int, default=[2023, 2024, 2025, 2026])
    p.add_argument("--parcial", type=int, default=2026)
    a = p.parse_args()
    sys.exit(main(a.anios, a.parcial))
