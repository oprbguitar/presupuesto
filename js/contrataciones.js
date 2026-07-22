/* Contrataciones públicas — módulo desacoplado para Presupuesto Perú.
   No modifica la lógica de ejecución presupuestal (js/app.js). Se auto-inyecta:
   agrega una pestaña al menú, crea su propia vista y carga JSON optimizados bajo demanda.
   Fuentes previstas: OECE/SEACE (OCDS), MEF (Consulta Amigable), Perú Compras, Contraloría.
   Reglas de lectura: el monto adjudicado NO equivale al devengado ni al girado.
   Las alertas son señales estadísticas, no prueba de irregularidad. */
(function () {
  "use strict";

  var BASE = "data/contrataciones/";
  var cache = {};        // archivo -> Promise(json)
  var manifest = null;   // manifest.json
  var maestro = null;    // maestro_entidades.json
  var provCat = null;    // proveedores.json
  var state = { year: null, tab: "resumen", filtros: {}, rows: [], agg: null };

  /* ---------------- utilidades ---------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var nf0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  function money(v) { return v == null || isNaN(v) ? "—" : "S/ " + nf0.format(Math.round(v)); }
  function moneyM(v) {
    if (v == null || isNaN(v)) return "—";
    if (Math.abs(v) >= 1e9) return "S/ " + nf1.format(v / 1e9) + " mil M";
    if (Math.abs(v) >= 1e6) return "S/ " + nf1.format(v / 1e6) + " M";
    return money(v);
  }
  function numf(v) { return v == null || isNaN(v) ? "—" : nf0.format(v); }
  function pct(v) { return v == null || isNaN(v) ? "—" : nf1.format(v) + " %"; }
  function isoDate(v) { if (!v) return "—"; var p = String(v).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : v; }
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }

  function fetchJSON(file) {
    if (cache[file]) return cache[file];
    cache[file] = fetch(BASE + file, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " en " + file);
      return r.json();
    });
    return cache[file];
  }

  /* ---------------- catálogos de referencia ---------------- */
  var TABS = [
    ["resumen", "Resumen"],
    ["entidad", "Contrataciones por entidad"],
    ["bienes", "Bienes y servicios"],
    ["proveedores", "Proveedores"],
    ["directas", "Contrataciones directas"],
    ["obras", "Obras y consultorías"],
    ["alertas", "Alertas"],
    ["fuentes", "Fuentes y metodología"]
  ];

  /* ---------------- inyección de navegación y vista ---------------- */
  function injectNav() {
    var nav = $(".topnav");
    if (!nav || $("#navContrat")) return;
    var b = document.createElement("button");
    b.className = "navbtn";
    b.id = "navContrat";
    b.type = "button";
    b.textContent = "Contrataciones públicas";
    var help = $("#btnAyuda", nav);
    nav.insertBefore(b, help || null);
    b.addEventListener("click", showView);
    // Al ir a cualquier vista del núcleo, ocultar la nuestra y desactivar el botón.
    $$(".navbtn[data-view]", nav).forEach(function (x) {
      x.addEventListener("click", function () {
        var v = $("#view-contrataciones");
        if (v) v.hidden = true;
        b.classList.remove("active");
        if (location.hash === "#contrataciones") history.replaceState(null, "", location.pathname + location.search);
      });
    });
  }

  function injectView() {
    var main = $("main.wrap");
    if (!main || $("#view-contrataciones")) return;
    var s = document.createElement("section");
    s.id = "view-contrataciones";
    s.className = "view cx-view";
    s.hidden = true;
    s.innerHTML =
      '<div class="card cx-hero">' +
        '<div>' +
          '<span class="cx-kicker">Módulo ciudadano de contrataciones · OECE/SEACE · MEF · Perú Compras</span>' +
          '<h2>Contrataciones públicas<span class="cx-beta" id="cxEstado">demostración</span></h2>' +
          '<p>Consulta y análisis de las contrataciones de las entidades públicas peruanas. ' +
          'El sistema diferencia presupuesto, Plan Anual de Contrataciones (PAC), convocatorias, ' +
          'adjudicaciones, contratos y ejecución presupuestal. ' +
          '<b>El monto adjudicado no equivale al monto devengado ni girado.</b></p>' +
        '</div>' +
        '<div class="cx-chips"><a class="cx-btn" id="cxVerificar" href="#" target="_blank" rel="noopener">Verificar en fuente ↗</a></div>' +
      '</div>' +
      '<div class="cx-aviso" id="cxAviso"></div>' +
      '<div class="cx-tabs" id="cxTabs" role="tablist"></div>' +
      '<div class="card" id="cxFiltrosCard">' +
        '<div class="cx-filtros" id="cxFiltros"></div>' +
        '<div class="cx-filtros-actions">' +
          '<button class="cx-btn primary" id="cxAplicar" type="button">Aplicar filtros</button>' +
          '<button class="cx-btn" id="cxLimpiar" type="button">Limpiar</button>' +
          '<span class="cx-count" id="cxFiltroInfo"></span>' +
        '</div>' +
      '</div>' +
      '<div id="cxContenido"><div class="cx-load">Cargando datos de contrataciones…</div></div>';
    main.appendChild(s);
  }

  function showView() {
    $$("main .view").forEach(function (v) { v.hidden = true; });
    $("#view-contrataciones").hidden = false;
    $$(".topnav .navbtn").forEach(function (x) { x.classList.toggle("active", x.id === "navContrat"); });
    history.replaceState(null, "", "#contrataciones");
    window.scrollTo({ top: 0, behavior: "smooth" });
    boot();
  }

  /* ---------------- arranque / carga de manifiesto ---------------- */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    Promise.all([fetchJSON("manifest.json"), fetchJSON("maestro_entidades.json").catch(function () { return null; }), fetchJSON("proveedores.json").catch(function () { return null; })])
      .then(function (res) {
        manifest = res[0]; maestro = res[1]; provCat = res[2];
        state.year = String(manifest.anio_parcial || (manifest.anios || [])[manifest.anios.length - 1] || 2024);
        renderShell();
        loadYear(state.year).then(function () { renderTab(); });
      })
      .catch(function (e) {
        $("#cxContenido").innerHTML = '<div class="card cx-empty">No se pudieron cargar los datos del módulo (' + esc(e.message) +
          ').<br>Los JSON se sirven desde <code>data/contrataciones/</code>. En un entorno local abre el sitio con un servidor web (no con file://).</div>';
      });
  }

  function loadYear(y) {
    return Promise.all([fetchJSON("agregados_" + y + ".json"), fetchJSON("procedimientos_" + y + ".json")])
      .then(function (r) {
        state.agg = r[0];
        state.rows = (r[1] && r[1].rows) || [];
        return true;
      });
  }

  /* ---------------- shell: aviso, tabs, filtros ---------------- */
  function renderShell() {
    var estado = (manifest.estado_datos === "validado") ? "validado" : "demostración";
    $("#cxEstado").textContent = estado;
    $("#cxEstado").style.background = manifest.estado_datos === "validado" ? "var(--verde)" : "var(--amarillo)";
    $("#cxEstado").style.color = manifest.estado_datos === "validado" ? "#fff" : "var(--negro)";

    var f0 = (manifest.fuentes && manifest.fuentes[0]) || {};
    var ver = $("#cxVerificar"); ver.href = f0.url || "#";

    $("#cxAviso").innerHTML = manifest.estado_datos === "validado" ?
      '<b>Trazabilidad:</b> datos oficiales procesados fuera de línea y validados. Actualizado el ' + esc(isoDate(manifest.actualizado)) + '. ' +
      'Las alertas son señales estadísticas y no constituyen prueba de irregularidad ni determinación de responsabilidad.' :
      '<b>Versión de demostración.</b> Las cifras de esta vista son ilustrativas y sirven para validar la interfaz ' +
      'antes de conectar las fuentes oficiales (OECE/SEACE, MEF, Perú Compras). No reemplazan a las fuentes oficiales. ' +
      'Las alertas son señales estadísticas, no prueba de irregularidad.';

    // tabs
    $("#cxTabs").innerHTML = TABS.map(function (t) {
      return '<button class="cx-tab' + (t[0] === state.tab ? " active" : "") + '" data-tab="' + t[0] + '" role="tab">' + esc(t[1]) + '</button>';
    }).join("");
    $$("#cxTabs .cx-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        state.tab = b.dataset.tab;
        $$("#cxTabs .cx-tab").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderTab();
      });
    });

    renderFiltros();
    $("#cxAplicar").addEventListener("click", function () { readFiltros(); renderTab(); });
    $("#cxLimpiar").addEventListener("click", function () {
      state.filtros = {}; renderFiltros();
      loadYear(state.year).then(function () { readFiltros(); renderTab(); });
    });
  }

  function opts(list, sel, all) {
    return '<option value="">' + esc(all || "Todos") + '</option>' + list.map(function (o) {
      var v = (typeof o === "object") ? o.v : o, l = (typeof o === "object") ? o.l : o;
      return '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? " selected" : "") + '>' + esc(l) + '</option>';
    }).join("");
  }
  function uniq(arr) { var s = {}; arr.forEach(function (x) { if (x) s[x] = 1; }); return Object.keys(s).sort(); }

  function renderFiltros() {
    var f = state.filtros;
    var ents = (maestro && maestro.entidades) || [];
    var sectores = uniq(ents.map(function (e) { return e.sector; }));
    var niveles = uniq(ents.map(function (e) { return e.nivel; }));
    var deptos = uniq(ents.map(function (e) { return e.departamento; }));
    var entOpts = ents.map(function (e) { return { v: e.id, l: e.nombre }; });
    var objetos = ["Bienes", "Servicios", "Obras", "Consultoría de obras"];
    var tipos = uniq(state.rows.map(function (r) { return r.tipo; }));
    var estados = uniq(state.rows.map(function (r) { return r.estado; }));
    var regimenes = uniq(state.rows.map(function (r) { return r.regimen; }));

    $("#cxFiltros").innerHTML =
      fsel("Año fiscal", "year", opts((manifest.anios || []).map(String), state.year, null), false) +
      fsel("Nivel de gobierno", "nivel", opts(niveles, f.nivel)) +
      fsel("Sector", "sector", opts(sectores, f.sector)) +
      fsel("Entidad", "entidad", opts(entOpts, f.entidad)) +
      finput("Unidad ejecutora", "ue", f.ue, "Ej.: 001") +
      fsel("Departamento", "departamento", opts(deptos, f.departamento)) +
      fsel("Objeto contractual", "objeto", opts(objetos, f.objeto)) +
      fsel("Tipo de procedimiento", "tipo", opts(tipos, f.tipo)) +
      fsel("Estado", "estado", opts(estados, f.estado)) +
      finput("Proveedor", "proveedor", f.proveedor, "Nombre o razón social") +
      finput("RUC", "ruc", f.ruc, "11 dígitos") +
      fsel("Régimen legal", "regimen", opts(regimenes, f.regimen)) +
      finput("Palabra clave", "q", f.q, "Descripción, código…");

    $("#cxFiltros [data-k=year]").addEventListener("change", function () {
      state.year = this.value; readFiltros();
      $("#cxContenido").innerHTML = '<div class="cx-load">Cargando ' + esc(state.year) + '…</div>';
      loadYear(state.year).then(function () { renderFiltros(); renderTab(); });
    });
  }
  function fsel(lbl, k, options, dummy) {
    return '<div class="cx-f"><label>' + esc(lbl) + '</label><select data-k="' + k + '">' + options + '</select></div>';
  }
  function finput(lbl, k, val, ph) {
    return '<div class="cx-f"><label>' + esc(lbl) + '</label><input data-k="' + k + '" value="' + esc(val || "") + '" placeholder="' + esc(ph || "") + '"></div>';
  }
  function readFiltros() {
    var f = {};
    $$("#cxFiltros [data-k]").forEach(function (el) {
      var k = el.dataset.k, v = (el.value || "").trim();
      if (k === "year") { state.year = v; return; }
      if (v) f[k] = v;
    });
    state.filtros = f;
  }

  /* ---------------- aplicación de filtros a las filas ---------------- */
  function filteredRows() {
    var f = state.filtros;
    return state.rows.filter(function (r) {
      if (f.nivel && r.nivel !== f.nivel) return false;
      if (f.sector && r.sector !== f.sector) return false;
      if (f.entidad && r.entidad_id !== f.entidad) return false;
      if (f.ue && String(r.ue || "").toLowerCase().indexOf(f.ue.toLowerCase()) < 0) return false;
      if (f.departamento && r.departamento !== f.departamento) return false;
      if (f.objeto && r.objeto !== f.objeto) return false;
      if (f.tipo && r.tipo !== f.tipo) return false;
      if (f.estado && r.estado !== f.estado) return false;
      if (f.regimen && r.regimen !== f.regimen) return false;
      if (f.proveedor && String(r.proveedor || "").toLowerCase().indexOf(f.proveedor.toLowerCase()) < 0) return false;
      if (f.ruc && String(r.ruc || "").indexOf(f.ruc) < 0) return false;
      if (f.q) {
        var hay = (r.codigo + " " + r.descripcion + " " + r.entidad + " " + r.categoria + " " + (r.proveedor || "")).toLowerCase();
        if (hay.indexOf(f.q.toLowerCase()) < 0) return false;
      }
      return true;
    });
  }
  function hasRowFilters() {
    return Object.keys(state.filtros).length > 0;
  }

  /* ---------------- cálculo de agregados desde filas (para filtros) ---------------- */
  function computeAgg(rows) {
    function s(key, cond) { return rows.reduce(function (a, r) { return a + ((cond ? cond(r) : true) && r[key] != null ? r[key] : 0); }, 0); }
    function c(cond) { var n = 0; rows.forEach(function (r) { if (cond(r)) n++; }); return n; }
    var provs = {}; rows.forEach(function (r) { if (r.ruc) provs[r.ruc] = 1; });
    var cd = rows.filter(function (r) { return r.tipo === "Contratación Directa"; });
    function grp(keyf, valf) {
      var d = {}; rows.forEach(function (r) {
        var k = keyf(r); if (k == null) return;
        var v = (valf ? r[valf] : null); if (v == null) v = r.adjudicado != null ? r.adjudicado : (r.convocado || 0);
        var g = d[k] || (d[k] = { monto: 0, n: 0 }); g.monto += v || 0; g.n++;
      });
      return Object.keys(d).map(function (k) { return { k: k, monto: d[k].monto, n: d[k].n }; }).sort(function (a, b) { return b.monto - a.monto; });
    }
    return {
      convocado: s("convocado"), adjudicado: s("adjudicado", function (r) { return r.adjudicado != null; }),
      contratado: s("contratado", function (r) { return r.contratado != null; }),
      n_procedimientos: rows.length,
      n_oc: c(function (r) { return r.objeto === "Bienes" && (r.estado === "Adjudicado" || r.estado === "Contratado"); }),
      n_os: c(function (r) { return r.objeto === "Servicios" && (r.estado === "Adjudicado" || r.estado === "Contratado"); }),
      n_proveedores: Object.keys(provs).length,
      cd_num: cd.length, cd_monto: cd.reduce(function (a, r) { return a + (r.adjudicado != null ? r.adjudicado : (r.convocado || 0)); }, 0),
      desiertos: c(function (r) { return r.estado === "Desierto"; }),
      anulados: c(function (r) { return r.estado === "Nulo"; }),
      grpObjeto: grp(function (r) { return r.objeto; }),
      grpCategoria: grp(function (r) { return r.categoria; }),
      grpProveedor: grp(function (r) { return r.proveedor || null; }),
      grpTipo: grp(function (r) { return r.tipo; }),
      grpDepto: grp(function (r) { return r.departamento; })
    };
  }

  /* ---------------- primitivas de gráfico (SVG, sin dependencias) ---------------- */
  function barChart(box, labels, series, unitFmt) {
    unitFmt = unitFmt || moneyM;
    var W = 560, H = 280, padL = 60, padB = 44, padT = 26, padR = 8;
    var max = 0;
    series.forEach(function (sr) { sr.values.forEach(function (v) { if (v != null && v > max) max = v; }); });
    if (!max) { box.innerHTML = '<p class="cx-empty">Sin datos suficientes.</p>'; return; }
    max *= 1.1;
    var iw = W - padL - padR, ih = H - padT - padB;
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">';
    for (var t = 0; t <= 4; t++) {
      var yv = max * t / 4, y = padT + ih - ih * t / 4;
      g += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#e6e6e6"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#777">' + esc(unitFmt(yv).replace("S/ ", "")) + '</text>';
    }
    var n = labels.length, gw = iw / n, bw = Math.min(30, gw / (series.length + 1));
    labels.forEach(function (lb, i) {
      var cx = padL + gw * i + gw / 2;
      g += '<text x="' + cx + '" y="' + (H - 24) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#333">' + esc(lb) + '</text>';
      series.forEach(function (sr, si) {
        var v = sr.values[i]; if (v == null) return;
        var bh = ih * v / max, x = cx - bw * series.length / 2 + si * bw;
        g += '<rect x="' + x + '" y="' + (padT + ih - bh) + '" width="' + (bw - 3) + '" height="' + bh + '" rx="2" fill="' + sr.color + '"><title>' + esc(sr.name + ' ' + lb + ': ' + money(v)) + '</title></rect>';
      });
    });
    var lx = padL;
    series.forEach(function (sr) {
      g += '<rect x="' + lx + '" y="6" width="10" height="10" rx="2" fill="' + sr.color + '"/><text x="' + (lx + 14) + '" y="15" font-size="11" fill="#333">' + esc(sr.name) + '</text>';
      lx += 14 + sr.name.length * 6.2 + 18;
    });
    g += '</svg>';
    box.innerHTML = g;
  }

  function donut(box, parts) {
    // parts = [{label, value, color}]
    var total = parts.reduce(function (a, p) { return a + (p.value || 0); }, 0);
    if (!total) { box.innerHTML = '<p class="cx-empty">Sin datos.</p>'; return; }
    var cx = 90, cy = 90, r = 70, rin = 40, ang = -Math.PI / 2;
    function pt(a, rad) { return (cx + rad * Math.cos(a)).toFixed(2) + " " + (cy + rad * Math.sin(a)).toFixed(2); }
    var g = '<svg viewBox="0 0 320 180" role="img">';
    var legend = "";
    parts.forEach(function (p, i) {
      var frac = p.value / total, a2 = ang + frac * Math.PI * 2, large = frac > 0.5 ? 1 : 0;
      g += '<path d="M ' + pt(ang, r) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + pt(a2, r) +
        ' L ' + pt(a2, rin) + ' A ' + rin + ' ' + rin + ' 0 ' + large + ' 0 ' + pt(ang, rin) + ' Z" fill="' + p.color + '"><title>' + esc(p.label + ': ' + money(p.value) + ' (' + nf1.format(frac * 100) + '%)') + '</title></path>';
      legend += '<div style="display:flex;align-items:center;gap:6px;font-size:.8rem;margin:2px 0"><span style="width:11px;height:11px;border-radius:2px;background:' + p.color + ';flex:none"></span>' +
        esc(p.label) + ' · <b>' + nf1.format(frac * 100) + '%</b></div>';
      ang = a2;
    });
    g += '<text x="90" y="86" text-anchor="middle" font-size="10" fill="#777">total</text>' +
      '<text x="90" y="102" text-anchor="middle" font-size="13" font-weight="800" fill="#141414">' + esc(moneyM(total).replace("S/ ", "")) + '</text></svg>';
    box.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1 1 200px">' + g + '</div><div style="flex:1 1 140px">' + legend + '</div></div>';
  }

  function hbars(box, items, fmt, colorf) {
    fmt = fmt || money;
    if (!items.length) { box.innerHTML = '<p class="cx-empty">Sin datos.</p>'; return; }
    var max = items[0].monto || 1;
    box.innerHTML = items.map(function (it) {
      var w = Math.max(2, (it.monto / max) * 100);
      var col = colorf ? colorf(it) : "var(--rojo)";
      return '<div class="cx-hbar"><span class="cx-hb-name" title="' + esc(it.k) + '">' + esc(it.k) + '</span>' +
        '<span class="cx-hb-track"><i style="width:' + w + '%;background:' + col + '"></i></span>' +
        '<span class="cx-hb-val">' + fmt(it.monto) + '</span></div>';
    }).join("");
  }

  function funnel(box, etapas) {
    var max = etapas.reduce(function (a, e) { return Math.max(a, e.monto || 0); }, 0) || 1;
    box.innerHTML = '<div class="cx-funnel">' + etapas.map(function (e) {
      var w = Math.max(3, (e.monto / max) * 100);
      return '<div class="cx-funnel-row"><span class="cx-fn-lbl">' + esc(e.etapa) + '</span>' +
        '<span class="cx-fn-bar"><i style="width:' + w + '%">' + (w > 22 ? esc(moneyM(e.monto)) : "") + '</i></span>' +
        '<span class="cx-fn-val">' + moneyM(e.monto) + '</span></div>';
    }).join("") + '</div>';
  }

  /* ---------------- ficha de trazabilidad ---------------- */
  function fichaFuente(agg) {
    var fu = (agg && agg.fuente) || {};
    var f0 = (manifest.fuentes && manifest.fuentes[0]) || {};
    return '<div class="cx-ficha"><b>Fuente:</b> ' + esc(fu.nombre || f0.nombre || "—") +
      ' · <b>Año:</b> ' + esc(agg.anio) + (agg.parcial ? ' (acumulado parcial)' : '') +
      ' · <b>Actualizado:</b> ' + esc(isoDate(agg.actualizado || manifest.actualizado)) +
      ' · <b>Cobertura:</b> ' + esc(fu.cobertura || manifest.cobertura || "—") +
      ' · <a href="' + esc(fu.url || f0.url || "#") + '" target="_blank" rel="noopener">verificar ↗</a></div>';
  }
  function partialNote() {
    return String(state.year) === String(manifest.anio_parcial) ?
      '<p class="cx-map-note">⏳ ' + esc(state.year) + ': cifras del <b>acumulado disponible</b> hasta la última fecha de actualización (' + esc(isoDate(manifest.actualizado)) + ').</p>' : '';
  }

  /* ---------------- KPIs ---------------- */
  function kpi(lbl, val, sub, cls) {
    return '<div class="cx-kpi ' + (cls || "") + '"><div class="cx-k-lbl">' + esc(lbl) + '</div>' +
      '<div class="cx-k-val" title="' + esc(val) + '">' + esc(val) + '</div>' +
      (sub ? '<div class="cx-k-sub">' + esc(sub) + '</div>' : '') + '</div>';
  }

  function kpisHTML(comp, budget, scope) {
    return '<div class="cx-kpis">' +
      kpi("PIA", moneyM(budget.pia), scope, "neg") +
      kpi("PIM", moneyM(budget.pim), scope, "neg") +
      kpi("Devengado", moneyM(budget.dev), "Ejecución presupuestal", "verde") +
      kpi("Girado", moneyM(budget.gir), "Pagos efectivos", "verde") +
      kpi("PAC programado", moneyM(budget.pac_programado), "Plan Anual de Contrataciones", "azul") +
      kpi("Monto convocado", moneyM(comp.convocado), comp.n_procedimientos + " procedimientos", "rojo") +
      kpi("Monto adjudicado", moneyM(comp.adjudicado), "≠ devengado", "amar") +
      kpi("Monto contratado", moneyM(comp.contratado), "Contratos/órdenes", "amar") +
      kpi("N.° procedimientos", numf(comp.n_procedimientos), null, "neg") +
      kpi("Órdenes de compra", numf(comp.n_oc), "Bienes adjudicados/contratados", "azul") +
      kpi("Órdenes de servicio", numf(comp.n_os), "Servicios adjudicados/contratados", "azul") +
      kpi("N.° proveedores", numf(comp.n_proveedores), null, "neg") +
      kpi("Contrataciones directas", numf(comp.cd_num), moneyM(comp.cd_monto), "amar") +
      kpi("Procedimientos desiertos", numf(comp.desiertos), null, "amar") +
      kpi("Procedimientos anulados", numf(comp.anulados), null, "amar") +
      '</div>';
  }

  /* ---------------- render por pestaña ---------------- */
  function renderTab() {
    if (!state.agg) return;
    var info = $("#cxFiltroInfo");
    var rows = filteredRows();
    if (info) info.textContent = hasRowFilters() ? (rows.length + " de " + state.rows.length + " procedimientos coinciden con los filtros") :
      (state.rows.length + " procedimientos en " + state.year);
    // La pestaña de fuentes no depende de filtros
    var box = $("#cxContenido");
    switch (state.tab) {
      case "resumen": return renderResumen(box, rows);
      case "entidad": return renderEntidad(box, rows);
      case "bienes": return renderBienes(box, rows);
      case "proveedores": return renderProveedores(box, rows);
      case "directas": return renderDirectas(box, rows);
      case "obras": return renderObras(box, rows);
      case "alertas": return renderAlertas(box, rows);
      case "fuentes": return renderFuentes(box);
    }
  }

  var C = { rojo: "#D91023", amar: "#FFC400", neg: "#141414", verde: "#1a7f37", azul: "#1f6feb", gris: "#8a8a8a", morado: "#7c3aed", teal: "#0d9488" };
  var OBJ_COLOR = { "Bienes": C.rojo, "Servicios": C.azul, "Obras": C.amar, "Consultoría de obras": C.teal };

  function renderResumen(box, rows) {
    var comp = hasRowFilters() ? computeAgg(rows) : precompToComp(state.agg);
    var ind = state.agg.indicadores;
    var budget = { pia: ind.pia, pim: ind.pim, dev: ind.dev, gir: ind.gir, pac_programado: ind.pac_programado };
    var scope = hasRowFilters() ? "Total del año (referencia)" : "Total del año";
    // embudo: mezcla presupuesto (año) con montos de contratación (filtrados)
    var embudo = [
      { etapa: "PIM", monto: budget.pim }, { etapa: "PAC programado", monto: budget.pac_programado },
      { etapa: "Convocado", monto: comp.convocado }, { etapa: "Adjudicado", monto: comp.adjudicado },
      { etapa: "Contratado", monto: comp.contratado }, { etapa: "Devengado", monto: budget.dev }
    ];
    var distObj = hasRowFilters() ? comp.grpObjeto.map(function (x) { return { objeto: x.k, monto: x.monto, n: x.n }; }) : state.agg.distribucion_objeto;
    var topCat = hasRowFilters() ? comp.grpCategoria.slice(0, 10) : (state.agg.top_categorias || []).map(function (x) { return { k: x.categoria, monto: x.monto }; });
    var topProv = hasRowFilters() ? comp.grpProveedor.slice(0, 10) : (state.agg.top_proveedores || []).map(function (x) { return { k: x.proveedor, monto: x.monto }; });
    var porTipo = hasRowFilters() ? comp.grpTipo : (state.agg.por_tipo_procedimiento || []).map(function (x) { return { k: x.tipo, monto: x.monto, n: x.n }; });

    box.innerHTML =
      '<div class="card">' + kpisHTML(comp, budget, scope) + fichaFuente(state.agg) + partialNote() + '</div>' +
      '<div class="cx-grid2">' +
        '<div class="card"><h3>Evolución anual 2023–2026 <button class="qmark" data-help-cx="1" title="Convocado, adjudicado y contratado por año">?</button></h3>' +
          '<div class="cx-chartbox" id="cxEvol"></div><p class="cx-map-note">El adjudicado no equivale al devengado. Ver ejecución presupuestal en el módulo principal.</p></div>' +
        '<div class="card"><h3>Distribución por objeto contractual</h3><div class="cx-chartbox" id="cxDonut"></div></div>' +
      '</div>' +
      '<div class="cx-grid2">' +
        '<div class="card"><h3>Embudo: del presupuesto al devengado</h3><div id="cxFunnel"></div>' +
          '<p class="cx-map-note">Cada etapa mide una cosa distinta; el estrechamiento no implica por sí solo ineficiencia.</p></div>' +
        '<div class="card"><h3>Comparación convocado · adjudicado · contratado</h3><div class="cx-chartbox" id="cxCmp"></div></div>' +
      '</div>' +
      '<div class="cx-grid2">' +
        '<div class="card"><h3>Top de categorías contratadas</h3><div id="cxTopCat"></div></div>' +
        '<div class="card"><h3>Top de proveedores</h3><div id="cxTopProv"></div></div>' +
      '</div>' +
      '<div class="cx-grid2">' +
        '<div class="card"><h3>Distribución por tipo de procedimiento</h3><div id="cxTipo"></div></div>' +
        '<div class="card"><h3>Mapa por departamento</h3><div class="cx-map-note">Distribución del monto por departamento (barras; se mostrará mapa cuando exista suficiente información geográfica).</div><div id="cxDepto"></div></div>' +
      '</div>';

    // evolución (desde manifest.evolucion)
    var ev = manifest.evolucion || [];
    barChart($("#cxEvol"), ev.map(function (e) { return String(e.anio) + (e.parcial ? "*" : ""); }), [
      { name: "Convocado", color: C.rojo, values: ev.map(function (e) { return e.convocado; }) },
      { name: "Adjudicado", color: C.amar, values: ev.map(function (e) { return e.adjudicado; }) },
      { name: "Contratado", color: C.azul, values: ev.map(function (e) { return e.contratado; }) }
    ]);
    donut($("#cxDonut"), distObj.map(function (o) { return { label: o.objeto, value: o.monto, color: OBJ_COLOR[o.objeto] || C.gris }; }));
    funnel($("#cxFunnel"), embudo);
    barChart($("#cxCmp"), ["Montos"], [
      { name: "Convocado", color: C.rojo, values: [comp.convocado] },
      { name: "Adjudicado", color: C.amar, values: [comp.adjudicado] },
      { name: "Contratado", color: C.azul, values: [comp.contratado] }
    ]);
    hbars($("#cxTopCat"), topCat.slice(0, 8), money);
    hbars($("#cxTopProv"), topProv.slice(0, 8), money);
    hbars($("#cxTipo"), porTipo.map(function (x) { return { k: x.k, monto: x.monto }; }), money, function (it) {
      return it.k === "Contratación Directa" ? C.amar : C.neg;
    });
    hbars($("#cxDepto"), (hasRowFilters() ? comp.grpDepto : (state.agg.por_departamento || []).map(function (d) { return { k: d.departamento, monto: d.monto }; })).slice(0, 10), money, function () { return C.teal; });
    bindHelp();
  }

  function precompToComp(agg) {
    var i = agg.indicadores;
    return {
      convocado: i.convocado, adjudicado: i.adjudicado, contratado: i.contratado,
      n_procedimientos: i.n_procedimientos, n_oc: i.n_oc, n_os: i.n_os, n_proveedores: i.n_proveedores,
      cd_num: i.cd_num, cd_monto: i.cd_monto, desiertos: i.desiertos, anulados: i.anulados,
      grpObjeto: (agg.distribucion_objeto || []).map(function (x) { return { k: x.objeto, monto: x.monto, n: x.n }; }),
      grpCategoria: (agg.top_categorias || []).map(function (x) { return { k: x.categoria, monto: x.monto, n: x.n }; }),
      grpProveedor: (agg.top_proveedores || []).map(function (x) { return { k: x.proveedor, monto: x.monto, n: x.n }; }),
      grpTipo: (agg.por_tipo_procedimiento || []).map(function (x) { return { k: x.tipo, monto: x.monto, n: x.n }; }),
      grpDepto: (agg.por_departamento || []).map(function (x) { return { k: x.departamento, monto: x.monto, n: x.n }; })
    };
  }

  function renderEntidad(box, rows) {
    var comp = computeAgg(rows);
    var ent = {};
    rows.forEach(function (r) {
      var g = ent[r.entidad_id] || (ent[r.entidad_id] = { nombre: r.entidad, nivel: r.nivel, sector: r.sector, convocado: 0, adjudicado: 0, contratado: 0, n: 0 });
      g.convocado += r.convocado || 0; g.adjudicado += r.adjudicado || 0; g.contratado += r.contratado || 0; g.n++;
    });
    var list = Object.keys(ent).map(function (k) { var e = ent[k]; e.id = k; return e; }).sort(function (a, b) { return b.adjudicado - a.adjudicado; });
    box.innerHTML =
      '<div class="card">' + kpisHTML(comp, state.agg.indicadores, "Total del año") + fichaFuente(state.agg) + '</div>' +
      '<div class="card"><h3>Contrataciones por entidad <span class="cx-count">(' + list.length + ' entidades)</span></h3>' +
      '<div class="tbl-wrap"><table class="cx-t"><thead><tr>' +
      '<th class="l">Entidad</th><th class="l">Nivel</th><th class="l">Sector</th><th>N.°</th><th>Convocado</th><th>Adjudicado</th><th>Contratado</th></tr></thead><tbody>' +
      list.map(function (e) {
        return '<tr><td class="l"><b>' + esc(e.nombre) + '</b></td><td class="l">' + esc(e.nivel) + '</td><td class="l">' + esc(e.sector) + '</td>' +
          '<td>' + numf(e.n) + '</td><td>' + money(e.convocado) + '</td><td>' + money(e.adjudicado) + '</td><td>' + money(e.contratado) + '</td></tr>';
      }).join("") + '</tbody></table></div>' +
      '<p class="cx-map-note">Recuerde: la entidad contratante (OECE) no siempre coincide uno a uno con el pliego o la unidad ejecutora (MEF).</p></div>';
  }

  function renderBienes(box, rows) {
    var bs = rows.filter(function (r) { return r.objeto === "Bienes" || r.objeto === "Servicios"; });
    var comp = computeAgg(bs);
    box.innerHTML =
      '<div class="card"><h3>Bienes y servicios — ' + esc(state.year) + '</h3>' +
        '<div class="cx-kpis">' +
          kpi("Monto convocado", moneyM(comp.convocado), bs.length + " procedimientos", "rojo") +
          kpi("Monto adjudicado", moneyM(comp.adjudicado), "≠ devengado", "amar") +
          kpi("Órdenes de compra", numf(comp.n_oc), "Bienes", "azul") +
          kpi("Órdenes de servicio", numf(comp.n_os), "Servicios", "azul") +
          kpi("Proveedores", numf(comp.n_proveedores), null, "neg") +
        '</div>' + fichaFuente(state.agg) + '</div>' +
      '<div class="cx-grid2">' +
        '<div class="card"><h3>Bienes vs. servicios</h3><div class="cx-chartbox" id="cxBS"></div></div>' +
        '<div class="card"><h3>Top de categorías (bienes y servicios)</h3><div id="cxBSCat"></div></div>' +
      '</div>' +
      tablaDetallada(bs);
    var grpO = computeAgg(bs).grpObjeto;
    donut($("#cxBS"), grpO.map(function (o) { return { label: o.k, value: o.monto, color: OBJ_COLOR[o.k] || C.gris }; }));
    hbars($("#cxBSCat"), computeAgg(bs).grpCategoria.slice(0, 10), money);
    bindTabla(bs, "bienes_servicios");
  }

  function renderProveedores(box, rows) {
    var prov = {};
    rows.forEach(function (r) {
      if (!r.ruc) return;
      var g = prov[r.ruc] || (prov[r.ruc] = { nombre: r.proveedor, ruc: r.ruc, monto: 0, n: 0, sancionado: !!r.sancionado, unPostor: 0 });
      g.monto += (r.adjudicado != null ? r.adjudicado : (r.contratado || 0)); g.n++;
      if (r.postores === 1) g.unPostor++;
    });
    var list = Object.keys(prov).map(function (k) { return prov[k]; }).sort(function (a, b) { return b.monto - a.monto; });
    var totAdj = list.reduce(function (a, p) { return a + p.monto; }, 0) || 1;
    var top3 = list.slice(0, 3).reduce(function (a, p) { return a + p.monto; }, 0);
    box.innerHTML =
      '<div class="card"><h3>Proveedores — ' + esc(state.year) + '</h3>' +
        '<div class="cx-kpis">' +
          kpi("Proveedores con adjudicación", numf(list.length), null, "neg") +
          kpi("Monto adjudicado a proveedores", moneyM(totAdj), null, "amar") +
          kpi("Concentración top 3", pct(top3 / totAdj * 100), "del monto adjudicado", "rojo") +
          kpi("Proveedores sancionados", numf(list.filter(function (p) { return p.sancionado; }).length), "según registro", "rojo") +
        '</div>' + fichaFuente(state.agg) + '</div>' +
      '<div class="cx-grid2"><div class="card"><h3>Top de proveedores por monto adjudicado</h3><div id="cxProvBar"></div></div>' +
        '<div class="card"><h3>Concentración de mercado</h3><div class="cx-chartbox" id="cxProvDonut"></div></div></div>' +
      '<div class="card"><h3>Detalle de proveedores <span class="cx-count">(' + list.length + ')</span></h3>' +
        '<div class="tbl-wrap"><table class="cx-t"><thead><tr><th class="l">Proveedor</th><th class="l">RUC</th><th>Adjudicaciones</th><th>Monto</th><th>% del total</th><th>Un solo postor</th><th class="l">Estado</th></tr></thead><tbody>' +
        list.map(function (p) {
          return '<tr><td class="l"><b>' + esc(p.nombre) + '</b></td><td class="l">' + esc(p.ruc) + '</td>' +
            '<td>' + numf(p.n) + '</td><td>' + money(p.monto) + '</td><td>' + pct(p.monto / totAdj * 100) + '</td>' +
            '<td>' + numf(p.unPostor) + '</td><td class="l">' + (p.sancionado ? '<span class="cx-pill des">Sancionado</span>' : '<span class="cx-pill adj">Sin sanción registrada</span>') + '</td></tr>';
        }).join("") + '</tbody></table></div></div>';
    hbars($("#cxProvBar"), list.slice(0, 10).map(function (p) { return { k: p.nombre, monto: p.monto }; }), money, function (it) {
      var p = list.filter(function (x) { return x.nombre === it.k; })[0];
      return p && p.sancionado ? C.rojo : C.azul;
    });
    donut($("#cxProvDonut"), list.slice(0, 6).map(function (p, i) { return { label: p.nombre, value: p.monto, color: [C.rojo, C.amar, C.azul, C.teal, C.morado, C.gris][i] }; }));
  }

  function renderDirectas(box, rows) {
    var cd = rows.filter(function (r) { return r.tipo === "Contratación Directa" || r.regimen === "Contratación Directa (art. 27)"; });
    var monto = cd.reduce(function (a, r) { return a + (r.adjudicado != null ? r.adjudicado : (r.convocado || 0)); }, 0);
    var totMonto = rows.reduce(function (a, r) { return a + (r.adjudicado != null ? r.adjudicado : (r.convocado || 0)); }, 0) || 1;
    box.innerHTML =
      '<div class="card"><h3>Contrataciones directas — ' + esc(state.year) + '</h3>' +
        '<div class="cx-aviso"><b>Nota:</b> la contratación directa es un procedimiento legal previsto en la Ley N.° 30225. Su uso, por sí solo, no implica irregularidad; es una señal a monitorear.</div>' +
        '<div class="cx-kpis">' +
          kpi("N.° contrataciones directas", numf(cd.length), null, "amar") +
          kpi("Monto", moneyM(monto), null, "amar") +
          kpi("Participación", pct(monto / totMonto * 100), "del monto total del filtro", "rojo") +
          kpi("Entidades que las usan", numf(Object.keys(cd.reduce(function (a, r) { a[r.entidad_id] = 1; return a; }, {})).length), null, "neg") +
        '</div>' + fichaFuente(state.agg) + '</div>' +
      tablaDetallada(cd);
    bindTabla(cd, "contrataciones_directas");
  }

  function renderObras(box, rows) {
    var oc = rows.filter(function (r) { return r.objeto === "Obras" || r.objeto === "Consultoría de obras"; });
    var comp = computeAgg(oc);
    box.innerHTML =
      '<div class="card"><h3>Obras y consultorías — ' + esc(state.year) + '</h3>' +
        '<div class="cx-kpis">' +
          kpi("N.° procedimientos", numf(oc.length), null, "neg") +
          kpi("Monto convocado", moneyM(comp.convocado), null, "rojo") +
          kpi("Monto adjudicado", moneyM(comp.adjudicado), "≠ devengado de obra", "amar") +
          kpi("Monto contratado", moneyM(comp.contratado), null, "amar") +
        '</div>' + fichaFuente(state.agg) + '</div>' +
      '<div class="cx-grid2"><div class="card"><h3>Obras vs. consultoría de obras</h3><div class="cx-chartbox" id="cxObrDonut"></div></div>' +
        '<div class="card"><h3>Top de entidades por monto de obra</h3><div id="cxObrEnt"></div></div></div>' +
      tablaDetallada(oc);
    donut($("#cxObrDonut"), comp.grpObjeto.map(function (o) { return { label: o.k, value: o.monto, color: OBJ_COLOR[o.k] || C.gris }; }));
    var ents = {}; oc.forEach(function (r) { ents[r.entidad] = (ents[r.entidad] || 0) + (r.adjudicado || r.convocado || 0); });
    hbars($("#cxObrEnt"), Object.keys(ents).map(function (k) { return { k: k, monto: ents[k] }; }).sort(function (a, b) { return b.monto - a.monto; }).slice(0, 8), money);
    bindTabla(oc, "obras_consultorias");
  }

  /* ---------------- alertas (señales estadísticas) ---------------- */
  function renderAlertas(box, rows) {
    var A = [];
    function add(cls, ico, titulo, count, desc) { A.push({ cls: cls, ico: ico, titulo: titulo, count: count, desc: desc }); }
    var cd = rows.filter(function (r) { return r.tipo === "Contratación Directa"; });
    var unPostor = rows.filter(function (r) { return r.postores === 1; });
    var desiertos = rows.filter(function (r) { return r.estado === "Desierto"; });
    var nulos = rows.filter(function (r) { return r.estado === "Nulo"; });
    var sancion = rows.filter(function (r) { return r.sancionado; });
    var cierre = rows.filter(function (r) { return r.cierre_anio; });
    var brecha = rows.filter(function (r) { return r.adjudicado != null && r.convocado && (1 - r.adjudicado / r.convocado) > 0.25; });
    // concentración de proveedores
    var prov = {}; var tot = 0;
    rows.forEach(function (r) { if (r.ruc && r.adjudicado != null) { prov[r.ruc] = (prov[r.ruc] || 0) + r.adjudicado; tot += r.adjudicado; } });
    var top3 = Object.keys(prov).map(function (k) { return prov[k]; }).sort(function (a, b) { return b - a; }).slice(0, 3).reduce(function (a, b) { return a + b; }, 0);
    var conc = tot ? top3 / tot * 100 : 0;
    // repetición de órdenes similares (misma entidad + categoría + proveedor)
    var comb = {}; rows.forEach(function (r) { if (r.proveedor) { var k = r.entidad_id + "|" + r.categoria + "|" + r.ruc; comb[k] = (comb[k] || 0) + 1; } });
    var repet = Object.keys(comb).filter(function (k) { return comb[k] >= 3; }).length;

    add("ambar", "📄", "Contratación directa", cd.length, "Procedimientos por contratación directa. Es una modalidad legal; conviene verificar la causal invocada.");
    add("ambar", "1️⃣", "Un solo postor", unPostor.length, "Procedimientos adjudicados con un único postor. Puede indicar baja competencia.");
    add(conc >= 50 ? "rojo" : "ambar", "📊", "Alta concentración de proveedores", nf1.format(conc) + " %", "Participación de los 3 mayores proveedores en el monto adjudicado del filtro actual.");
    add(sancion.length ? "rojo" : "gris", "⛔", "Proveedor sancionado", sancion.length, "Procedimientos con proveedor que figura como sancionado/inhabilitado en el registro.");
    add("gris", "🚫", "Procedimiento desierto", desiertos.length, "Procedimientos que quedaron sin postores válidos.");
    add("gris", "⚖️", "Procedimiento nulo", nulos.length, "Procedimientos declarados nulos.");
    add(brecha.length ? "ambar" : "gris", "📉", "Brecha convocado–adjudicado", brecha.length, "Procedimientos donde el monto adjudicado es más de 25 % menor al convocado.");
    add(cierre.length ? "ambar" : "gris", "🗓️", "Contrataciones al cierre del año", cierre.length, "Procedimientos con convocatoria en diciembre.");
    add(repet ? "ambar" : "gris", "🔁", "Repetición de órdenes similares", repet, "Combinaciones entidad + categoría + proveedor con 3 o más procedimientos.");
    add("azul", "🔍", "Diferencias contratación vs. ejecución", "Revisar", "El adjudicado del filtro (" + moneyM(computeAgg(rows).adjudicado) + ") no equivale al devengado del año (" + moneyM(state.agg.indicadores.dev) + "). Compare con el módulo de ejecución.");

    box.innerHTML =
      '<div class="card"><h3>Alertas — señales estadísticas ' + esc(state.year) + '</h3>' +
        '<div class="cx-aviso"><b>Importante:</b> las alertas son <b>señales estadísticas</b> derivadas de los datos abiertos. ' +
        'No constituyen prueba de irregularidad ni determinación de responsabilidad. Sirven para orientar la verificación ciudadana en las fuentes oficiales.</div>' +
        A.map(function (a) {
          return '<div class="cx-alert ' + a.cls + '"><span class="cx-a-ico">' + a.ico + '</span><div class="cx-a-body">' +
            '<b>' + esc(a.titulo) + ' · <span class="cx-a-count">' + esc(a.count) + '</span></b>' + esc(a.desc) + '</div></div>';
        }).join("") +
        '<p class="cx-alert-nota">Cálculos sobre ' + rows.length + ' procedimientos del filtro actual. ' + esc(isoDate(manifest.actualizado)) + '.</p>' +
        fichaFuente(state.agg) + '</div>';
  }

  /* ---------------- pestaña fuentes y metodología ---------------- */
  function renderFuentes(box) {
    var fuentes = manifest.fuentes || [];
    var lim = manifest.limitaciones || [];
    box.innerHTML =
      '<div class="card"><h3>Fuentes oficiales</h3><div class="fuentes-grid">' +
        fuentes.map(function (f) {
          return '<a class="fuente" href="' + esc(f.url) + '" target="_blank" rel="noopener"><strong>' + esc(f.nombre) + '</strong><span>' + esc(f.descripcion || "") + '</span></a>';
        }).join("") + '</div></div>' +
      '<div class="card"><h3>Trazabilidad de cada indicador</h3>' +
        '<div class="cx-meta-grid">' +
          meta("Fuente", "OECE/SEACE (OCDS), MEF, Perú Compras, Contraloría") +
          meta("Fecha de actualización", isoDate(manifest.actualizado)) +
          meta("Años de información", (manifest.anios || []).join(", ")) +
          meta("Cobertura", manifest.cobertura || "—") +
          meta("Estado de los datos", manifest.estado_datos === "validado" ? "Validado" : "Demostración (pendiente de validación)") +
          meta("Verificación", "Cada tarjeta y tabla enlaza a la fuente oficial correspondiente") +
        '</div></div>' +
      '<div class="card"><h3>Metodología de cálculo</h3>' +
        '<ul class="cx-limitaciones">' +
          '<li><b>Presupuesto (PIA, PIM, devengado, girado):</b> tomado del MEF por pliego/unidad ejecutora. No se atribuye automáticamente a un procedimiento de contratación.</li>' +
          '<li><b>PAC:</b> monto programado en el Plan Anual de Contrataciones publicado por cada entidad.</li>' +
          '<li><b>Convocado / adjudicado / contratado:</b> montos de cada etapa del procedimiento en OECE/SEACE. Son etapas distintas y no equivalen entre sí.</li>' +
          '<li><b>Devengado:</b> gasto ejecutado reconocido (MEF). <b>El monto adjudicado no equivale al devengado ni al girado.</b></li>' +
          '<li><b>Órdenes de compra/servicio:</b> derivadas de catálogos electrónicos y Acuerdos Marco (Perú Compras).</li>' +
          '<li><b>Alertas:</b> reglas estadísticas sobre los datos abiertos; no determinan responsabilidad.</li>' +
        '</ul></div>' +
      '<div class="card"><h3>Limitaciones de los datos</h3><ul class="cx-limitaciones">' +
        lim.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join("") +
        '<li>No se asume correspondencia uno a uno entre pliego, unidad ejecutora y entidad contratante.</li>' +
      '</ul></div>';
  }
  function meta(t, v) { return '<div class="cx-meta"><b>' + esc(t) + '</b>' + esc(v) + '</div>'; }

  /* ---------------- tabla detallada reutilizable ---------------- */
  var tblState = {};
  function tablaDetallada(rows) {
    return '<div class="card"><h3>Tabla detallada de contrataciones</h3>' +
      '<div class="cx-tbl-tools">' +
        '<input id="cxTblBuscar" placeholder="Buscar en la tabla…">' +
        '<button class="cx-btn" id="cxTblCSV" type="button">Exportar CSV</button>' +
        '<span class="cx-count" id="cxTblCount"></span>' +
      '</div>' +
      '<div class="tbl-wrap"><table class="cx-t" id="cxTbl"><thead></thead><tbody></tbody></table></div>' +
      '<div class="cx-pag" id="cxTblPag"></div></div>';
  }

  var COLS = [
    ["codigo", "Código", "l"], ["entidad", "Entidad", "l"], ["ue", "U. ejecutora", "l"],
    ["descripcion", "Descripción", "l"], ["objeto", "Objeto", "l"], ["tipo", "Tipo", "l"],
    ["estado", "Estado", "l"], ["proveedor", "Proveedor", "l"], ["ruc", "RUC", "l"],
    ["convocado", "Convocado", ""], ["adjudicado", "Adjudicado", ""], ["contratado", "Contratado", ""],
    ["f_convocatoria", "F. convoc.", "l"], ["f_adjudicacion", "F. adjud.", "l"], ["postores", "Postores", ""],
    ["regimen", "Régimen", "l"], ["url", "Fuente", "l"]
  ];

  function bindTabla(rows, nombre) {
    var st = tblState[nombre] = tblState[nombre] || { sort: "adjudicado", dir: -1, page: 1, per: 25, q: "" };
    st.base = rows;
    var buscar = $("#cxTblBuscar"), csv = $("#cxTblCSV");
    if (buscar) buscar.addEventListener("input", function () { st.q = this.value.toLowerCase(); st.page = 1; drawTabla(nombre); });
    if (csv) csv.addEventListener("click", function () { exportCSV(nombre); });
    drawTabla(nombre);
  }

  function tblFiltered(st) {
    var q = st.q;
    var r = st.base;
    if (q) r = r.filter(function (x) { return (x.codigo + " " + x.descripcion + " " + x.entidad + " " + (x.proveedor || "") + " " + (x.ruc || "")).toLowerCase().indexOf(q) >= 0; });
    var key = st.sort, dir = st.dir;
    r = r.slice().sort(function (a, b) {
      var va = a[key], vb = b[key];
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return r;
  }

  function drawTabla(nombre) {
    var st = tblState[nombre];
    var all = tblFiltered(st);
    var pages = Math.max(1, Math.ceil(all.length / st.per));
    if (st.page > pages) st.page = pages;
    var slice = all.slice((st.page - 1) * st.per, st.page * st.per);
    var thead = $("#cxTbl thead"), tbody = $("#cxTbl tbody");
    if (!thead) return;
    thead.innerHTML = '<tr>' + COLS.map(function (c) {
      var arrow = st.sort === c[0] ? (st.dir < 0 ? "▼" : "▲") : "";
      return '<th class="' + c[2] + '" data-c="' + c[0] + '">' + esc(c[1]) + ' <span class="cx-sort">' + arrow + '</span></th>';
    }).join("") + '</tr>';
    $$("#cxTbl th").forEach(function (th) {
      th.addEventListener("click", function () {
        var c = th.dataset.c;
        if (st.sort === c) st.dir = -st.dir; else { st.sort = c; st.dir = (["convocado", "adjudicado", "contratado", "postores"].indexOf(c) >= 0) ? -1 : 1; }
        drawTabla(nombre);
      });
    });
    tbody.innerHTML = slice.map(function (r) {
      return '<tr>' +
        td(r.codigo, "l") + td(r.entidad, "l") + td(r.ue, "l") + td(r.descripcion, "l") + td(r.objeto, "l") +
        td(r.tipo, "l") + '<td class="l">' + estadoPill(r.estado) + '</td>' + td(r.proveedor || "—", "l") + td(r.ruc || "—", "l") +
        tdN(r.convocado) + tdN(r.adjudicado) + tdN(r.contratado) +
        td(isoDate(r.f_convocatoria), "l") + td(r.f_adjudicacion ? isoDate(r.f_adjudicacion) : "—", "l") + '<td>' + numf(r.postores) + '</td>' +
        td(r.regimen, "l") + '<td class="l">' + (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">ver ↗</a>' : "—") + '</td>' +
        '</tr>';
    }).join("") || '<tr><td class="l" colspan="17"><span class="cx-empty">Sin resultados.</span></td></tr>';
    $("#cxTblCount").textContent = all.length + " procedimientos";
    var pag = $("#cxTblPag");
    pag.innerHTML =
      '<button ' + (st.page <= 1 ? "disabled" : "") + ' data-p="prev">◀ Anterior</button>' +
      '<span class="cx-count">Página ' + st.page + ' de ' + pages + '</span>' +
      '<button ' + (st.page >= pages ? "disabled" : "") + ' data-p="next">Siguiente ▶</button>';
    $$("#cxTblPag button").forEach(function (b) {
      b.addEventListener("click", function () { st.page += (b.dataset.p === "next" ? 1 : -1); drawTabla(nombre); });
    });
  }
  function td(v, cls) { return '<td class="' + (cls || "") + '">' + esc(v == null ? "—" : v) + '</td>'; }
  function tdN(v) { return '<td>' + (v == null ? "—" : money(v)) + '</td>'; }
  function estadoPill(e) {
    var cl = e === "Adjudicado" || e === "Contratado" ? "adj" : e === "Desierto" ? "des" : e === "Nulo" ? "nul" : "conv";
    return '<span class="cx-pill ' + cl + '">' + esc(e) + '</span>';
  }

  function exportCSV(nombre) {
    var st = tblState[nombre];
    var rows = tblFiltered(st);
    var head = COLS.map(function (c) { return c[1]; });
    var lines = [head.join(";")];
    rows.forEach(function (r) {
      lines.push(COLS.map(function (c) {
        var v = r[c[0]]; if (v == null) v = "";
        v = String(v).replace(/"/g, '""');
        return /[;"\n]/.test(v) ? '"' + v + '"' : v;
      }).join(";"));
    });
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contrataciones_" + nombre + "_" + state.year + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  /* ---------------- ayuda contextual mínima ---------------- */
  function bindHelp() {
    $$("#cxContenido [data-help-cx]").forEach(function (b) {
      b.addEventListener("click", function () {
        alert("Convocado, adjudicado y contratado son etapas distintas del procedimiento. El monto adjudicado no equivale al devengado ni al girado, que corresponden a la ejecución presupuestal (MEF).");
      });
    });
  }

  /* ---------------- init ---------------- */
  ready(function () {
    injectNav();
    injectView();
    if (location.hash === "#contrataciones") showView();
  });
})();
