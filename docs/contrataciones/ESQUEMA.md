# Contrato de datos — Contrataciones públicas

Todos los archivos viven en `data/contrataciones/` y se sirven por GitHub Pages. El front-end
los carga **bajo demanda** con `fetch` (primero `manifest.json`, luego el año seleccionado).

## `manifest.json`

```jsonc
{
  "modulo": "contrataciones-publicas",
  "version": 1,
  "estado_datos": "demostracion",        // "demostracion" | "validado"
  "actualizado": "2026-07-21",           // ISO; fecha de última actualización
  "cobertura": "…",
  "anios": [2023, 2024, 2025, 2026],
  "anio_parcial": 2026,                   // año mostrado como acumulado parcial
  "archivos": { "agregados": "agregados_{anio}.json", "procedimientos": "procedimientos_{anio}.json",
                "maestro_entidades": "maestro_entidades.json", "proveedores": "proveedores.json" },
  "evolucion": [ { "anio": 2024, "pim": 0, "convocado": 0, "adjudicado": 0, "contratado": 0, "dev": 0, "parcial": false } ],
  "fuentes": [ { "nombre": "…", "url": "https://…", "descripcion": "…" } ],
  "limitaciones": [ "…" ],
  "log_actualizacion": [ { "fecha": "2026-07-21", "evento": "…", "estado": "ok" } ]
}
```

## `agregados_{anio}.json`

```jsonc
{
  "anio": 2024, "parcial": false, "actualizado": "2026-07-21", "estado_datos": "validado",
  "fuente": { "nombre": "…", "url": "…", "cobertura": "…", "metodologia": "…" },
  "indicadores": {
    "pia": 0, "pim": 0, "dev": 0, "gir": 0,        // presupuesto (MEF) — null si no hay dato
    "pac_programado": 0,                            // Plan Anual de Contrataciones
    "convocado": 0, "adjudicado": 0, "contratado": 0,
    "n_procedimientos": 0, "n_oc": 0, "n_os": 0, "n_proveedores": 0,
    "cd_num": 0, "cd_monto": 0,                     // contrataciones directas
    "desiertos": 0, "anulados": 0
  },
  "distribucion_objeto":     [ { "objeto": "Bienes", "monto": 0, "n": 0 } ],
  "top_categorias":          [ { "categoria": "…", "monto": 0, "n": 0 } ],
  "top_proveedores":         [ { "proveedor": "…", "monto": 0, "n": 0 } ],
  "por_tipo_procedimiento":  [ { "tipo": "…", "monto": 0, "n": 0 } ],
  "comparacion_montos":      { "convocado": 0, "adjudicado": 0, "contratado": 0 },
  "embudo":                  [ { "etapa": "PIM", "monto": 0 } ],
  "por_departamento":        [ { "departamento": "Lima", "ubigeo": "15", "monto": 0, "n": 0 } ]
}
```

## `procedimientos_{anio}.json`

```jsonc
{
  "anio": 2024, "parcial": false, "actualizado": "2026-07-21", "estado_datos": "validado",
  "fuente": { "nombre": "…", "url": "…", "cobertura": "…", "metodologia": "…" },
  "rows": [ {
    "codigo": "…",           "entidad_id": "E-0001",  "entidad": "…",     "ue": "…",
    "descripcion": "…",      "objeto": "Bienes",      "categoria": "…",
    "tipo": "…",             "estado": "Adjudicado",  "proveedor": "…",   "ruc": "20…",
    "sancionado": false,
    "convocado": 0,          "adjudicado": 0,         "contratado": 0,     // etapas distintas; null si no aplica
    "f_convocatoria": "2024-05-10", "f_adjudicacion": "2024-06-02",
    "postores": 3,           "regimen": "…",
    "nivel": "Nacional",     "sector": "…",           "departamento": "Lima", "ubigeo": "150101",
    "cierre_anio": false,    "url": "https://…"
  } ]
}
```

`null` = dato no incorporado. Nunca se copian valores entre `adjudicado`, `contratado` y `dev`.

## `maestro_entidades.json` (tabla de normalización)

```jsonc
{
  "actualizado": "2026-07-21", "estado_datos": "validado",
  "nota": "No se asume correspondencia uno a uno entre pliego, unidad ejecutora y entidad contratante.",
  "entidades": [ {
    "id": "E-0001",          // id interno estable
    "nombre": "…",  "ruc": "20…",
    "cod_oece": "…",         // código de entidad contratante (OECE)
    "cod_pliego_mef": "…",   // pliego (MEF)
    "cod_ue_mef": "…",       // unidad ejecutora (MEF)
    "sector": "…", "nivel": "Nacional", "ubigeo": "150101", "departamento": "Lima"
  } ]
}
```

## `proveedores.json`

```jsonc
{
  "actualizado": "2026-07-21", "estado_datos": "validado",
  "proveedores": [ { "ruc": "20…", "nombre": "…", "sancionado": false, "sancion_detalle": "" } ]
}
```

## Reglas de validación (`validar.py`)

- `manifest.json` con `anios`, `evolucion`, `fuentes`, `limitaciones`.
- Cada año: `agregados_{anio}.json` y `procedimientos_{anio}.json` presentes y bien formados.
- Indicadores de presupuesto no negativos.
- `adjudicado` no debe ser idéntico a `dev` (salvaguarda contra copiar valores).
- Cada fila con los campos obligatorios de la tabla detallada.
