/* Presupuesto Perú — visor de ejecución presupuestal (vanilla JS, sin dependencias) */
(function () {
  "use strict";
  if (!window.MEF || !MEF.years) {
    document.body.insertAdjacentHTML("afterbegin",
      '<div style="background:#D91023;color:#fff;padding:12px;text-align:center">No se pudieron cargar los datos (data/mef.js).</div>');
    return;
  }

  var YEARS = Object.keys(MEF.years).sort();
  var CUR_YEAR = YEARS[YEARS.length - 1];
  var state = { year: CUR_YEAR, tipo: "sector", ent: null, view: "explorar", rankTipo: "sector" };

  /* ---------------- utilidades ---------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  var nf0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  function soles(n) {
    if (n == null || isNaN(n)) return "—";
    return "S/ " + nf0.format(Math.round(n));
  }
  function solesM(n) { // compacto en millones
    if (n == null || isNaN(n)) return "—";
    if (Math.abs(n) >= 1e9) return "S/ " + nf1.format(n / 1e9) + " mil mills.";
    if (Math.abs(n) >= 1e6) return "S/ " + nf1.format(n / 1e6) + " mills.";
    return soles(n);
  }
  function pct(n) { return (n == null || isNaN(n)) ? "—" : nf1.format(n) + " %"; }
  function pctClass(p) { return p == null ? "" : p >= 85 ? "ok" : p >= 70 ? "mid" : "bad"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function title(s) {
    return String(s || "").toLowerCase().replace(/(^|\s|\/|\()([a-záéíóúñ])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function avanceOf(o) {
    if (!o) return null;
    if (o.avance != null) return o.avance;
    if (o.pim && o.dev != null) return o.dev / o.pim * 100;
    return null;
  }
  function yearData(y) { return MEF.years[y] || {}; }
  function isPartial(y) { return String(y) === String(CUR_YEAR) && MEF.partial !== false; }

  /* ---------------- catálogo de entidades ---------------- */
  function listFor(tipo, y) {
    var d = yearData(y);
    if (tipo === "sector") return d.sectores || [];
    if (tipo === "regional") return d.regionales || [];
    if (tipo === "muni") return d.munis_lima || [];
    if (tipo === "depto") return d.departamentos || [];
    return [];
  }
  function findEnt(tipo, code, y) {
    var l = listFor(tipo, y);
    for (var i = 0; i < l.length; i++) if (l[i].code === code) return l[i];
    return null;
  }
  var TIPO_LBL = { sector: "Sector del Gobierno Nacional", regional: "Gobierno Regional", muni: "Municipalidad (provincia de Lima)", depto: "Gobiernos locales del departamento" };

  /* ---------------- glosario / ayuda ---------------- */
  var GLOSARIO = {
    pia: ["PIA — Presupuesto Institucional de Apertura", "Es el dinero que se le aprobó a la entidad al inicio del año, mediante la Ley de Presupuesto que el Congreso aprueba en diciembre del año anterior. Es el «punto de partida»."],
    pim: ["PIM — Presupuesto Institucional Modificado", "Es el presupuesto vigente: el PIA más (o menos) los cambios ocurridos durante el año — créditos suplementarios (dinero adicional o «complementario»), transferencias entre entidades e incorporaciones de saldos. Si el PIM es mayor que el PIA, la entidad recibió recursos adicionales durante el año."],
    cert: ["Certificación", "Reserva del presupuesto: la entidad «separa» el dinero para garantizar que existe disponibilidad antes de comprometerse a gastar."],
    comp: ["Compromiso anual", "Monto ya comprometido con contratos firmados, órdenes de compra o planillas. Es dinero con destino asignado, aunque todavía no pagado."],
    dev: ["Devengado", "Es la medida oficial de EJECUCIÓN. Significa que el bien fue entregado, el servicio prestado o la obra avanzada, y la entidad reconoció la obligación de pagar. Cuando se dice «ejecutó el 80%», se habla del devengado."],
    gir: ["Girado", "El pago ya fue ordenado o emitido (el cheque o la transferencia salió). La diferencia entre devengado y girado es gasto reconocido pero aún no pagado."],
    avance: ["Avance % (ejecución)", "Se calcula como devengado ÷ PIM × 100. Indica cuánto del presupuesto vigente se convirtió en bienes, servicios u obras reales. Referencia: al cierre del año, menos de 85% suele considerarse ejecución baja; durante el año, compárelo con el avance esperado a la fecha."],
    saldo: ["Saldo no ejecutado", "PIM − devengado: presupuesto que no llegó a ejecutarse. Importante: esto NO acredita por sí solo que el dinero se devolvió al Tesoro Público; para eso existen registros de tesorería y la Cuenta General de la República."],
    anio: ["Año fiscal", "El presupuesto público peruano se aprueba y ejecuta por año calendario (enero–diciembre). El año en curso muestra ejecución parcial: el avance esperado depende del mes."],
    entidad: ["Entidad / Pliego", "Cada organización pública que recibe presupuesto: un ministerio, el Poder Judicial, el Ministerio Público, un gobierno regional o una municipalidad. En el presupuesto se les llama «pliegos»."],
    nivel: ["Niveles de gobierno", "El Estado peruano gasta en tres niveles: Gobierno Nacional (ministerios y organismos autónomos), Gobiernos Regionales y Gobiernos Locales (municipalidades)."],
    generica: ["Genéricas de gasto", "Las grandes «líneas» del gasto: personal y obligaciones sociales (sueldos), pensiones, bienes y servicios, donaciones y transferencias, otros gastos, adquisición de activos no financieros (inversiones y obras) y servicio de la deuda."],
    pliego: ["Pliego presupuestal", "Unidad a la que se le asigna formalmente presupuesto dentro de un sector. Ejemplo: dentro del sector Justicia están el Ministerio de Justicia, la SUNARP y el INPE, cada uno como pliego."],
    comparativo: ["Comparativo entre años", "Compara el presupuesto vigente (PIM) y lo realmente ejecutado (devengado) de cada año. Permite ver si la entidad mejora o empeora su capacidad de gasto, y cuánto creció su presupuesto."]
  };

  function modalGlosario(keys, tit) {
    var html = "<h2>" + esc(tit || "¿Cómo leer estas cifras?") + "</h2>";
    keys.forEach(function (k) {
      var g = GLOSARIO[k];
      if (g) html += '<div class="gl-term"><b>' + esc(g[0]) + "</b><p>" + esc(g[1]) + "</p></div>";
    });
    openModal(html);
  }
  function openModal(html) { $("#modalBody").innerHTML = html; $("#modal").hidden = false; }
  $("#modalClose").addEventListener("click", function () { $("#modal").hidden = true; });
  $("#modal").addEventListener("click", function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("#modal").hidden = true; });
  document.addEventListener("click", function (e) {
    var q = e.target.closest(".qmark");
    if (q) { modalGlosario([q.dataset.help], null); }
  });
  $("#btnAyuda").addEventListener("click", function () {
    modalGlosario(["anio", "entidad", "nivel", "pia", "pim", "cert", "comp", "dev", "gir", "avance", "saldo", "generica", "pliego"], "Guía rápida: ¿cómo funciona el presupuesto público?");
  });

  /* ---------------- SVG helpers ---------------- */
  function barChart(box, series, labels) {
    // series = [{name, color, values[]}], labels = years
    var W = 560, H = 300, padL = 62, padB = 30, padT = 16, padR = 8;
    var max = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { if (v != null && v > max) max = v; }); });
    if (!max) { box.innerHTML = '<p class="note">Sin datos suficientes.</p>'; return; }
    max *= 1.08;
    var iw = W - padL - padR, ih = H - padT - padB;
    var g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img">';
    for (var t = 0; t <= 4; t++) {
      var yv = max * t / 4, y = padT + ih - ih * t / 4;
      g += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#e6e6e6"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#777">' + esc(solesM(yv).replace("S/ ", "")) + "</text>";
    }
    var n = labels.length, gw = iw / n, bw = Math.min(28, gw / (series.length + 1));
    labels.forEach(function (lb, i) {
      var cx = padL + gw * i + gw / 2;
      g += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#333">' + esc(lb) + "</text>";
      series.forEach(function (s, si) {
        var v = s.values[i];
        if (v == null) return;
        var bh = ih * v / max, x = cx - bw * series.length / 2 + si * bw;
        g += '<rect x="' + x + '" y="' + (padT + ih - bh) + '" width="' + (bw - 3) + '" height="' + bh + '" rx="2" fill="' + s.color + '"><title>' + esc(s.name + " " + lb + ": " + soles(v)) + "</title></rect>";
      });
    });
    var lx = padL;
    series.forEach(function (s) {
      g += '<rect x="' + lx + '" y="2" width="10" height="10" rx="2" fill="' + s.color + '"/><text x="' + (lx + 14) + '" y="11" font-size="11" fill="#333">' + esc(s.name) + "</text>";
      lx += 14 + s.name.length * 6.4 + 16;
    });
    g += "</svg>";
    box.innerHTML = g;
  }

  function gauge(box, p, label) {
    if (p == null) { box.innerHTML = '<p class="note">Sin dato de avance.</p>'; return; }
    var cl = p >= 85 ? "#1a7f37" : p >= 70 ? "#FFC400" : "#D91023";
    var ang = Math.min(100, Math.max(0, p)) / 100 * 180;
    var r = 80, cx = 100, cy = 95;
    function pt(a) { var rad = (180 - a) * Math.PI / 180; return (cx + r * Math.cos(rad)).toFixed(1) + " " + (cy - r * Math.sin(rad)).toFixed(1); }
    var large = ang > 180 ? 1 : 0;
    box.innerHTML =
      '<svg viewBox="0 0 200 120" style="max-width:260px">' +
      '<path d="M ' + pt(0) + " A " + r + " " + r + " 0 0 1 " + pt(180) + '" fill="none" stroke="#ececec" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M ' + pt(0) + " A " + r + " " + r + " 0 " + large + " 1 " + pt(ang) + '" fill="none" stroke="' + cl + '" stroke-width="16" stroke-linecap="round"/>' +
      '<text x="100" y="88" text-anchor="middle" font-size="26" font-weight="800" fill="#141414">' + nf1.format(p) + '%</text>' +
      '<text x="100" y="107" text-anchor="middle" font-size="10" fill="#777">' + esc(label || "avance de ejecución") + "</text></svg>";
  }

  /* ---------------- render: encabezado / chips de año ---------------- */
  function renderYearChips() {
    var c = $("#yearChips");
    c.innerHTML = YEARS.map(function (y) {
      return '<button class="chip' + (y === state.year ? " active" : "") + '" data-y="' + y + '">' + y + (isPartial(y) ? " ⏳" : "") + "</button>";
    }).join("");
    $$(".chip", c).forEach(function (b) {
      b.addEventListener("click", function () { state.year = b.dataset.y; render(); });
    });
  }

  /* ---------------- render: resumen nacional ---------------- */
  function kpiCard(lbl, val, sub, cls, helpKey) {
    return '<div class="kpi ' + (cls || "") + '"><div class="k-lbl">' + esc(lbl) +
      (helpKey ? ' <button class="qmark" data-help="' + helpKey + '">?</button>' : "") +
      '</div><div class="k-val" title="' + esc(val) + '">' + esc(val) + "</div>" +
      (sub ? '<div class="k-sub">' + esc(sub) + "</div>" : "") + "</div>";
  }

  function renderNacional() {
    var d = yearData(state.year), t = d.total;
    if (!t) { $("#panelNacional").innerHTML = "<p>Sin datos para este año.</p>"; return; }
    var saldo = (t.pim != null && t.dev != null) ? t.pim - t.dev : null;
    $("#nacionalCards").innerHTML =
      kpiCard("PIA (inicial)", solesM(t.pia), "aprobado por ley", "neg", "pia") +
      kpiCard("PIM (vigente)", solesM(t.pim), "tras modificaciones", "", "pim") +
      kpiCard("Devengado (ejecutado)", solesM(t.dev), "gasto reconocido", "verde", "dev") +
      kpiCard("Girado (pagado)", solesM(t.gir), "", "verde", "gir") +
      kpiCard("Avance", pct(avanceOf(t)), isPartial(state.year) ? "año en ejecución" : "al cierre del año", "amar", "avance") +
      kpiCard("No ejecutado", solesM(saldo), "PIM − devengado", "", "saldo");

    // tabla niveles
    var rows = (d.niveles || []).map(function (n) {
      var a = avanceOf(n);
      return "<tr><td>" + esc(title(n.name)) + "</td><td>" + solesM(n.pim) + "</td><td>" + solesM(n.dev) +
        '</td><td><span class="pct ' + pctClass(a) + '">' + pct(a) + "</span></td></tr>";
    }).join("");
    $("#nivelesTabla").innerHTML = '<div class="tbl-wrap"><table class="t"><tr><th>Nivel</th><th>PIM</th><th>Devengado</th><th>Avance</th></tr>' + rows + "</table></div>";

    // chart nacional multi-año
    var pims = [], devs = [];
    YEARS.forEach(function (y) {
      var tt = yearData(y).total || {};
      pims.push(tt.pim || null); devs.push(tt.dev || null);
    });
    barChart($("#chartNacional"), [
      { name: "PIM", color: "#141414", values: pims },
      { name: "Devengado", color: "#D91023", values: devs }
    ], YEARS);
  }

  /* ---------------- render: entidad ---------------- */
  function entLinks(ent) {
    var links = [
      ["Consulta Amigable (MEF)", "https://apps5.mineco.gob.pe/transparencia/Navegador/default.aspx?y=" + state.year + "&ap=ActProy"],
      ["Rendición de cuentas (Contraloría)", "https://apps1.contraloria.gob.pe/RCTG/Areas/Ciudadano/Seguimiento/frm_CCProcesos.aspx"],
      ["Datos abiertos MEF", "https://datosabiertos.mef.gob.pe/dataset/presupuesto-y-ejecucion-de-gasto"]
    ];
    return links.map(function (l) { return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + esc(l[0]) + " ↗</a>"; }).join("");
  }

  function renderEntidad() {
    var ent = findEnt(state.tipo, state.ent, state.year);
    var panel = $("#panelEntidad");
    if (!ent) { panel.hidden = true; $("#panelNacional").hidden = false; return; }
    panel.hidden = false; $("#panelNacional").hidden = true;

    $("#entTipo").textContent = TIPO_LBL[state.tipo] + (ent.code ? " · Código " + ent.code : "");
    $("#entNombre").textContent = title(ent.name);
    $("#entLinks").innerHTML = entLinks(ent);

    var saldo = (ent.pim != null && ent.dev != null) ? ent.pim - ent.dev : null;
    var porGirar = (ent.dev != null && ent.gir != null) ? ent.dev - ent.gir : null;
    var modif = (ent.pim != null && ent.pia != null) ? ent.pim - ent.pia : null;
    $("#entCards").innerHTML =
      kpiCard("PIA (inicial)", solesM(ent.pia), "asignación de apertura", "neg", "pia") +
      kpiCard("PIM (vigente)", solesM(ent.pim), modif != null ? ((modif >= 0 ? "+" : "−") + solesM(Math.abs(modif)).replace("S/ ", "S/ ") + " en modificaciones") : "", "", "pim") +
      kpiCard("Certificado", solesM(ent.cert), "", "", "cert") +
      kpiCard("Comprometido", solesM(ent.comp), "", "", "comp") +
      kpiCard("Devengado (ejecutado)", solesM(ent.dev), "", "verde", "dev") +
      kpiCard("Girado (pagado)", solesM(ent.gir), porGirar != null ? "pendiente de giro: " + solesM(porGirar) : "", "verde", "gir") +
      kpiCard("Avance", pct(avanceOf(ent)), isPartial(state.year) ? "año en ejecución" : "al cierre", "amar", "avance") +
      kpiCard("No ejecutado", solesM(saldo), "PIM − devengado", "", "saldo");

    // comparativo multi-año
    var pims = [], devs = [], avs = [], rowsC = "";
    YEARS.forEach(function (y) {
      var e = findEnt(state.tipo, state.ent, y);
      pims.push(e ? e.pim : null); devs.push(e ? e.dev : null);
      var a = e ? avanceOf(e) : null; avs.push(a);
      rowsC += "<tr><td>" + y + (isPartial(y) ? " (en curso)" : "") + "</td><td>" + solesM(e && e.pia) + "</td><td>" + solesM(e && e.pim) + "</td><td>" + solesM(e && e.dev) +
        "</td><td>" + solesM(e && e.pim != null && e.dev != null ? e.pim - e.dev : null) +
        '</td><td><span class="pct ' + pctClass(a) + '">' + pct(a) + "</span></td></tr>";
    });
    barChart($("#chartComparativo"), [
      { name: "PIM", color: "#141414", values: pims },
      { name: "Devengado", color: "#D91023", values: devs }
    ], YEARS);
    $("#tablaComparativa").innerHTML = '<div class="tbl-wrap"><table class="t"><tr><th>Año</th><th>PIA</th><th>PIM</th><th>Devengado</th><th>No ejecutado</th><th>Avance</th></tr>' + rowsC + "</table></div>";

    // gauge + diagnóstico
    var av = avanceOf(ent);
    gauge($("#gaugeBox"), av, "devengado ÷ PIM · " + state.year);
    var dg = "";
    if (av != null) {
      var nombre = title(ent.name);
      if (isPartial(state.year)) {
        dg = "<strong>" + nombre + "</strong> lleva ejecutado el <strong>" + pct(av) + "</strong> de su presupuesto vigente " + state.year +
          " (año aún en curso). Quedan por ejecutar " + solesM(saldo) + ".";
      } else if (av >= 90) {
        dg = "<strong>" + nombre + "</strong> ejecutó el <strong>" + pct(av) + "</strong> de su presupuesto " + state.year + ": una ejecución alta. Aun así, " +
          solesM(saldo) + " no llegaron a ejecutarse.";
      } else if (av >= 75) {
        dg = "<strong>" + nombre + "</strong> ejecutó el <strong>" + pct(av) + "</strong> en " + state.year + ". Dejó sin ejecutar <strong>" + solesM(saldo) +
          "</strong>: revisa en qué genéricas se concentró el rezago para identificar cuellos de botella (obras, compras o personal).";
      } else {
        dg = "<strong>Alerta:</strong> <strong>" + nombre + "</strong> solo ejecutó el <strong>" + pct(av) + "</strong> de su presupuesto " + state.year +
          ". <strong>" + solesM(saldo) + "</strong> quedaron sin convertirse en bienes, servicios u obras. Este es un caso típico para pedir explicaciones vía rendición de cuentas.";
      }
      if (modif != null && ent.pia) {
        var mp = modif / ent.pia * 100;
        dg += " Su presupuesto " + (modif >= 0 ? "creció" : "se redujo") + " " + nf1.format(Math.abs(mp)) + "% durante el año (PIA → PIM), " +
          (modif >= 0 ? "es decir recibió recursos adicionales/complementarios por " + solesM(Math.abs(modif)) + "." : "por recortes o transferencias.");
      }
    }
    $("#diagnostico").innerHTML = dg;

    // genéricas (solo sectores)
    var gbox = $("#boxGenericas");
    var gen = (state.tipo === "sector") ? (yearData(state.year).genericas || {})[ent.code] : null;
    if (gen && gen.length) {
      gbox.hidden = false;
      $("#tablaGenericas").innerHTML = tablaEjec(gen, "Genérica");
    } else { gbox.hidden = true; }

    // pliegos (solo sectores)
    var pbox = $("#boxPliegos");
    var pl = (state.tipo === "sector") ? (yearData(state.year).pliegos || {})[ent.code] : null;
    if (pl && pl.length > 1) {
      pbox.hidden = false;
      $("#tablaPliegos").innerHTML = tablaEjec(pl, "Pliego");
    } else { pbox.hidden = true; }
  }

  function tablaEjec(items, colName) {
    var rows = items.slice().sort(function (a, b) { return (b.pim || 0) - (a.pim || 0); }).map(function (g) {
      var a = avanceOf(g);
      var w = Math.min(100, Math.max(0, a || 0));
      var cls = a >= 85 ? "ok" : a >= 70 ? "mid" : "";
      return "<tr><td>" + esc(title(g.name)) + "</td><td>" + solesM(g.pia) + "</td><td>" + solesM(g.pim) + "</td><td>" + solesM(g.dev) +
        "</td><td>" + solesM(g.pim != null && g.dev != null ? g.pim - g.dev : null) +
        '</td><td><div class="bar"><i class="' + cls + '" style="width:' + w + '%"></i></div></td><td><span class="pct ' + pctClass(a) + '">' + pct(a) + "</span></td></tr>";
    }).join("");
    return '<div class="tbl-wrap"><table class="t"><tr><th>' + esc(colName) + "</th><th>PIA</th><th>PIM</th><th>Devengado</th><th>No ejecutado</th><th>Ejecución</th><th>Avance</th></tr>" + rows + "</table></div>";
  }

  /* ---------------- selector de entidades ---------------- */
  function renderEntSelect() {
    var sel = $("#selEntidad");
    var list = listFor(state.tipo, state.year);
    var opts = '<option value="">— Resumen general del Perú —</option>';
    list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (e) {
      opts += '<option value="' + esc(e.code) + '"' + (state.ent === e.code ? " selected" : "") + ">" + esc(title(e.name)) + "</option>";
    });
    sel.innerHTML = opts;
  }

  /* ---------------- búsqueda global ---------------- */
  var searchIndex = null;
  function buildSearchIndex() {
    searchIndex = [];
    ["sector", "regional", "muni", "depto"].forEach(function (tp) {
      var seen = {};
      YEARS.slice().reverse().forEach(function (y) {
        listFor(tp, y).forEach(function (e) {
          if (!seen[e.code]) { seen[e.code] = 1; searchIndex.push({ tipo: tp, code: e.code, name: e.name }); }
        });
      });
    });
  }
  function normTxt(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  $("#buscar").addEventListener("input", function () {
    var q = normTxt(this.value.trim());
    var pop = $("#buscarResultados");
    if (q.length < 2) { pop.hidden = true; return; }
    if (!searchIndex) buildSearchIndex();
    var hits = searchIndex.filter(function (e) { return normTxt(e.name).indexOf(q) >= 0; }).slice(0, 12);
    if (!hits.length) { pop.innerHTML = '<button disabled>Sin resultados</button>'; pop.hidden = false; return; }
    pop.innerHTML = hits.map(function (h, i) {
      return '<button data-i="' + i + '"><span class="sp-tipo">' + esc(TIPO_LBL[h.tipo]) + "</span>" + esc(title(h.name)) + "</button>";
    }).join("");
    pop.hidden = false;
    $$("button[data-i]", pop).forEach(function (b) {
      b.addEventListener("click", function () {
        var h = hits[+b.dataset.i];
        state.tipo = h.tipo; state.ent = h.code;
        $("#selTipo").value = h.tipo;
        pop.hidden = true; $("#buscar").value = "";
        render();
      });
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".ctrl")) $("#buscarResultados").hidden = true;
  });

  /* ---------------- ranking ---------------- */
  function renderRanking() {
    var list = listFor(state.rankTipo, state.year).slice()
      .filter(function (e) { return (e.pim || 0) > 5e6; })
      .sort(function (a, b) { return (avanceOf(a) || 0) - (avanceOf(b) || 0); });
    var html = list.map(function (e, i) {
      var a = avanceOf(e), w = Math.min(100, a || 0);
      var cls = a >= 85 ? "ok" : a >= 70 ? "mid" : "";
      return '<div class="rank-row" data-code="' + esc(e.code) + '"><div class="rank-pos">' + (i + 1) + "</div>" +
        '<div class="rank-name">' + esc(title(e.name)) + "<small>PIM " + solesM(e.pim) + " · sin ejecutar " + solesM((e.pim || 0) - (e.dev || 0)) + "</small></div>" +
        '<div class="rank-barwrap"><div class="bar"><i class="' + cls + '" style="width:' + w + '%"></i></div>' +
        '<div class="rank-val"><span class="pct ' + pctClass(a) + '">' + pct(a) + "</span></div></div></div>";
    }).join("");
    $("#rankingLista").innerHTML = html || '<p class="note">Sin datos.</p>';
    $$(".rank-row").forEach(function (r) {
      r.addEventListener("click", function () {
        state.tipo = state.rankTipo; state.ent = r.dataset.code; state.view = "explorar";
        $("#selTipo").value = state.tipo;
        render();
      });
    });
  }

  /* ---------------- fuentes ---------------- */
  var FUENTES = [
    ["Consulta Amigable — diaria", "https://apps5.mineco.gob.pe/transparencia/Navegador/default.aspx", "Ejecución del gasto actualizada a diario: PIA, PIM, devengado, girado y avance de todas las entidades."],
    ["Consulta Amigable — mensual", "https://apps5.mineco.gob.pe/transparencia/mensual/", "Serie mensual, ideal para comparar periodos."],
    ["Datos Abiertos del MEF", "https://datosabiertos.mef.gob.pe/dataset/presupuesto-y-ejecucion-de-gasto", "CSV completos por año con el detalle de todas las entidades."],
    ["Comparativo oficial 2022–2026 (CSV)", "https://datosabiertos.mef.gob.pe/dataset/comparacion-de-presupuesto-ejecucion-gasto/resource/510bae6d-3d37-4fb2-af35-a40ce01715f4", "Archivo del MEF para comparar presupuesto y ejecución entre años."],
    ["Ley de Presupuesto 2026 (Ley N.º 32513)", "https://www.mef.gob.pe/contenidos/presu_publ/anexos/ppto2026/Ley_N_32513-LeydePpto2026.pdf", "Norma que aprueba el presupuesto inicial (PIA) del año 2026."],
    ["Anexos del presupuesto aprobado", "https://www.mef.gob.pe/es/presupuesto-del-sector-publico/aprobacion-presupuestal/nacional-regional-y-local", "Asignación inicial por pliego, fuente de financiamiento, función y proyecto."],
    ["Seguimiento de proyectos de inversión", "https://apps5.mineco.gob.pe/bingos/seguimiento_pi/Navegador/default.aspx", "Obras e inversiones: presupuesto, devengado, avance físico y entidad responsable."],
    ["Cuenta General de la República", "https://www.mef.gob.pe/es/?option=com_content&view=article&id=3801", "Cierre contable y presupuestario oficial de cada ejercicio."],
    ["Transparencia Económica (portal)", "https://www.mef.gob.pe/es/portal-de-transparencia-economica", "Módulos de ingresos, gastos, deuda, transferencias e inversiones."],
    ["Informe Global de Gestión Presupuestaria 2024", "https://www.mef.gob.pe/contenidos/presu_publ/presu_sect/Informe_Global_Gestion_Presupuestaria_2024.pdf", "Evaluación oficial del desempeño del gasto 2024."]
  ];
  function renderFuentes() {
    $("#fuentesLista").innerHTML = FUENTES.map(function (f) {
      return '<a class="fuente" href="' + f[1] + '" target="_blank" rel="noopener"><strong>' + esc(f[0]) + "</strong><span>" + esc(f[2]) + "</span></a>";
    }).join("");
  }

  /* ---------------- navegación ---------------- */
  $$(".navbtn[data-view]").forEach(function (b) {
    b.addEventListener("click", function () { state.view = b.dataset.view; render(); });
  });
  $("#selTipo").addEventListener("change", function () { state.tipo = this.value; state.ent = null; render(); });
  $("#selEntidad").addEventListener("change", function () { state.ent = this.value || null; render(); });
  $$("#rankTipoChips .chip").forEach(function (b) {
    b.addEventListener("click", function () {
      state.rankTipo = b.dataset.rt;
      $$("#rankTipoChips .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
      renderRanking();
    });
  });

  /* ---------------- render maestro ---------------- */
  function render() {
    $$(".navbtn[data-view]").forEach(function (b) { b.classList.toggle("active", b.dataset.view === state.view); });
    ["explorar", "ranking", "fuentes"].forEach(function (v) { $("#view-" + v).hidden = v !== state.view; });
    $$(".yr").forEach(function (s) { s.textContent = state.year; });
    renderYearChips();
    renderEntSelect();
    if (state.view === "explorar") {
      if (state.ent) renderEntidad();
      else { $("#panelEntidad").hidden = true; $("#panelNacional").hidden = false; renderNacional(); }
    } else if (state.view === "ranking") renderRanking();
    else renderFuentes();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("#fechaDatos").textContent = MEF.updated || "";
  renderFuentes();
  render();
})();
