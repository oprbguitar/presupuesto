/* Ley N.° 32732 — Rediseño: distribución del presupuesto adicional por tipo de entidad.
   Cruza el catálogo de la ley con la ejecución real 2026 del MEF (data/mef.js) para
   mostrar, por entidad: demanda adicional, específica de gasto, plazo de ejecución,
   gasto publicado 2026 (devengado) y saldo por ejecutar. */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    var source = window.LEY32732_INSTITUTIONS_READY || Promise.resolve(window.LEY32732_INSTITUTIONS);
    Promise.resolve(source).then(function () {
      if (!window.LEY32732_INSTITUTIONS) return;
      var D = window.LEY32732_INSTITUTIONS;
      var nf = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
      var nf1 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
      var STORE = "presupuesto-peru-ley32732-entidades-v2";

      // Cierre del Año Fiscal 2026 — plazo general de ejecución de los créditos.
      var FISCAL_END = new Date("2026-12-31T23:59:59");

      var state = { q: "", level: "", spec: "", dept: "", exec: "", sort: "credit", page: 1, size: 30 };
      var overrides = loadOverrides();

      function $(s, c) { return (c || document).querySelector(s); }
      function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
      function esc(v) { return String(v == null ? "" : v).replace(/[&<>\"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
      function norm(v) { return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
      function money(v) { return v == null || isNaN(v) ? "—" : "S/ " + nf.format(Math.round(v)); }
      function moneyM(v) { return v == null || isNaN(v) ? "—" : (Math.abs(v) >= 1000000 ? "S/ " + nf1.format(v / 1000000) + " M" : money(v)); }
      function pct(v) { return v == null || isNaN(v) ? "—" : nf1.format(v) + " %"; }
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function isMP(e) { return norm(e.name).indexOf("ministerio publico") >= 0; }
      function loadOverrides() { try { return JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { return {}; } }
      function saveOverrides() { localStorage.setItem(STORE, JSON.stringify(overrides)); }

      /* ---------- Específica de gasto inferida del anexo / artículo ---------- */
      function specOf(e) {
        var refs = (e.refs || []).join(" ");
        var has = function (r) { return refs.indexOf(r) >= 0; };
        // Proyectos de inversión: activos no financieros
        if (has("Anexo VII") || has("Anexo VIII") || has("Anexo XIV") || has("Anexo XV"))
          return { code: "2.6", name: "Adquisición de activos no financieros", tag: "Proyectos de inversión" };
        // Gratificaciones / CTS del personal CAS
        if (has("Anexo IX"))
          return { code: "2.1", name: "Personal y obligaciones sociales", tag: "Gratificaciones y CTS (D.L. 1057)" };
        // Recursos determinados (canon)
        if (has("Anexo X") || has("Anexo XI") || has("Anexo XII") || has("Anexo XIII"))
          return { code: "—", name: "Recursos determinados (canon y regalías)", tag: "Estimación de mayores ingresos" };
        // Anexo I / bonificaciones docentes
        if (has("Anexo I") || has("Anexo II") || has("Anexo III") || has("Anexo IV") || has("Anexo V") || has("Anexo VI"))
          return { code: "2.1 / 2.3", name: "Personal, bienes y servicios", tag: "Crédito suplementario" };
        return { code: "—", name: "Según articulado", tag: "Medida dispuesta por la ley" };
      }

      /* ---------- Cruce con la ejecución real 2026 del MEF ---------- */
      var MEFEXEC = buildMefIndex();
      function buildMefIndex() {
        var idx = { pliego: {}, regional: {}, muni: {}, dept: {} };
        try {
          var y = window.MEF && MEF.years && MEF.years["2026"];
          if (!y) return idx;
          if (y.pliegos) Object.keys(y.pliegos).forEach(function (s) {
            (y.pliegos[s] || []).forEach(function (p) { if (p.code) idx.pliego[String(p.code)] = p; });
          });
          (y.regionales || []).forEach(function (r) { if (r.code) idx.regional[String(r.code)] = r; });
          (y.munis_lima || []).forEach(function (m) { if (m.code) idx.muni[String(m.code).split("-")[0]] = m; });
          (y.departamentos || []).forEach(function (d) { if (d.code) idx.dept[String(d.code)] = d; });
        } catch (e) {}
        return idx;
      }
      // Devuelve {pim, dev, avance, scope} para la entidad, o null.
      function mefFor(e) {
        var code = String(e.code || "");
        if (e.level === "Gobierno Nacional") {
          var p = MEFEXEC.pliego[code] || (code && MEFEXEC.pliego[code.replace(/^0+/, "")]);
          if (p) return { pim: p.pim, dev: p.dev, avance: avanceOf(p), scope: "entidad" };
        } else if (e.level === "Gobierno Regional") {
          var r = MEFEXEC.regional[code];
          if (r) return { pim: r.pim, dev: r.dev, avance: avanceOf(r), scope: "entidad" };
        } else if (e.level === "Gobierno Local") {
          var m = MEFEXEC.muni[code];
          if (m) return { pim: m.pim, dev: m.dev, avance: avanceOf(m), scope: "entidad" };
          var dcode = code.slice(0, 2);
          var d = MEFEXEC.dept[dcode];
          if (d) return { pim: d.pim, dev: d.dev, avance: avanceOf(d), scope: "departamento" };
        }
        return null;
      }
      function avanceOf(r) {
        if (r.avance != null && !isNaN(r.avance)) return r.avance;
        return r.pim ? r.dev / r.pim * 100 : null;
      }

      /* ---------- Modelo de fila enriquecido ---------- */
      function legalTotal(e) { return (Number(e.credit) || 0) + (Number(e.determined) || 0); }
      function rowModel(e) {
        var credit = Number(e.credit) || 0;
        var determined = Number(e.determined) || 0;
        var mef = mefFor(e);
        var override = overrides[e.id];
        // Ejecución 2026 atribuible al crédito: dato cargado a mano o estimación proporcional
        // al avance general del pliego (el devengado agregado del MEF no aísla el crédito).
        var execAmount = null, execMode = "none", avance = null;
        if (override != null && override !== "" && !isNaN(override)) {
          execAmount = clamp(Number(override), 0, credit || Number(override));
          execMode = "manual";
          avance = credit ? execAmount / credit * 100 : null;
        } else if (mef && mef.avance != null && credit > 0) {
          avance = mef.avance;
          execAmount = credit * clamp(avance, 0, 100) / 100;
          execMode = mef.scope === "entidad" ? "estimado" : "referencia";
        }
        var pending = execAmount == null ? null : Math.max(0, credit - execAmount);
        return {
          e: e, credit: credit, determined: determined, spec: specOf(e), mef: mef,
          execAmount: execAmount, pending: pending, avance: avance, execMode: execMode
        };
      }

      function execStatus(m) {
        if (m.execMode === "none" || m.avance == null) return "nodata";
        if (m.avance <= 0.5) return "pending";
        if (m.avance >= 99.5) return "done";
        return "partial";
      }

      /* ---------- Inyección de la vista ---------- */
      function waitForLawView(tries) {
        var view = $("#view-ley32732");
        if (view) { inject(view); return; }
        if (tries > 0) setTimeout(function () { waitForLawView(tries - 1); }, 60);
      }

      function inject(view) {
        if ($("#leyInstituciones")) return;
        var section = document.createElement("section");
        section.id = "leyInstituciones";
        section.className = "ley-dist";
        section.innerHTML =
          '<div class="card ley-dist-card">' +
            '<div class="ley-cardhead">' +
              '<div><span class="ley-kicker">Distribución del crédito suplementario · Año Fiscal 2026</span>' +
              '<h3>¿A qué entidades llega el presupuesto adicional y cuánto se ha ejecutado?</h3>' +
              '<p class="note">Cada entidad individualizada en la Ley N.° 32732 con el monto que se le asignó, la específica de gasto, el plazo para ejecutarlo y su <strong>ejecución 2026 publicada por el MEF</strong> (en amarillo) frente al saldo por ejecutar.</p></div>' +
              '<div class="ley-actions"><button class="ley-btn" id="leyInstCsv">Descargar CSV</button></div>' +
            '</div>' +
            '<div class="ley-typebar" id="leyTypeBar"></div>' +
            '<div id="leyInstKpis" class="ley-dist-kpis"></div>' +
            '<div class="ley-dist-legend">' +
              '<span><i class="sw amarillo"></i> Gasto publicado 2026 (devengado)</span>' +
              '<span><i class="sw gris"></i> Saldo por ejecutar</span>' +
              '<span class="ley-dist-legend-note">La ejecución 2026 proviene de la Consulta Amigable del MEF. El devengado agregado del pliego no aísla por sí solo el crédito de esta ley: donde no hay dato exacto, se estima en proporción al avance general del pliego.</span>' +
            '</div>' +
            '<div class="ley-dist-filters">' +
              '<input id="leyInstSearch" type="search" placeholder="Buscar entidad, código o departamento…">' +
              '<select id="leyInstSpec"><option value="">Todas las específicas de gasto</option><option value="2.6">2.6 · Activos no financieros (proyectos)</option><option value="2.1">2.1 · Personal (gratificaciones/CTS)</option><option value="2.1 / 2.3">2.1 / 2.3 · Personal, bienes y servicios</option><option value="det">Recursos determinados (canon)</option></select>' +
              '<select id="leyInstDept"><option value="">Todos los departamentos</option></select>' +
              '<select id="leyInstExec"><option value="">Toda la ejecución</option><option value="done">Ejecutado (≥100%)</option><option value="partial">En ejecución</option><option value="pending">Sin avance</option><option value="nodata">Sin dato MEF</option></select>' +
              '<select id="leyInstSort"><option value="credit">Ordenar: mayor demanda adicional</option><option value="avance">Ordenar: mayor avance 2026</option><option value="pending">Ordenar: mayor saldo por ejecutar</option><option value="name">Ordenar: nombre (A–Z)</option></select>' +
            '</div>' +
            '<div id="leyInstList" class="ley-dist-list"></div>' +
            '<div id="leyInstPager" class="ley-dist-pager"></div>' +
          '</div>' +
          '<div class="card ley-measures-card">' +
            '<div class="ley-cardhead"><div><h3>Medidas institucionales previstas en el articulado</h3><p class="note">Transferencias, modificaciones presupuestarias, créditos, bonos y otras autorizaciones expresamente señaladas por la ley.</p></div>' +
            '<input id="leyMeasureSearch" class="ley-measure-search" type="search" placeholder="Buscar artículo, entidad o finalidad…"></div>' +
            '<div id="leyMeasuresTable"></div>' +
          '</div>';

        var mpTable = $("#leyTable");
        var mpCard = mpTable ? mpTable.closest(".card") : null;
        if (mpCard && mpCard.parentNode) mpCard.parentNode.insertBefore(section, mpCard.nextSibling);
        else view.appendChild(section);

        fillFilters();
        renderTypeBar();
        bind();
        renderAll();
      }

      var LEVELS = [
        { key: "", label: "Todas", sub: "Todo el crédito" },
        { key: "Gobierno Nacional", label: "Gobierno Nacional", sub: "Pliegos y organismos" },
        { key: "Gobierno Regional", label: "Gobiernos Regionales", sub: "26 departamentos" },
        { key: "Gobierno Local", label: "Gobiernos Locales", sub: "Municipalidades" }
      ];

      function baseList() {
        return D.institutions.filter(function (e) { return !isMP(e); });
      }

      function renderTypeBar() {
        var all = baseList();
        $("#leyTypeBar").innerHTML = LEVELS.map(function (lv) {
          var list = lv.key ? all.filter(function (e) { return e.level === lv.key; }) : all;
          var credit = list.reduce(function (a, e) { return a + (Number(e.credit) || 0); }, 0);
          return '<button class="ley-type' + (state.level === lv.key ? " active" : "") + '" data-level="' + esc(lv.key) + '">' +
            '<span class="ley-type-label">' + esc(lv.label) + '</span>' +
            '<strong>' + moneyM(credit) + '</strong>' +
            '<small>' + nf.format(list.length) + ' entidades · ' + esc(lv.sub) + '</small></button>';
        }).join("");
        $$("#leyTypeBar .ley-type").forEach(function (b) {
          b.addEventListener("click", function () { state.level = this.dataset.level; state.page = 1; renderTypeBar(); renderAll(); });
        });
      }

      function fillFilters() {
        var depts = {};
        baseList().forEach(function (e) { if (e.department) depts[e.department] = 1; });
        $("#leyInstDept").innerHTML += Object.keys(depts).sort(function (a, b) { return a.localeCompare(b, "es"); })
          .map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join("");
      }

      function bind() {
        $("#leyInstSearch").addEventListener("input", function () { state.q = norm(this.value); state.page = 1; renderList(); });
        $("#leyInstSpec").addEventListener("change", function () { state.spec = this.value; state.page = 1; renderList(); });
        $("#leyInstDept").addEventListener("change", function () { state.dept = this.value; state.page = 1; renderList(); });
        $("#leyInstExec").addEventListener("change", function () { state.exec = this.value; state.page = 1; renderList(); });
        $("#leyInstSort").addEventListener("change", function () { state.sort = this.value; state.page = 1; renderList(); });
        $("#leyInstCsv").addEventListener("click", downloadCsv);
        $("#leyMeasureSearch").addEventListener("input", function () { renderMeasures(norm(this.value)); });
      }

      function specMatch(m, filter) {
        if (!filter) return true;
        if (filter === "det") return m.spec.code === "—" && /determinados/.test(m.spec.name);
        return m.spec.code.indexOf(filter) >= 0;
      }

      function models() {
        var out = baseList().filter(function (e) {
          if (state.level && e.level !== state.level) return false;
          if (state.dept && e.department !== state.dept) return false;
          if (state.q) {
            var hay = norm([e.name, e.code, e.department, (e.refs || []).join(" ")].join(" "));
            if (hay.indexOf(state.q) < 0) return false;
          }
          return true;
        }).map(rowModel).filter(function (m) {
          if (!specMatch(m, state.spec)) return false;
          if (state.exec && execStatus(m) !== state.exec) return false;
          return true;
        });
        out.sort(function (a, b) {
          if (state.sort === "name") return a.e.name.localeCompare(b.e.name, "es");
          if (state.sort === "avance") return (b.avance || -1) - (a.avance || -1);
          if (state.sort === "pending") return (b.pending || 0) - (a.pending || 0);
          return (b.credit || 0) - (a.credit || 0);
        });
        return out;
      }

      /* ---------- KPIs ---------- */
      function renderKpis(list) {
        var credit = list.reduce(function (a, m) { return a + m.credit; }, 0);
        var determined = list.reduce(function (a, m) { return a + m.determined; }, 0);
        var withMef = list.filter(function (m) { return m.mef && m.mef.avance != null; });
        var sumPim = withMef.reduce(function (a, m) { return a + (m.mef.pim || 0); }, 0);
        var sumDev = withMef.reduce(function (a, m) { return a + (m.mef.dev || 0); }, 0);
        var wAvance = sumPim ? sumDev / sumPim * 100 : null;
        var execCredit = list.reduce(function (a, m) { return a + (m.execAmount || 0); }, 0);
        var pendCredit = Math.max(0, credit - execCredit);
        $("#leyInstKpis").innerHTML =
            kpi("Entidades", nf.format(list.length), state.level ? levelLabel(state.level) : "Todos los niveles", "blue") +
            kpi("Demanda adicional", moneyM(credit), "Crédito asignado por la ley", "red") +
            kpi("Gasto publicado 2026", moneyM(execCredit), wAvance == null ? "Sin dato MEF" : pct(wAvance) + " de avance del pliego", "amarillo") +
            kpi("Saldo por ejecutar", moneyM(pendCredit), "Estimado sobre el crédito", "gris") +
            kpi("Recursos determinados", moneyM(determined), "Canon y regalías (no es crédito nuevo)", "gold");
      }
      function levelLabel(k) { var f = LEVELS.filter(function (l) { return l.key === k; })[0]; return f ? f.label : k; }
      function kpi(lbl, val, sub, cls) { return '<div class="ley-dist-kpi ' + cls + '"><span>' + esc(lbl) + '</span><strong>' + esc(val) + '</strong><small>' + esc(sub) + '</small></div>'; }

      /* ---------- Plazo de ejecución ---------- */
      function plazo() {
        var now = new Date();
        var days = Math.ceil((FISCAL_END.getTime() - now.getTime()) / 86400000);
        return { label: "Año Fiscal 2026", detail: "Ejecución hasta el 31/12/2026", days: days };
      }

      /* ---------- Lista de entidades ---------- */
      function renderList() {
        var list = models();
        renderKpis(list);
        var totalPages = Math.max(1, Math.ceil(list.length / state.size));
        if (state.page > totalPages) state.page = totalPages;
        var start = (state.page - 1) * state.size;
        var pz = plazo();
        var cards = list.slice(start, start + state.size).map(function (m) { return entityCard(m, pz); }).join("");
        $("#leyInstList").innerHTML = cards ||
          '<p class="ley-empty">No se encontraron entidades con estos filtros.</p>';
        $$("#leyInstList .ley-ent-dev").forEach(function (inp) {
          inp.addEventListener("change", function () {
            var v = this.value.trim();
            if (v === "") delete overrides[this.dataset.id];
            else overrides[this.dataset.id] = Math.max(0, Number(v) || 0);
            saveOverrides(); renderList();
          });
        });
        renderPager(totalPages, list.length, start);
      }

      function entityCard(m, pz) {
        var e = m.e, st = execStatus(m);
        var avW = m.avance == null ? 0 : clamp(m.avance, 0, 100);
        var loc = [e.department, e.province].filter(Boolean).join(" · ") || "Ámbito nacional";
        var execNote = m.execMode === "manual" ? "Dato cargado manualmente"
          : m.execMode === "estimado" ? "Estimado según avance del pliego (MEF)"
          : m.execMode === "referencia" ? "Referencia: avance de los gobiernos locales del departamento"
          : "Sin ejecución 2026 publicada para esta entidad";
        var levelCls = e.level === "Gobierno Nacional" ? "n" : e.level === "Gobierno Regional" ? "r" : "l";
        var refs = (e.refs || []).map(function (r) { return '<span class="ley-ref">' + esc(r) + '</span>'; }).join(" ");
        var determined = m.determined ? '<div class="ley-ent-det">+ ' + money(m.determined) + ' <small>en recursos determinados (canon)</small></div>' : "";

        return '<div class="ley-ent ' + st + '">' +
          '<div class="ley-ent-main">' +
            '<div class="ley-ent-id">' +
              '<span class="ley-lvl ' + levelCls + '">' + esc(e.level) + '</span>' +
              '<b>' + esc(e.name) + '</b>' +
              '<small>' + (e.code ? "Código " + esc(e.code) + " · " : "") + esc(loc) + '</small>' +
              '<div class="ley-ent-refs">' + (refs || "") + '</div>' +
            '</div>' +
            '<div class="ley-ent-spec">' +
              '<span class="ley-spec-code">' + esc(m.spec.code) + '</span>' +
              '<div><b>' + esc(m.spec.name) + '</b><small>' + esc(m.spec.tag) + '</small></div>' +
            '</div>' +
            '<div class="ley-ent-plazo">' +
              '<span class="ley-plazo-badge">' + esc(pz.label) + '</span>' +
              '<small>' + esc(pz.detail) + '</small>' +
              (pz.days > 0 ? '<small class="ley-days">Faltan ' + pz.days + ' días</small>' : '<small class="ley-days over">Plazo vencido</small>') +
            '</div>' +
          '</div>' +
          '<div class="ley-ent-exec">' +
            '<div class="ley-ent-amounts">' +
              '<div class="amt demand"><span>Demanda adicional</span><strong>' + money(m.credit) + '</strong></div>' +
              '<div class="amt exec"><span>Gasto publicado 2026</span><strong>' + (m.execAmount == null ? "Sin dato" : money(m.execAmount)) + '</strong></div>' +
              '<div class="amt rest"><span>Falta por ejecutar</span><strong>' + (m.pending == null ? "—" : money(m.pending)) + '</strong></div>' +
            '</div>' +
            '<div class="ley-ent-bar" title="' + esc(execNote) + '">' +
              '<i class="fill" style="width:' + avW + '%"></i>' +
              '<span class="ley-ent-pctlabel">' + (m.avance == null ? "Sin avance MEF" : pct(m.avance) + " ejecutado") + '</span>' +
            '</div>' +
            '<div class="ley-ent-foot">' +
              '<span class="ley-ent-status ' + st + '">' + statusLabel(st) + '</span>' +
              '<span class="ley-ent-note">' + esc(execNote) + '</span>' +
              '<label class="ley-ent-edit">Dato exacto S/ <input class="ley-ent-dev" type="number" min="0" step="1" data-id="' + esc(e.id) + '" value="' + (m.execMode === "manual" ? m.execAmount : "") + '" placeholder="opcional"></label>' +
            '</div>' +
            determined +
          '</div>' +
        '</div>';
      }
      function statusLabel(s) { return { nodata: "Sin dato", pending: "Sin avance", partial: "En ejecución", done: "Ejecutado" }[s] || s; }

      function renderPager(totalPages, total, start) {
        var end = Math.min(total, start + state.size);
        $("#leyInstPager").innerHTML = '<span>Mostrando ' + (total ? start + 1 : 0) + '–' + end + ' de ' + nf.format(total) + ' entidades</span>' +
          '<div><button class="ley-btn" id="leyPrev" ' + (state.page <= 1 ? "disabled" : "") + '>← Anterior</button>' +
          '<span>Página ' + state.page + ' de ' + totalPages + '</span>' +
          '<button class="ley-btn" id="leyNext" ' + (state.page >= totalPages ? "disabled" : "") + '>Siguiente →</button></div>';
        $("#leyPrev").addEventListener("click", function () { if (state.page > 1) { state.page--; renderList(); window.scrollTo({ top: pos(), behavior: "smooth" }); } });
        $("#leyNext").addEventListener("click", function () { if (state.page < totalPages) { state.page++; renderList(); window.scrollTo({ top: pos(), behavior: "smooth" }); } });
        function pos() { var el = $("#leyInstituciones"); return el ? el.getBoundingClientRect().top + window.scrollY - 70 : 0; }
      }

      /* ---------- Medidas del articulado ---------- */
      function renderMeasures(query) {
        var filtered = D.measures.filter(function (m) { return !query || norm([m.actor, m.recipient, m.ref, m.title, m.purpose, m.type].join(" ")).indexOf(query) >= 0; });
        var rows = filtered.map(function (m) {
          return '<tr><td><span class="ley-ref">' + esc(m.ref) + '</span><b>' + esc(m.title) + '</b><small>' + esc(m.type) + '</small></td><td>' + esc(m.actor) + '</td><td>' + esc(m.recipient) + '</td><td>' + money(m.amount) + '</td><td><span class="ley-purpose">' + esc(m.purpose) + '</span><small>' + esc(m.source || "") + '</small></td></tr>';
        }).join("");
        $("#leyMeasuresTable").innerHTML = '<div class="tbl-wrap"><table class="t ley-measures-table"><thead><tr><th>Medida / referencia</th><th>Entidad habilitada</th><th>Beneficiario o destino</th><th>Monto</th><th>Finalidad y fuente</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="note ley-count">' + filtered.length + ' medidas.</p>';
      }

      /* ---------- Exportación CSV ---------- */
      function csvCell(v) { var s = String(v == null ? "" : v); return '"' + s.replace(/"/g, '""') + '"'; }
      function downloadCsv() {
        var cols = ["id", "codigo", "entidad", "nivel", "departamento", "especifica_gasto", "demanda_adicional", "recursos_determinados", "plazo", "avance_pliego_2026_pct", "gasto_publicado_2026", "falta_por_ejecutar"];
        var rows = models().map(function (m) {
          return [m.e.id, m.e.code, m.e.name, m.e.level, m.e.department, m.spec.code + " " + m.spec.name, m.credit, m.determined,
            "Hasta 31/12/2026", m.avance == null ? "" : m.avance.toFixed(1), m.execAmount == null ? "" : Math.round(m.execAmount), m.pending == null ? "" : Math.round(m.pending)];
        });
        var csv = [cols].concat(rows).map(function (r) { return r.map(csvCell).join(";"); }).join("\n");
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
        a.download = "ley32732_distribucion_por_entidad.csv"; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }

      function renderAll() { renderList(); renderMeasures(norm(($("#leyMeasureSearch") || {}).value || "")); }
      waitForLawView(80);
    }).catch(function (err) {
      console.error("No se pudo inicializar la distribución por entidad de la Ley 32732", err);
    });
  });
})();
