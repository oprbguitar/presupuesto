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

## Estado actual

Se publica con datos de **demostración** (`estado_datos: "demostracion"`) para validar la interfaz.
La lógica de presupuesto no se modifica hasta que los datos reales estén validados. Al conectar las
fuentes oficiales mediante el pipeline, el estado pasa a `validado`.

## Desarrollo local

El módulo usa `fetch`, que no funciona con `file://`. Levante un servidor:

```bash
python -m http.server 8765
```

y abra <http://localhost:8765>.
