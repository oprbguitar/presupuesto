# DESIGN.md — Presupuesto Perú (v4, noviembre 2026)

## 1. Intención
- **Modo de superficie:** explore (con zonas de lectura en «Leyes»).
- **Usuario principal:** ciudadanía, periodistas y servidores públicos que quieren saber cuánto y en qué gasta el Estado.
- **Tarea principal:** ver el avance 2026 al día, entender las leyes que ampliaron el presupuesto y bajar al detalle de una entidad.
- **Decisiones que el usuario toma aquí:** a qué entidad pedir cuentas, qué programa o ley revisar, qué cifra verificar en la fuente.
- **Densidad objetivo:** media-alta. Lienzo ancho (hasta 1 760 px + riel), listas largas encapsuladas en microlistados con scroll interno.

## 2. Dirección visual
- **Arquetipo:** riel de navegación persistente + lienzo amplio en rejilla de 12 columnas (selector: «buscador con facetas», adaptado: las facetas son las secciones del riel y los filtros de cada vista).
- **Tipografía:** IBM Plex Sans (display y cuerpo) / IBM Plex Mono (todas las cifras, tabulares).
- **Paleta:** identidad existente blanco · rojo · negro · amarillo (pedido del usuario) sobre superficie arena `#f6f4ef`; índigo `#3b5bdb` solo para enlaces, foco e información. Desviación del selector (arena + índigo): se conserva la identidad que el usuario fijó.
- **Geometría:** suave, radio 5 px; sin sombras salvo capas flotantes (modal, buscador).
- **Motion:** 220 ms de entrada de vista y anchos de barra; desactivado con `prefers-reduced-motion`.
- **Por qué encaja:** cifras públicas que deben compararse; la mono tabular alinea montos y la paleta patria identifica el tema sin decorar.
- **Cambios a propósito vs. v3:** se quitó el contenedor de 1 180 px que dejaba márgenes vacíos; tarjetas KPI convertidas en tiras de cifras; pills redondeadas reemplazadas por segmentos y pestañas subrayadas; Segoe UI/system-ui sustituidas por Plex.

## 3. Tokens
Definidos en `css/styles.css` (`:root`): color (`--ink`, `--surface*`, `--line*`, `--accent*`, `--support*`, `--info*`, `--ok/warn/danger*`), tipografía (`--font-*`, `--fs-*`, `--lh-*`), espacio `--sp-1…8` (4–64 px), forma (`--radius` 5 px), motion (`--dur`, `--ease`), layout (`--rail-w`, `--canvas-max`, `--mlist-h`). Los módulos antiguos usan alias (`--rojo`, `--negro`…) que apuntan a los tokens nuevos.

## 4. Componentes
| Componente | Variantes | Estados |
|---|---|---|
| `.navbtn` (riel) | vertical ≥1100 px, pestañas horizontales <1100 px | hover, active, focus-visible, seleccionado |
| `.chip` / `.seg` | suelto, segmentado | hover, active, selected, disabled, focus-visible |
| `.kpi-grid`, `.stat-list` | tira de cifras con acento por color | — |
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
| 360 | una columna; riel como pestañas con scroll; filas `.hrow` en dos líneas; cifras a 1 rem |
| 768 | una columna en paneles, rejillas `auto-fit` de 2 columnas en filtros y cifras |
| 1280 | rejilla de 12 columnas con paneles 8/4 y 6/6; riel lateral fijo |
| 1600 | lienzo hasta 1 760 px, microlistados más altos (30 rem) |

## 7. Accesibilidad
- Texto `--ink` sobre `--surface` > 15:1; `--accent` sobre blanco ≈ 6:1; `--ink-mute` sobre blanco ≈ 5:1.
- Foco visible índigo de 2 px en todos los controles; filas clicables accesibles con teclado.
- `prefers-reduced-motion` anula transiciones y animación de entrada.

## 8. Anti-patrones prohibidos aquí
Degradados decorativos, sombras en tarjetas, cards anidadas, pills redondas, métricas sin fuente, paleta presentada como norma.

## 9. Auditoría
- `design-lint`: 7 / 20 — APROBADO (27-11-2026).
- Verificado en 375, 768, 1280 y 1600 px sin desbordamiento horizontal.
