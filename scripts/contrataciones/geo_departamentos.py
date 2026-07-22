# -*- coding: utf-8 -*-
"""Genera data/contrataciones/peru_departamentos.json: paths SVG de los 25 departamentos.

Convierte un GeoJSON público (dominio de la comunidad) a paths en un viewBox normalizado,
para dibujar un mapa coroplético sin dependencias externas ni tiles remotos.
Redondea coordenadas para minimizar el tamaño.
"""
import urllib.request, json, io, sys, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
UA = {"User-Agent": "Mozilla/5.0"}
SRC = "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_departamental_simple.geojson"
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "contrataciones", "peru_departamentos.json"))

W, H = 380.0, 560.0  # viewBox

def rings_of(geom):
    if geom["type"] == "Polygon":
        return geom["coordinates"]
    if geom["type"] == "MultiPolygon":
        out = []
        for poly in geom["coordinates"]:
            out.extend(poly)
        return out
    return []

def main():
    gj = json.load(urllib.request.urlopen(urllib.request.Request(SRC, headers=UA), timeout=90))
    feats = gj["features"]
    # límites geográficos globales
    minx = miny = 1e9; maxx = maxy = -1e9
    for f in feats:
        for ring in rings_of(f["geometry"]):
            for x, y in ring:
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)
    sx = W / (maxx - minx); sy = H / (maxy - miny)
    s = min(sx, sy)
    offx = (W - (maxx - minx) * s) / 2
    offy = (H - (maxy - miny) * s) / 2
    def px(x): return round(offx + (x - minx) * s, 1)
    def py(y): return round(offy + (maxy - y) * s, 1)  # invertir Y (norte arriba)

    deps = {}
    for f in feats:
        nombre = f["properties"]["NOMBDEP"].strip().upper()
        path = []
        cxs = cys = 0.0; cn = 0
        for ring in rings_of(f["geometry"]):
            if len(ring) < 3:
                continue
            pts = []
            last = None
            for x, y in ring:
                p = (px(x), py(y))
                if p != last:
                    pts.append(p); last = p
                cxs += p[0]; cys += p[1]; cn += 1
            if len(pts) < 3:
                continue
            path.append("M" + " ".join("%s,%s" % (a, b) for a, b in pts) + "Z")
        deps[nombre] = {"d": "".join(path), "cx": round(cxs / cn, 1), "cy": round(cys / cn, 1)}

    obj = {"viewBox": "0 0 %d %d" % (int(W), int(H)), "fuente": SRC, "departamentos": deps}
    with open(OUT, "w", encoding="utf-8") as fp:
        json.dump(obj, fp, ensure_ascii=False, separators=(",", ":"))
    print("Escrito", OUT, os.path.getsize(OUT), "bytes,", len(deps), "departamentos")
    print("Ejemplos:", list(deps)[:5])

if __name__ == "__main__":
    main()
