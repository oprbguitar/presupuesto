# Pipeline de datos — Contrataciones públicas

Scripts **independientes** que procesan las fuentes oficiales **fuera de línea** y generan
los JSON optimizados que consume el módulo web. El navegador **nunca** descarga bases completas.

## Principios

- Procesamiento offline → JSON separados por año / entidad / tipo de objeto.
- `null` = dato no incorporado (**no** significa cero).
- El **monto adjudicado no equivale al devengado ni al girado**; se guardan por separado.
- No se asume correspondencia 1:1 entre pliego (MEF), unidad ejecutora (MEF) y entidad contratante (OECE).
- Si la validación o la detección de cambios falla, **no se publica**.

## Requisitos

Python 3.9+ (solo biblioteca estándar). Opcionalmente `pip install -r requirements.txt`.

## Configuración

```bash
cp config.example.json config.json   # complete los endpoints oficiales vigentes
```

Coloque las descargas crudas en `_raw/` (ignorado por git):

| Archivo | Fuente | Columnas / formato |
|---|---|---|
| `oece_ocds_{anio}.json` | OECE/SEACE | Paquete OCDS (`releases`/`records`) |
| `mef_ejecucion_{anio}.csv` | MEF Consulta Amigable | `pliego,ue,pia,pim,devengado,girado` |
| `perucompras_ordenes_{anio}.csv` | Perú Compras | `tipo_orden,entidad,ruc_proveedor,proveedor,descripcion,monto,fecha,ubigeo` |
| `oece_entidades.csv` | Padrón OECE | `ruc,nombre,cod_oece,ubigeo,departamento` |
| `mef_pliegos.csv` | Clasificador MEF | `ruc,pliego,unidad_ejecutora,sector,nivel` |
| `sanciones.csv` | OECE/Contraloría | `ruc,detalle,vigente` |

## Orden de ejecución

```bash
python descargar_oece.py      --anios 2023 2024 2025 2026
python descargar_mef.py       --anios 2023 2024 2025 2026
python detectar_cambios.py            # bloquea si cambia el esquema de una fuente
python catalogo_entidades.py          # tabla maestra de normalización
python procesar_ocds.py       --anios 2023 2024 2025 2026
python perucompras_ordenes.py --anios 2023 2024 2025 2026
python catalogo_proveedores.py --anios 2023 2024 2025 2026
python generar_agregados.py   --anios 2023 2024 2025 2026 --parcial 2026
python validar.py                     # bloquea la publicación si falla
```

En CI lo ejecuta `.github/workflows/contrataciones.yml`.

## Salidas (en `data/contrataciones/`)

- `manifest.json` — años, evolución, fuentes, limitaciones y log de actualización.
- `agregados_{anio}.json` — KPIs, distribuciones, tops, embudo y mapa por departamento.
- `procedimientos_{anio}.json` — filas de la tabla detallada (una por procedimiento).
- `maestro_entidades.json` — tabla maestra de normalización.
- `proveedores.json` — catálogo de proveedores y marca de sancionados.

Ver el contrato completo en [`../../docs/contrataciones/ESQUEMA.md`](../../docs/contrataciones/ESQUEMA.md).

## Datos de demostración

La versión inicial incluye datos de **demostración** (`estado_datos: "demostracion"`) para validar
la interfaz. Al conectar las fuentes reales, el pipeline los reemplaza y marca `estado_datos: "validado"`.
