# Módulo «Contrataciones públicas»

Módulo **desacoplado, documentado y reversible** que se añade al portal *Presupuesto Perú*
sin modificar la lógica de ejecución presupuestal existente.

## Qué hace

Permite consultar y analizar las contrataciones de las entidades públicas peruanas, vinculando
información de **OECE/SEACE (OCDS)**, **MEF**, **Perú Compras** y **Contraloría**. Diferencia con
claridad ocho niveles de información, que nunca se equiparan entre sí:

1. Presupuesto institucional (PIA, PIM)
2. Plan Anual de Contrataciones (PAC)
3. Procedimientos convocados
4. Procedimientos adjudicados
5. Contratos y órdenes
6. Ejecución presupuestal (devengado, girado)
7. Proveedores
8. Obras y consultorías

> **Regla central:** el monto adjudicado **no** equivale al monto devengado ni al girado.

## Cómo está integrado (desacople y reversibilidad)

El módulo se auto-inyecta desde `js/contrataciones.js` siguiendo el mismo patrón que el módulo
`ley32732`: agrega una pestaña al menú y crea su propia `<section>`, sin tocar `js/app.js`.

**Única modificación de archivos existentes** — dos líneas aditivas en `index.html`:

```html
<link rel="stylesheet" href="css/contrataciones.css?v=1">
...
<script src="js/contrataciones.js?v=1"></script>
```

### Revertir el módulo por completo

1. Eliminar esas dos líneas de `index.html`.
2. (Opcional) borrar `css/contrataciones.css`, `js/contrataciones.js`, `data/contrataciones/`,
   `scripts/contrataciones/` y `.github/workflows/contrataciones.yml`.

El portal vuelve exactamente a su estado anterior. No hay dependencias cruzadas con el presupuesto.

## Archivos del módulo

| Archivo | Rol |
|---|---|
| `css/contrataciones.css` | Estilos (prefijo `cx-`, reutiliza los tokens de `styles.css`) |
| `js/contrataciones.js` | Módulo IIFE: nav, vistas, filtros, KPIs, gráficos, tabla, alertas |
| `data/contrataciones/*.json` | Datos optimizados servidos por GitHub Pages |
| `scripts/contrataciones/*.py` | Pipeline de datos offline ([README](../../scripts/contrataciones/README.md)) |
| `.github/workflows/contrataciones.yml` | Automatización (descarga → validación → publicación) |

## Vistas

Resumen · Contrataciones por entidad · Bienes y servicios · Proveedores · Contrataciones
directas · Obras y consultorías · Alertas · Fuentes y metodología.

## Filtros

Año fiscal · Nivel de gobierno · Sector · Entidad · Unidad ejecutora · Departamento · Objeto
contractual · Tipo de procedimiento · Estado · Proveedor · RUC · Régimen legal · Palabra clave.

Años disponibles: 2023, 2024, 2025 y 2026. **2026** muestra siempre el *acumulado disponible*
hasta la última fecha de actualización.

## Alertas (señales estadísticas)

Contratación directa · un solo postor · alta concentración de proveedores · proveedor sancionado ·
desierto · nulo · brecha convocado–adjudicado · contratación al cierre del año · repetición de
órdenes similares · diferencias contratación vs. ejecución.

> Las alertas **no** constituyen prueba de irregularidad ni determinación de responsabilidad.

## Trazabilidad

Cada vista muestra fuente, año, cobertura, fecha de actualización, enlace de verificación y
metodología. Ver también [ESQUEMA.md](ESQUEMA.md) y [LIMITACIONES.md](LIMITACIONES.md).

## Estado actual — datos reales

El módulo se sirve con **datos reales** (`estado_datos: "validado"`) extraídos de la fuente oficial
**Perú Compras — Órdenes por Catálogos Electrónicos** (bienes y servicios), publicada en el portal
[Datos Abiertos del Estado](https://www.datosabiertos.gob.pe/) por el OECE. Los genera
`scripts/contrataciones/perucompras_real.py` (descarga los CSV mensuales, agrega en streaming y
produce los JSON del módulo).

**Cobertura:** Catálogos Electrónicos / Acuerdos Marco (un subconjunto real y bien definido). No
incluye licitaciones/adjudicaciones SEACE ni obras, que el OECE publica solo vía Pentaho BI
(`bi.seace.gob.pe`), sin CSV directo — integración prevista como siguiente fase. Los indicadores de
presupuesto (PIA/PIM/devengado/girado) se muestran como «—» hasta integrar el MEF.

La lógica de ejecución presupuestal del portal **no se modifica**.

## Desarrollo local

El módulo usa `fetch`, que no funciona con `file://`. Levante un servidor:

```bash
python -m http.server 8765
```

y abra <http://localhost:8765>.
