/* Integración visual de la Ley N.° 32732 para Presupuesto Perú. */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    if (!window.LEY32732) return;
    var D = window.LEY32732;
    var nf = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
    var nf1 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    var STORAGE = "presupuesto-peru-ley32732-v1";
    var overrides = loadOverrides();
    var editMode = false;
    var filter = "";

    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
    function esc(v) { return String(v == null ? "" : v).replace(/[&<>\"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
    function money(v) { return v == null || isNaN(v) ? "—" : "S/ " + nf.format(Math.round(v)); }
    function moneyM(v) { return v == null || isNaN(v) ? "—" : (Math.abs(v) >= 1000000 ? "S/ " + nf1.format(v / 1000000) + " M" : money(v)); }
    function pct(v) { return v == null || isNaN(v) ? "—" : nf1.format(v) + " %"; }
    function num(v) { var n = Number(v); return isFinite(n) && n >= 0 ? n : null; }
    function isoDate(v) { if (!v) return "—"; var p = String(v).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : v; }

    function loadOverrides() {
      try { return JSON.parse(localStorage.getItem(STORAGE) || "{}") || {}; }
      catch (e) { return {}; }
    }
    function saveOverrides() {
      localStorage.setItem(STORAGE, JSON.stringify(overrides));
    }
    function rowValue(row, key) {
      return overrides[row.id] && overrides[row.id][key] != null ? num(overrides[row.id][key]) : num(row[key]);
    }
    function hasExecutionData() {
      return D.rows.some(function (r) { return rowValue(r, "dev") != null; });
    }
    function sumKey(key) {
      return D.rows.reduce(function (a, r) { var v = rowValue(r, key); return a + (v == null ? 0 : v); }, 0);
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
    function referenceProgress() {
      var start = new Date(D.effectiveDate + "T00:00:00");
      var end = new Date(D.fiscalYearEnd + "T23:59:59");
      var now = new Date();
      return clamp(daysBetween(start, now) / Math.max(1, daysBetween(start, end)) * 100, 0, 100);
    }
    function getMPContext() {
      try {
        var y = window.MEF && MEF.years && MEF.years["2026"];
        if (!y) return null;
        var arr = y.sectores || [];
        for (var i = 0; i < arr.length; i++) {
          var n = String(arr[i].name || "").toUpperCase();
          if (arr[i].code === "22" || n.indexOf("MINISTERIO PUBLICO") >= 0 || n.indexOf("MINISTERIO PÚBLICO") >= 0) return arr[i];
        }
      } catch (e) {}
      return null;
    }

    function injectNav() {
      var nav = $(".topnav");
      if (!nav || $("#navLey32732")) return;
      var b = document.createElement("button");
      b.className = "navbtn ley-nav";
      b.id = "navLey32732";
      b.type = "button";
      b.textContent = "Ley 32732";
      var help = $("#btnAyuda", nav);
      nav.insertBefore(b, help || null);
      b.addEventListener("click", showLawView);
      $$(".navbtn[data-view]", nav).forEach(function (x) {
        x.addEventListener("click", function () {
          var v = $("#view-ley32732");
          if (v) v.hidden = true;
          b.classList.remove("active");
          if (location.hash === "#ley32732") history.replaceState(null, "", location.pathname + location.search);
        });
      });
    }

    function injectView() {
      var main = $("main.wrap");
      if (!main || $("#view-ley32732")) return;
      var s = document.createElement("section");
      s.id = "view-ley32732";
      s.className = "view ley32732-view";
      s.hidden = true;
      s.innerHTML =
        '<div class="ley-hero card">' +
          '<div><span class="ley-kicker">Seguimiento normativo y presupuestario · Año Fiscal 2026</span>' +
          '<h2>Ley N.° 32732 — Ministerio Público</h2>' +
          '<p>Créditos suplementarios, reprogramación autorizada y avance de ejecución atribuible a la ley. El <strong>devengado</strong> se usa como medida de ejecución.</p></div>' +
          '<div class="ley-actions"><a class="ley-btn primary" href="' + esc(D.officialUrl) + '" target="_blank" rel="noopener">Ley oficial ↗</a></div>' +
        '</div>' +
        '<div class="ley-alert"><strong>Precisión:</strong> ' + esc(D.notes.reprogramming) + '</div>' +
        '<div id="leyKpis" class="ley-kpis"></div>' +
        '<div class="ley-grid2">' +
          '<article class="card"><div class="ley-cardhead"><div><h3>Línea de tiempo de implementación</h3><p class="note">Desde la publicación hasta el cierre fiscal.</p></div><span id="leyAsOf" class="ley-chip"></span></div><div id="leyTimeline" class="ley-timeline"></div></article>' +
          '<article class="card"><h3>Efectividad del gasto</h3><p class="note">Comparación entre monto autorizado, devengado registrado y referencia lineal al cierre de 2026.</p><div id="leyProgress"></div><div id="leyContext" class="ley-context"></div></article>' +
        '</div>' +
        '<div class="ley-grid2">' +
          '<article class="card"><h3>Resumen por genérica de gasto</h3><div id="leyGeneric"></div></article>' +
          '<article class="card"><h3>Criterios de lectura</h3><div class="ley-criteria"><p><b>Proyectado/autorizado:</b> monto individualizado por la Ley N.° 32732.</p><p><b>Ejecutado:</b> devengado atribuible a estas asignaciones, cargado en <code>data/ley32732.js</code> o mediante CSV.</p><p><b>Pendiente:</b> autorizado menos devengado. Cuando no hay dato, se muestra como saldo legal por monitorear, no como prueba de inejecución.</p><p><b>Contexto del pliego:</b> el PIM y devengado global del Ministerio Público no se atribuyen automáticamente a esta ley.</p></div></article>' +
        '</div>';
      main.appendChild(s);
      bindControls();
      renderAll();
    }

    function showLawView() {
      $$("main .view").forEach(function (v) { v.hidden = true; });
      $("#view-ley32732").hidden = false;
      $$(".topnav .navbtn").forEach(function (x) { x.classList.toggle("active", x.id === "navLey32732"); });
      history.replaceState(null, "", "#ley32732");
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function bindControls() {
      /* Los controles de edición y CSV de la tabla del Ministerio Público se retiraron
         junto con la sección "Específicas y actividades contempladas". */
    }

    function statusOf(row) {
      var d = rowValue(row, "dev");
      if (d == null) return "nodata";
      if (d <= 0) return "pending";
      if (d >= row.total) return "done";
      return "partial";
    }
    function statusLabel(s) { return {done:"Ejecutado", partial:"Parcial", pending:"Pendiente", nodata:"Sin dato"}[s] || s; }

    function renderKpis() {
      var has = hasExecutionData(), dev = sumKey("dev"), pending = Math.max(0, D.totals.newAllocation - dev);
      var expectedPct = referenceProgress(), expected = D.totals.newAllocation * expectedPct / 100;
      var updated = overrides._updated || D.updated;
      $("#leyKpis").innerHTML =
        kpi("Autorizado nuevo", moneyM(D.totals.newAllocation), "Anexo I + Anexo IX", "blue") +
        kpi("Devengado registrado", has ? moneyM(dev) : "Sin dato", has ? pct(dev / D.totals.newAllocation * 100) + " del autorizado" : "Cargue datos institucionales", has ? "green" : "gray") +
        kpi("Pendiente de ejecución", moneyM(pending), has ? "Autorizado − devengado" : "Saldo legal por monitorear", has && pending < D.totals.newAllocation ? "amber" : "red") +
        kpi("Referencia a la fecha", moneyM(expected), pct(expectedPct) + " del periodo de vigencia", "black") +
        kpi("Reprogramación D&T", moneyM(D.totals.reprogrammableDonations), "No es crédito adicional", "gold");
      $("#leyAsOf").textContent = "Datos: " + isoDate(updated);
    }
    function kpi(label, value, sub, cls) {
      return '<div class="ley-kpi ' + (cls || "") + '"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(sub) + '</small></div>';
    }

    function renderTimeline() {
      var now = new Date();
      $("#leyTimeline").innerHTML = D.timeline.map(function (x, i) {
        var complete = false;
        if (/^\d{4}-/.test(x.date)) complete = now >= new Date(x.date + "T00:00:00");
        else complete = i < 2;
        return '<div class="ley-time ' + (complete ? "complete" : "future") + '"><div class="ley-time-dot"></div><div><b>' + esc(/^\d{4}-/.test(x.date) ? isoDate(x.date) : x.date) + ' · ' + esc(x.title) + '</b><p>' + esc(x.detail) + '</p></div></div>';
      }).join("");
    }

    function renderProgress() {
      var has = hasExecutionData(), dev = sumKey("dev"), actualPct = has ? dev / D.totals.newAllocation * 100 : null;
      var expectedPct = referenceProgress();
      var gap = actualPct == null ? null : actualPct - expectedPct;
      var cls = actualPct == null ? "gray" : actualPct >= expectedPct ? "good" : actualPct >= expectedPct * 0.75 ? "warn" : "bad";
      $("#leyProgress").innerHTML =
        progressRow("Referencia lineal", expectedPct, "black") +
        progressRow("Devengado registrado", actualPct, cls) +
        '<div class="ley-gap ' + cls + '"><span>Brecha frente a referencia</span><strong>' + (gap == null ? "Sin dato" : (gap >= 0 ? "+" : "") + pct(gap)) + '</strong></div>';
      var ctx = getMPContext();
      $("#leyContext").innerHTML = ctx ?
        '<b>Contexto del pliego Ministerio Público — 2026</b><div><span>PIM total: ' + money(ctx.pim) + '</span><span>Devengado total: ' + money(ctx.dev) + '</span><span>Avance total: ' + pct(ctx.avance != null ? ctx.avance : (ctx.pim ? ctx.dev / ctx.pim * 100 : null)) + '</span></div><small>' + esc(D.notes.attribution) + '</small>' :
        '<b>Contexto del pliego</b><p>No se encontró el registro 2026 del Ministerio Público en el archivo MEF cargado.</p>';
    }
    function progressRow(label, value, cls) {
      var w = value == null ? 0 : clamp(value, 0, 100);
      return '<div class="ley-prow"><div><span>' + esc(label) + '</span><b>' + pct(value) + '</b></div><div class="ley-track"><i class="' + esc(cls) + '" style="width:' + w + '%"></i></div></div>';
    }

    function renderTable() {
      var statusFilter = $("#leyStatus").value;
      var rows = D.rows.filter(function (r) {
        var txt = (r.unit + " " + r.activity + " " + r.annex).toLowerCase();
        return (!filter || txt.indexOf(filter) >= 0) && (!statusFilter || statusOf(r) === statusFilter);
      });
      var body = rows.map(function (r) {
        var dev = rowValue(r, "dev"), cert = rowValue(r, "cert"), comp = rowValue(r, "comp"), gir = rowValue(r, "gir");
        var pending = Math.max(0, r.total - (dev || 0)), st = statusOf(r), av = dev == null ? null : dev / r.total * 100;
        return '<tr class="ley-row ' + st + '"><td><span class="ley-badge">Anexo ' + esc(r.annex) + '</span><b>' + esc(r.unit) + '</b><small>' + esc(r.activity) + '</small></td>' +
          '<td>' + genericBreakdown(r) + '</td><td>' + money(r.total) + '</td>' +
          '<td>' + editCell(r, "cert", cert) + '</td><td>' + editCell(r, "comp", comp) + '</td><td>' + editCell(r, "dev", dev) + '</td><td>' + editCell(r, "gir", gir) + '</td>' +
          '<td>' + money(pending) + '</td><td><span class="ley-status ' + st + '">' + statusLabel(st) + '</span><small>' + pct(av) + '</small></td></tr>';
      }).join("");
      $("#leyTable").innerHTML = '<div class="tbl-wrap"><table class="t ley-table"><thead><tr><th>Unidad / actividad</th><th>Específica</th><th>Autorizado</th><th>Certificado</th><th>Comprometido</th><th>Devengado</th><th>Girado</th><th>Pendiente</th><th>Estado</th></tr></thead><tbody>' + body + '</tbody></table></div><p class="note ley-count">' + rows.length + ' de ' + D.rows.length + ' registros.</p>';
    }
    function genericBreakdown(r) {
      var a = [];
      if (r.personal) a.push("2.1 " + money(r.personal));
      if (r.goods) a.push("2.3 " + money(r.goods));
      if (r.assets) a.push("2.6 " + money(r.assets));
      return a.map(function (x) { return '<span class="ley-spec">' + esc(x) + '</span>'; }).join("");
    }
    function editCell(r, key, v) {
      if (!editMode) return '<span class="ley-money">' + money(v) + '</span>';
      return '<input class="ley-num" type="number" min="0" step="1" data-id="' + esc(r.id) + '" data-key="' + esc(key) + '" value="' + (v == null ? "" : v) + '" placeholder="0">';
    }

    function renderGeneric() {
      var categories = [
        { code:"2.1", name:"Personal y obligaciones sociales", total:D.rows.reduce(function(a,r){return a+r.personal;},0) },
        { code:"2.3", name:"Bienes y servicios", total:D.rows.reduce(function(a,r){return a+r.goods;},0) },
        { code:"2.6", name:"Adquisición de activos no financieros", total:D.rows.reduce(function(a,r){return a+r.assets;},0) }
      ];
      $("#leyGeneric").innerHTML = categories.map(function (g) {
        var share = g.total / D.totals.newAllocation * 100;
        return '<div class="ley-gen"><div><b>' + esc(g.code + " · " + g.name) + '</b><span>' + money(g.total) + ' · ' + pct(share) + '</span></div><div class="ley-track"><i class="blue" style="width:' + clamp(share,0,100) + '%"></i></div></div>';
      }).join("");
    }

    function downloadTemplate() {
      var cols = ["id","anexo","unidad","actividad","autorizado","certificado","comprometido","devengado","girado","fecha_actualizacion"];
      var rows = D.rows.map(function (r) {
        return [r.id,r.annex,r.unit,r.activity,r.total,rowValue(r,"cert")||"",rowValue(r,"comp")||"",rowValue(r,"dev")||"",rowValue(r,"gir")||"",overrides._updated||D.updated];
      });
      var csv = [cols].concat(rows).map(function (r) { return r.map(csvCell).join(";"); }).join("\n");
      download("ley32732_ministerio_publico.csv", "\ufeff" + csv, "text/csv;charset=utf-8");
    }
    function csvCell(v) { var s = String(v == null ? "" : v); return '"' + s.replace(/"/g, '""') + '"'; }
    function download(name, content, type) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([content], {type:type}));
      a.download = name; a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    }
    function importCsv(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var lines = String(reader.result || "").replace(/^\ufeff/, "").split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) throw new Error("El CSV no contiene filas.");
          var header = parseCsvLine(lines[0]).map(function(x){return x.toLowerCase().trim();});
          var idx = function(n){return header.indexOf(n);};
          if (idx("id") < 0 || idx("devengado") < 0) throw new Error("Se requieren las columnas id y devengado.");
          var count = 0;
          lines.slice(1).forEach(function (line) {
            var c = parseCsvLine(line), id = c[idx("id")];
            if (!id || !D.rows.some(function(r){return r.id===id;})) return;
            overrides[id] = overrides[id] || {};
            [["cert","certificado"],["comp","comprometido"],["dev","devengado"],["gir","girado"]].forEach(function(m){
              var p=idx(m[1]); if(p>=0) overrides[id][m[0]] = c[p] === "" ? null : num(String(c[p]).replace(/\s/g,"").replace(",","."));
            });
            count++;
          });
          overrides._updated = new Date().toISOString().slice(0,10);
          saveOverrides(); renderAll();
          alert("Se importaron " + count + " registros. Los cambios se guardaron en este navegador.");
        } catch (err) { alert("No se pudo importar el CSV: " + err.message); }
        e.target.value = "";
      };
      reader.readAsText(file, "utf-8");
    }
    function parseCsvLine(line) {
      var sep = line.indexOf(";") >= 0 ? ";" : ",", out=[], cur="", q=false;
      for(var i=0;i<line.length;i++){
        var ch=line[i];
        if(ch==='"' && q && line[i+1]==='"'){cur+='"';i++;}
        else if(ch==='"') q=!q;
        else if(ch===sep && !q){out.push(cur);cur="";}
        else cur+=ch;
      }
      out.push(cur); return out;
    }

    function renderAll() {
      renderKpis(); renderTimeline(); renderProgress(); renderGeneric();
    }

    injectNav();
    injectView();
    if (location.hash === "#ley32732") showLawView();
  });
})();
