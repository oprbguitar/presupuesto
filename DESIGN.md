# DESIGN.md — Presupuesto Perú (v4.1, noviembre 2026)

## 1. Intención
- **Modo de superficie:** explore (con zonas de lectura en «Leyes»).
- **Usuario principal:** ciudadanía, periodistas y servidores públicos que quieren saber cuánto y en qué gasta el Estado.
- **Tarea principal:** ver el avance 2026 al día, entender las leyes que ampliaron el presupuesto y bajar al detalle de una entidad.
- **Decisiones que el usuario toma aquí:** a qué entidad pedir cuentas, qué programa o ley revisar, qué cifra verificar en la fuente.
- **Densidad objetivo:** media-alta. Lienzo ancho (hasta 1 760 px + riel), listas largas encapsuladas en microlistados con scroll interno.

## 2. Dirección visual
- **Arquetipo:** navegación en el encabezado (como la v3, preferida por el usuario) + lienzo amplio hasta 1 760 px. Los paneles se acomodan solos en mosaico por columnas (`.flow`), en pares de igual altura (`.pair`) o en pilas de tablas (`.stack`), para no dejar huecos en blanco. v4.0 usó un riel lateral; el usuario pidió volver al encabezado.
- **Tipografía:** IBM Plex Sans (display y cuerpo) / IBM Plex Mono (todas las cifras, tabulares).
- **Paleta:** identidad existente blanco · rojo · negro · amarillo (pedido del usuario) sobre superficie arena `#f6f4ef`; índigo `#3b5bdb` solo para enlaces, foco e información. Desviación del selector (arena + índigo): se conserva la identidad que el usuario fijó.
- **Geometría:** suave, radio 5 px; sin sombras salvo capas flotantes (modal, buscador).
- **Motion:** 220 ms de entrada de vista y anchos de barra; desactivado con `prefers-reduced-motion`.
- **Por qué encaja:** cifras públicas que deben compararse; la mono tabular alinea montos y la paleta patria identifica el tema sin decorar.
- **Cambios a propósito vs. v3:** se quitó el contenedor de 1 180 px que dejaba márgenes vacíos; tarjetas de cifras con color por concepto (presupuesto en tinta, vigente en índigo, gastado en verde, avance en amarillo, saldo en rojo) y una frase en lenguaje sencillo; paneles con tono por tema; Segoe UI/system-ui sustituidas por Plex.
- **Lenguaje:** cada panel lleva una línea `.explain` que dice qué significa la cifra sin jerga (PIA, PIM, devengado, crédito suplementario, programa 0068, PAC, adjudicado).

## 3. Tokens
Definidos en `css/styles.css` (`:root`): color (`--ink`, `--surface*`, `--line*`, `--accent*`, `--support*`, `--info*`, `--ok/warn/danger*`), tipografía (`--font-*`, `--fs-*`, `--lh-*`), espacio `--sp-1…8` (4–64 px), forma (`--radius` 5 px), motion (`--dur`, `--ease`), layout (`--rail-w`, `--canvas-max`, `--mlist-h`). Los módulos antiguos usan alias (`--rojo`, `--negro`…) que apuntan a los tokens nuevos.

## 4. Componentes
| Componente | Variantes | Estados |
|---|---|---|
| `.navbtn` (encabezado) | botones sobre fondo tinta; fila con scroll horizontal <1100 px | hover, active, focus-visible, seleccionado |
| `.flow` / `.pair` / `.stack` | mosaico, par de igual altura, pila de tablas | — |
| `.card.tone-*` | red, amber, ok, info, ink | — |
| `.chip` / `.seg` | suelto, segmentado | hover, active, selected, disabled, focus-visible |
| `.kpi-grid`, `.stat-list` | tarjetas de color con explicación; cifras con salto de línea seguro | — |
| `.hrow` | fila nombre + barra + valor; clicable | hover, focus-visible (Enter/Espacio) |
| `.mlist` | normal, `.short`, `.tall`; pie «Ver todo / Contraer» | scroll interno, abierto |
| `.law` | ficha de norma: cabecera, destinos, plazos, fuentes | vigente / en trámite |
| `.timeline` | hitos hechos, hoy, próximos | — |
| `table.t` | cabecera fija dentro del microlistado; filas expandibles | hover, clicable |

## 5. Datos y gráficos
- Barras mensuales + línea de avance acumulado vs. PIM y línea de ritmo lineal: muestra si el gasto va atrasado frente al calendario.
- Barra apilada PIA → Ley 32732 → Ley 32744 → otras modificaciones: explica por qué el PIM supera al PIA.
- Barras horizontales de avance con semáforo (≥85 % verde, 70–85 % amarillo, <70 % rojo) y el porcentaje siempre escrito: no depende solo del color.

## 6. Responsive
| Breakpoint | Cambio estructural |
|---|---|
| 360 | una columna; menú con scroll horizontal; filas `.hrow` en dos líneas; cifras a 1 rem |
| 768 | una columna en paneles, rejillas `auto-fit` de 2 columnas en filtros y cifras |
| 1280 | mosaico de 2–3 columnas; menú en una sola fila |
| 1600 | lienzo hasta 1 760 px, microlistados más altos (30 rem) |

## 7. Accesibilidad
- Texto `--ink` sobre `--surface` > 15:1; `--accent` sobre blanco ≈ 6:1; `--ink-mute` sobre blanco ≈ 5:1.
- Foco visible índigo de 2 px en todos los controles; filas clicables accesibles con teclado.
- `prefers-reduced-motion` anula transiciones y animación de entrada.

## 8. Anti-patrones prohibidos aquí
Degradados decorativos, sombras en tarjetas, cards anidadas, pills redondas, métricas sin fuente, paleta presentada como norma.

## 9. Auditoría
- `design-lint`: APROBADO (27-11-2026, v4.1).
- Verificado en 375, 768, 1280 y 1600 px sin desbordamiento horizontal.
