/* Presupuesto Perú — vistas de panorama: Avance 2026, Leyes 2026–2027, Fenómeno El Niño, Programas e infancia.
   Lee window.MEF (Consulta Amigable), window.EXTRA (cortes 2026) y window.LEYES2026 (normas curadas). */
(function () {
  "use strict";
  var MEF = window.MEF || { years: {} }, EX = window.EXTRA || {}, LY = window.LEYES2026 || { normas: [], nino: [] };
  var YEARS = Object.keys(MEF.years).sort(), CUR = YEARS[YEARS.length - 1];
  var D = MEF.years[CUR] || {};
  var nf0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function title(s) { return String(s || "").toLowerCase().replace(/(^|\s|\/|\(|-)([a-záéíóúñ])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Del|La|Las|Los|Y|E|En|Por|Para|A|Al|El|Con)\b/g, function (w) { return w.toLowerCase(); }).replace(/^./, function (c) { return c.toUpperCase(); }); }
  function cleanName(s) { s = String(s || "").replace(/^'/, ""); return s === "FICTICIO" ? "Gobiernos locales (municipalidades en conjunto)" : s; }
  function M(n) {
    if (n == null || isNaN(n)) return "—";
    if (Math.abs(n) >= 1e9) return "S/ " + nf1.format(n / 1e9) + " mil mill.";
    if (Math.abs(n) >= 1e6) return "S/ " + nf1.format(n / 1e6) + " mill.";
    return "S/ " + nf0.format(n);
  }
  function S(n) { return n == null ? "—" : "S/ " + nf0.format(Math.round(n)); }
  function P(n) { return n == null || isNaN(n) ? "—" : nf1.format(n) + " %"; }
  function av(o) { return o && o.pim ? (o.dev || 0) / o.pim * 100 : (o && o.avance != null ? o.avance : null); }
  function pc(p) { return p == null ? "" : p >= 85 ? "ok" : p >= 70 ? "mid" : "bad"; }
  function bc(p) { return p >= 85 ? "ok" : p >= 70 ? "mid" : ""; }
  function fdate(iso) {
    if (!iso) return "—";
    var p = String(iso).split("-"); var mm = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
    return p.length === 3 ? (+p[2]) + " " + mm[+p[1] - 1] + " " + p[0] : iso;
  }
  var CORTE = EX.updated || MEF.updated || "";
  function dayOfYear(iso) { var d = new Date(iso + "T12:00:00"), s = new Date(d.getFullYear(), 0, 1, 12); return Math.round((d - s) / 864e5) + 1; }
  var DOY = CORTE ? dayOfYear(CORTE) : 365, DIY = 365, LEFT = DIY - DOY;

  function hrow(name, sub, val, pctv, extra, attrs) {
    var w = Math.max(0, Math.min(100, pctv || 0));
    return '<div class="hrow' + (attrs ? " clickable" : "") + '"' + (attrs || "") + '><div class="h-name">' + esc(name) + (sub ? "<small>" + sub + "</small>" : "") +
      '</div><div class="bar"><i class="' + (extra || bc(pctv)) + '" style="width:' + w + '%"></i></div><div class="h-val">' + val + "</div></div>";
  }
  function execRows(list, opts) {
    opts = opts || {};
    return list.slice().sort(function (a, b) { return (b.pim || 0) - (a.pim || 0); }).map(function (x) {
      var a = av(x);
      return hrow(opts.clean ? title(cleanName(x.name)) : title(x.name), M(x.dev) + " de " + M(x.pim), '<span class="pct ' + pc(a) + '">' + P(a) + "</span>", a, null, opts.attr ? opts.attr(x) : "");
    }).join("");
  }
  function mlist(inner, cls, n) {
    return '<div class="mlist ' + (cls || "") + '">' + inner + "</div>" + (n ? '<div class="mlist-foot"><span>' + n + ' registros · desplázate dentro de la lista</span><button type="button" data-mlist-toggle>Ver todo</button></div>' : "");
  }
  function src(txt, url) { return '<p class="src">Fuente: ' + (url ? '<a href="' + url + '" target="_blank" rel="noopener">' + esc(txt) + " ↗</a>" : esc(txt)) + "</p>"; }
  var MEFURL = "https://apps5.mineco.gob.pe/transparencia/Navegador/default.aspx";

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-mlist-toggle]");
    if (!b) return;
    var box = b.closest(".mlist-foot").previousElementSibling;
    var open = box.classList.toggle("open");
    b.textContent = open ? "Contraer" : "Ver todo";
  });

  /* ----------- gráfico mensual: barras de devengado mensual + línea acumulada vs PIM ----------- */
  function monthChart(meses, pim) {
    if (!meses || !meses.length) return '<p class="note">Sin serie mensual.</p>';
    var W = 760, H = 300, pl = 54, pr = 46, pt = 22, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
    var max = 0; meses.forEach(function (m) { if ((m.dev || 0) > max) max = m.dev; }); max *= 1.15;
    var n = 12, gw = iw / n, bw = gw * 0.56, acc = 0, pts = [];
    var g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Devengado mensual y avance acumulado ' + CUR + '" font-family="IBM Plex Sans,sans-serif">';
    for (var t = 0; t <= 4; t++) {
      var y = pt + ih - ih * t / 4;
      g += '<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="#e2ded5"/>' +
        '<text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#6b6b75" font-family="IBM Plex Mono,monospace">' + nf0.format(max * t / 4 / 1e9) + "</text>" +
        '<text x="' + (W - pr + 6) + '" y="' + (y + 4) + '" font-size="10" fill="#9b0c23" font-family="IBM Plex Mono,monospace">' + (25 * t) + "%</text>";
    }
    // ritmo lineal ideal
    g += '<line x1="' + pl + '" y1="' + (pt + ih) + '" x2="' + (W - pr) + '" y2="' + pt + '" stroke="#9b0c23" stroke-dasharray="4 4" stroke-width="1" opacity=".5"/>';
    var MN = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
    for (var i = 0; i < n; i++) {
      var cx = pl + gw * i + gw / 2, m = meses[i];
      g += '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#4a4a55">' + MN[i] + "</text>";
      if (!m) continue;
      var bh = ih * (m.dev || 0) / max, partial = i === meses.length - 1 && LEFT > 0;
      g += '<rect x="' + (cx - bw / 2) + '" y="' + (pt + ih - bh) + '" width="' + bw + '" height="' + bh + '" fill="' + (partial ? "#8a8a94" : "#16161d") + '"><title>' + esc(MN[i] + ": " + S(m.dev) + (partial ? " (mes en curso)" : "")) + "</title></rect>";
      acc += m.dev || 0;
      pts.push([pl + gw * (i + 1), pt + ih - ih * Math.min(1, acc / pim)]);
    }
    g += '<polyline fill="none" stroke="#c8102e" stroke-width="2.5" points="' + pl + "," + (pt + ih) + " " + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
    var lp = pts[pts.length - 1];
    if (lp) g += '<circle cx="' + lp[0] + '" cy="' + lp[1] + '" r="4" fill="#c8102e"/><text x="' + (lp[0] - 6) + '" y="' + (lp[1] - 9) + '" text-anchor="end" font-size="12" font-weight="600" fill="#9b0c23" font-family="IBM Plex Mono,monospace">' + P(acc / pim * 100) + "</text>";
    g += '<text x="' + pl + '" y="12" font-size="10" fill="#6b6b75">Devengado mensual (S/ mil mill.)</text><text x="' + (W - pr) + '" y="12" font-size="10" text-anchor="end" fill="#9b0c23">Acumulado ÷ PIM · discontinua: ritmo lineal</text>';
    return g + "</svg>";
  }

  /* ----------- puente PIA → PIM ----------- */
  function bridge(pia, pim) {
    var l1 = 4160277816, l2 = 8228414502, otras = pim - pia - l1 - l2;
    var parts = [["PIA (Ley 32513)", pia, "#16161d"], ["Ley 32732", l1, "#c8102e"], ["Ley 32744", l2, "#f2b705"], ["Otras modificaciones*", otras, "#3b5bdb"]];
    var tot = pia + l1 + l2 + Math.max(0, otras);
    var bar = '<div style="display:flex;height:28px;border-radius:3px;overflow:hidden;margin:var(--sp-3) 0">' + parts.map(function (p) {
      return '<i title="' + esc(p[0] + ": " + M(p[1])) + '" style="display:block;width:' + Math.max(0, p[1]) / tot * 100 + '%;background:' + p[2] + '"></i>';
    }).join("") + "</div>";
    var leg = '<div class="stat-list">' + parts.map(function (p) {
      return '<div class="stat"><div class="s-lbl"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + p[2] + ';margin-right:6px"></span>' + esc(p[0]) + '</div><div class="s-val">' + M(p[1]) + '</div><div class="s-sub">' + P(p[1] / pia * 100) + " del PIA</div></div>";
    }).join("") + "</div>";
    return bar + leg + '<p class="src" style="margin-top:var(--sp-3)">* Saldos de balance, donaciones y transferencias, recursos determinados y otras incorporaciones registradas por el MEF. PIM al ' + fdate(CORTE) + ".</p>";
  }

  /* =================== AVANCE 2026 =================== */
  function renderInicio() {
    var t = EX.total || D.total || {};
    var a = av(t), elapsed = DOY / DIY * 100, saldo = (t.pim || 0) - (t.dev || 0);
    var perDay = LEFT > 0 ? saldo / LEFT : 0;
    var niveles = (D.niveles || []);
    var html = '<div class="grid">' +
      '<div class="card c8"><div class="hero-fig"><div>' +
        '<p class="kicker" style="font-size:var(--fs-label);font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-mute)">Avance de ejecución nacional</p>' +
        '<div class="big">' + nf1.format(a) + "<small>%</small></div>" +
        '<p class="lede">Al <b>' + fdate(CORTE) + "</b> el Estado devengó <b>" + M(t.dev) + "</b> de un presupuesto vigente de <b>" + M(t.pim) + "</b>. Quedan <b>" + M(saldo) + "</b> por ejecutar en " + LEFT + " días: unos <b>" + M(perDay) + " por día</b>.</p>" +
        '</div><div>' +
        '<div class="pace" role="img" aria-label="Avance frente al tiempo transcurrido"><i style="width:' + a + '%"></i><span class="mark" style="left:' + elapsed + '%"></span></div>' +
        '<div class="pace-legend"><span>Ejecutado ' + P(a) + "</span><span style=\"color:var(--accent-deep)\">Año transcurrido " + P(elapsed) + "</span></div>" +
        '<p class="note" style="margin-top:var(--sp-3)">' + (a < elapsed ? "La ejecución va <b>" + nf1.format(elapsed - a) + " puntos</b> por debajo del ritmo del calendario; diciembre suele concentrar el mayor devengado del año." : "La ejecución va al ritmo del calendario o por encima.") + "</p>" +
        '<div class="stat-list two" style="margin-top:var(--sp-4)">' +
          stat("PIA", M(t.pia), "presupuesto inicial") + stat("PIM", M(t.pim), "+" + M((t.pim || 0) - (t.pia || 0)) + " incorporado") +
          stat("Certificado", M(t.cert), P(t.cert / t.pim * 100) + " del PIM") + stat("Girado", M(t.gir), "pagado") +
        "</div></div></div>" + src("MEF — Consulta Amigable (actividades y proyectos)", MEFURL) + "</div>" +
      '<div class="card c4"><div class="phead"><h3>Por nivel de gobierno</h3><button class="btn" type="button" data-go="ranking">Ver ranking →</button></div>' +
        niveles.map(function (n) { var x = av(n); return hrow(title(n.name), M(n.dev) + " de " + M(n.pim), '<span class="pct ' + pc(x) + '">' + P(x) + "</span>", x); }).join("") +
        '<p class="note" style="margin-top:var(--sp-4)">Los gobiernos locales son el nivel más rezagado: su gasto depende de obras municipales y del canon.</p></div>' +
      '<div class="card c8"><div class="phead"><h3>Ritmo mensual del gasto ' + CUR + '</h3><span class="src">Noviembre parcial (gris)</span></div><div class="chartbox">' + monthChart(EX.meses, t.pim) + "</div></div>" +
      '<div class="card c4"><h3>Por fuente de financiamiento</h3><p class="note">Las leyes 32732 y 32744 se financian en parte con endeudamiento (operaciones oficiales de crédito).</p>' + execRows(EX.fuentes || [], { clean: true }) + "</div>" +
      '<div class="card c12"><div class="phead"><h3>¿Por qué el PIM es mayor que el PIA? Dos leyes de crédito suplementario ampliaron el presupuesto 2026</h3><button class="btn primary" type="button" data-go="leyes">Ver las leyes y su avance →</button></div>' + bridge(t.pia, t.pim) + "</div>" +
      '<div class="card c6"><h3>¿En qué gasta? Genéricas de gasto</h3>' + mlist(execRows(EX.genericas || []), "short") + "</div>" +
      '<div class="card c6"><h3>¿Para qué gasta? Funciones</h3>' + mlist(execRows(EX.funciones || []), "short", (EX.funciones || []).length) + "</div>" +
      '<div class="card c6"><h3>¿Dónde gasta? Departamentos</h3><p class="note">Gasto de los tres niveles de gobierno ubicado por departamento.</p>' + mlist(execRows(EX.departamentos || []), "", (EX.departamentos || []).length) + "</div>" +
      '<div class="card c6"><h3>Sectores con más presupuesto sin ejecutar</h3><p class="note">Saldo = PIM − devengado. Clic para abrir el sector.</p>' + mlist(saldoRows(), "", (D.sectores || []).length) + "</div>" +
      "</div>";
    $("#inicioBody").innerHTML = html;
    $$("#inicioBody [data-sec]").forEach(function (r) { r.addEventListener("click", function () { window.APP && APP.open("sector", r.dataset.sec); }); });
  }
  function stat(l, v, s) { return '<div class="stat"><div class="s-lbl">' + l + '</div><div class="s-val">' + v + '</div><div class="s-sub">' + (s || "") + "</div></div>"; }
  function saldoRows() {
    var l = (D.sectores || []).slice().sort(function (a, b) { return ((b.pim || 0) - (b.dev || 0)) - ((a.pim || 0) - (a.dev || 0)); });
    var mx = l.length ? (l[0].pim - l[0].dev) : 1;
    return l.map(function (s) {
      var sd = (s.pim || 0) - (s.dev || 0), a = av(s);
      return hrow(title(s.name), "avance " + P(a) + " · PIM " + M(s.pim), M(sd), sd / mx * 100, "ink", ' data-sec="' + esc(s.code) + '" tabindex="0"');
    }).join("");
  }

  /* =================== LEYES =================== */
  function findSector(rx) { var l = D.sectores || []; for (var i = 0; i < l.length; i++) if (rx.test(l[i].name)) return l[i]; return null; }
  function mpEjecutoras() {
    var pl = D.pliegos || {}, ej = D.ejecutoras || {};
    for (var sec in pl) for (var i = 0; i < pl[sec].length; i++) if (/MINISTERIO PUBLICO/.test(pl[sec][i].name)) return { pliego: pl[sec][i], ues: ej[sec + ":" + pl[sec][i].code] || null };
    return null;
  }
  function lawCtx(n) {
    var rows = [];
    if (n.id === "32732") {
      [/EDUCACION/, /DEFENSA/, /ENERGIA Y MINAS/, /MINISTERIO PUBLICO/].forEach(function (rx) { var s = findSector(rx); if (s) rows.push(s); });
    } else if (n.id === "32744") {
      [/TRANSPORTES/, /EDUCACION/, /INTERIOR/, /DEFENSA/, /VIVIENDA/, /PRODUCCION/, /DESARROLLO E INCLUSION/, /TRABAJO/, /PRESIDENCIA/].forEach(function (rx) { var s = findSector(rx); if (s) rows.push(s); });
    }
    return rows;
  }
  function lawCard(n) {
    var dias = n.publicada ? Math.round((new Date(CORTE + "T12:00:00") - new Date(n.publicada + "T12:00:00")) / 864e5) : null;
    var comp = (n.componentes || []).filter(function (c) { return !c.ingreso; });
    var maxc = Math.max.apply(null, comp.map(function (c) { return c.monto || 0; }).concat([1]));
    var head = '<div class="law-head"><div><span class="law-num">' + esc(n.numero) + '</span> <span class="status ' + n.estado + '">' + (n.estado === "vigente" ? "Vigente" : "En trámite") + "</span>" +
      "<h3>" + esc(n.titulo) + "</h3><p class=\"note\" style=\"margin:0\">" + (n.publicada ? "Publicada el " + fdate(n.publicada) + " en El Peruano · " + dias + " días de vigencia al corte" : esc(n.hito || "")) + "</p></div>" +
      '<div class="law-amt">' + (n.monto ? '<div class="big">' + "S/&nbsp;" + nf1.format(n.monto / 1e6) + "<small>mill.</small></div>" : "") +
      (n.bonos ? '<p class="src">Bonos autorizados: ' + M(n.bonos) + "</p>" : "") + "</div></div>";
    var left = '<div><h3>' + (n.componentes ? "¿A qué se destina y quién ejecuta?" : "Contenido") + '</h3><p class="note">' + esc(n.resumen) + "</p>";
    if (comp.length) {
      left += mlist(comp.map(function (c) {
        return hrow(c.concepto, esc(c.ejecutor), c.monto ? (c.aprox ? "más de " : "") + M(c.monto) : '<span class="tag">sin monto</span>', c.monto ? c.monto / maxc * 100 : 0, "info");
      }).join(""), "short", comp.length);
    }
    if (n.niveles) {
      var mx = Math.max.apply(null, n.niveles.map(function (x) { return x.monto; }));
      left += n.niveles.map(function (x) { return hrow(x.nivel, P(x.monto / n.monto * 100) + " del total", M(x.monto), x.monto / mx * 100, "ink"); }).join("");
      var pia26 = (D.total || {}).pia;
      if (pia26) left += '<p class="note" style="margin-top:var(--sp-3)">Frente al PIA 2026 (' + M(pia26) + "): " + (n.monto >= pia26 ? "+" : "") + P((n.monto / pia26 - 1) * 100) + ".</p>";
    }
    var ctx = lawCtx(n);
    if (ctx.length) {
      left += '<h3 style="margin-top:var(--sp-5)">Ejecución 2026 de los sectores beneficiarios</h3><p class="note">Contexto: el MEF no publica el devengado separado por ley; estas cifras incluyen todo el presupuesto de cada sector.</p>' +
        mlist(ctx.map(function (s) { var x = av(s); return hrow(title(s.name), M(s.dev) + " de " + M(s.pim), '<span class="pct ' + pc(x) + '">' + P(x) + "</span>", x, null, ' data-sec="' + esc(s.code) + '" tabindex="0"'); }).join(""), "short");
    }
    left += "</div>";
    var right = "<div>";
    if (n.plazos) right += "<h3>Plazos y reglas de ejecución</h3><ol>" + n.plazos.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ol>";
    if (n.id === "32744" && LEFT >= 0) right += '<div class="callout warn" style="margin:var(--sp-4) 0">Quedan <b>' + LEFT + " días</b> para devengar estos recursos. Lo no devengado al 31 de diciembre de 2026 revierte al Tesoro.</div>";
    if (n.id === "32732") {
      var mp = mpEjecutoras(), L = window.LEY32732;
      right += '<h3 style="margin-top:var(--sp-4)">Componente Ministerio Público</h3>';
      if (L) right += '<p class="note">Anexos I y IX: ' + M(L.totals.newAllocation) + " en " + L.rows.length + " asignaciones a unidades ejecutoras.</p>";
      if (mp) {
        var x = av(mp.pliego);
        right += hrow("Ministerio Público — pliego", M(mp.pliego.dev) + " de " + M(mp.pliego.pim), '<span class="pct ' + pc(x) + '">' + P(x) + "</span>", x);
        if (mp.ues) right += mlist(execRows(mp.ues, {}), "short", mp.ues.length);
      }
      right += '<button class="btn" type="button" data-ext="navLey32732" style="margin-top:var(--sp-3)">Detalle Ministerio Público y catálogo de entidades →</button>';
    }
    right += "<h3 style=\"margin-top:var(--sp-5)\">Fuentes</h3><div class=\"srcs\" style=\"flex-direction:column\">" + (n.fuentes || []).map(function (f) { return '<a href="' + f[1] + '" target="_blank" rel="noopener">' + esc(f[0]) + " ↗</a>"; }).join("") + "</div></div>";
    return '<article class="law" id="law-' + n.id + '">' + head + '<div class="law-body">' + left + right + "</div></article>";
  }
  function renderLeyes() {
    var tl = [
      ["2025-12", "Ley 32513", "Presupuesto 2026 (PIA)", "done"],
      ["2026-07-19", "Ley 32732", "1.ª incorporación: " + M(4160277816), "done"],
      ["2026-11-02", "Ley 32744", "2.ª incorporación: " + M(8228414502), "done"],
      ["2026-11-21", "Presupuesto 2027", "Aprobado por el Congreso", "done"],
      [CORTE, "Corte de datos", "Avance nacional " + P(av(EX.total || D.total)), "now"],
      ["2026-11-30", "Plazo constitucional", "Promulgación del presupuesto 2027", "next"],
      ["2026-12-31", "Cierre fiscal 2026", "Lo no devengado de la Ley 32744 revierte", "next"]
    ];
    var html = '<div class="vhead"><div><p class="kicker">Normas presupuestales · revisado ' + fdate(LY.revisado) + '</p><h2>Leyes que cambiaron el presupuesto 2026 y lo que viene en 2027</h2>' +
      "<p>Dos créditos suplementarios vigentes suman <b>" + M(4160277816 + 8228414502) + "</b>. El presupuesto 2027 y sus leyes fiscales ya pasaron por el Congreso y esperan promulgación.</p></div>" +
      '<div class="chips">' + LY.normas.map(function (n) { return '<a class="chip" href="#law-' + n.id + '" data-jump="law-' + n.id + '">' + esc(n.numero.replace("Ley de Presupuesto del Sector Público", "Presupuesto").replace("Leyes de Endeudamiento y de Equilibrio Financiero", "Endeudamiento")) + "</a>"; }).join("") + "</div></div>" +
      '<div class="card"><h3>Línea de tiempo</h3><div class="timeline">' + tl.map(function (x) { return '<div class="tl ' + x[3] + '"><time>' + (x[0].length === 10 ? fdate(x[0]) : "dic 2025") + "</time><b>" + esc(x[1]) + "</b><span>" + esc(x[2]) + "</span></div>"; }).join("") + "</div></div>" +
      '<div class="callout"><b>Cómo leer el avance de una ley.</b> La Consulta Amigable del MEF no separa el devengado por norma. Por eso mostramos (1) los montos y destinos que fija cada ley, (2) la ejecución a la fecha de los sectores y unidades que reciben los recursos, y (3) los plazos legales. El avance del sector es contexto, no prueba de cuánto se gastó de la ley.</div>' +
      LY.normas.map(lawCard).join("");
    $("#leyesBody").innerHTML = html;
    $$("#leyesBody [data-sec]").forEach(function (r) { r.addEventListener("click", function () { window.APP && APP.open("sector", r.dataset.sec); }); });
    $$("#leyesBody [data-ext]").forEach(function (b) { b.addEventListener("click", function () { var t = document.getElementById(b.dataset.ext); if (t) t.click(); }); });
    $$("#leyesBody [data-jump]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); var t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }); });
  }

  /* =================== EL NIÑO =================== */
  function renderNino() {
    var pp = (EX.pp || {})["0068"] || {}, cat = (EX.categorias || []).filter(function (c) { return c.code === "0068"; })[0] || {};
    var disp = LY.nino || [], gasto = disp.filter(function (d) { return !d.garantia && d.monto; }).reduce(function (s, d) { return s + d.monto; }, 0);
    var a = av(cat);
    var maxd = Math.max.apply(null, disp.map(function (d) { return d.garantia ? 0 : d.monto || 0; }).concat([1]));
    var html = '<div class="vhead"><div><p class="kicker">Fenómeno El Niño 2026–2027 · prevención y emergencia</p><h2>¿Cuánto se destina a El Niño y quién lo ejecuta?</h2>' +
      "<p>Recursos asignados por decretos y leyes frente a El Niño, y la ejecución del programa presupuestal 0068 (reducción de vulnerabilidad y atención de emergencias por desastres), donde se registra la mayor parte de este gasto.</p></div></div>" +
      '<div class="card"><div class="stat-list">' +
        stat("Asignado por normas FEN", M(gasto), disp.filter(function (d) { return !d.garantia && d.monto; }).length + " dispositivos con monto") +
        stat("Garantías MYPE (no es gasto)", M(2e9), "D. U. 015-2026") +
        stat("PP 0068 — PIM", M(cat.pim), "PIA " + M(cat.pia)) +
        stat("PP 0068 — devengado", M(cat.dev), "certificado " + M(cat.cert)) +
        stat("PP 0068 — avance", '<span class="pct ' + pc(a) + '">' + P(a) + "</span>", "vs " + P(av(EX.total)) + " nacional") +
      "</div>" + src("MEF — Consulta Amigable, categoría presupuestal 0068, corte " + fdate(CORTE), MEFURL) + "</div>" +
      (a != null && a < 70 ? '<div class="callout warn"><b>Alerta de ejecución.</b> El programa de emergencias por desastres va en ' + P(a) + ", muy por debajo del promedio nacional (" + P(av(EX.total)) + "). Su PIM creció de " + M(cat.pia) + " a " + M(cat.pim) + " con las transferencias por El Niño, pero gran parte aún no se devenga.</div>" : "") +
      '<div class="grid">' +
      '<div class="card c7"><h3>Normas y transferencias frente a El Niño</h3>' + mlist(disp.map(function (d) {
        return hrow(d.norma + " — " + d.entidad, esc(d.detalle) + ' · <a href="' + d.url + '" target="_blank" rel="noopener">fuente ↗</a>', d.monto ? M(d.monto) : '<span class="tag">medida</span>', d.garantia ? 0 : (d.monto || 0) / maxd * 100, "info");
      }).join(""), "", disp.length) + '<p class="src">Montos según El Peruano y notas del MEF recogidas por la prensa. Verificar el decreto en El Peruano antes de citar.</p></div>' +
      '<div class="card c5"><h3>PP 0068 por nivel de gobierno</h3>' + execRows(pp.niveles || [], { clean: true }) +
        '<h3 style="margin-top:var(--sp-5)">¿En qué se gasta?</h3>' + mlist(execRows(pp.genericas || []), "short") + "</div>" +
      '<div class="card c7"><h3>¿Quién ejecuta? Pliegos con mayor presupuesto en el PP 0068</h3><p class="note">Ministerios, gobiernos regionales y municipalidades (estas últimas agregadas).</p>' + mlist(execRows(pp.pliegos || [], { clean: true }), "tall", (pp.pliegos || []).length) + "</div>" +
      '<div class="card c5"><h3>¿Dónde? PP 0068 por departamento</h3>' + mlist(execRows(pp.departamentos || []), "tall", (pp.departamentos || []).length) + "</div>" +
      "</div>";
    $("#ninoBody").innerHTML = html;
  }

  /* =================== PROGRAMAS =================== */
  var INFANCIA = ["1001", "0002", "0090", "0115", "0106", "0117", "0122", "0066"];
  var progState = { q: "", sort: "pim", sel: "1001" };
  function renderProgramas() {
    var cats = EX.categorias || [];
    var inf = INFANCIA.map(function (c) { return cats.filter(function (x) { return x.code === c; })[0]; }).filter(Boolean);
    var tinf = inf.reduce(function (s, x) { s.pim += x.pim || 0; s.dev += x.dev || 0; return s; }, { pim: 0, dev: 0 });
    var html = '<div class="vhead"><div><p class="kicker">Programas presupuestales · ' + cats.length + ' categorías · ' + CUR + '</p><h2>¿Qué hace el Estado con el presupuesto?</h2>' +
      "<p>Los programas presupuestales agrupan el gasto por resultado: desarrollo infantil, aprendizajes, salud materna, seguridad ciudadana, saneamiento. Aquí ves cuánto tiene cada uno y cuánto ha ejecutado.</p></div></div>" +
      '<div class="grid">' +
      '<div class="card c12"><div class="phead"><h3>Niñez y adolescencia</h3><span class="src">' + M(tinf.dev) + " devengado de " + M(tinf.pim) + " (" + P(tinf.dev / tinf.pim * 100) + ")</span></div>" +
        '<div class="split">' + '<div>' + inf.slice(0, 4).map(progRow).join("") + "</div><div>" + inf.slice(4).map(progRow).join("") + "</div></div></div>" +
      '<div class="card c7"><div class="phead"><h3>Todos los programas</h3><div class="seg" id="progSort"><button class="chip active" data-s="pim" type="button">Mayor PIM</button><button class="chip" data-s="low" type="button">Menor avance</button><button class="chip" data-s="saldo" type="button">Mayor saldo</button></div></div>' +
        '<input type="search" id="progQ" placeholder="Filtrar: salud, agua, policía, niñas…" autocomplete="off" style="margin-bottom:var(--sp-3)">' +
        '<div id="progList"></div></div>' +
      '<div class="card c5" id="progDet"></div>' +
      "</div>";
    $("#programasBody").innerHTML = html;
    $("#progQ").addEventListener("input", function () { progState.q = this.value; progList(); });
    $$("#progSort .chip").forEach(function (b) { b.addEventListener("click", function () { progState.sort = b.dataset.s; $$("#progSort .chip").forEach(function (x) { x.classList.toggle("active", x === b); }); progList(); }); });
    $$("#programasBody .hrow[data-pp]").forEach(bindPP);
    progList(); progDetail();
  }
  function progRow(x) { var a = av(x); return hrow(x.code + " · " + title(x.name), M(x.dev) + " de " + M(x.pim), '<span class="pct ' + pc(a) + '">' + P(a) + "</span>", a, null, ' data-pp="' + x.code + '" tabindex="0"'); }
  function bindPP(r) { r.addEventListener("click", function () { progState.sel = r.dataset.pp; progDetail(); if (window.innerWidth < 1280) $("#progDet").scrollIntoView({ behavior: "smooth" }); }); }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function progList() {
    var q = norm(progState.q), l = (EX.categorias || []).filter(function (x) { return !q || norm(x.code + " " + x.name).indexOf(q) >= 0; });
    l.sort(function (a, b) {
      if (progState.sort === "low") return (av(a) || 0) - (av(b) || 0);
      if (progState.sort === "saldo") return ((b.pim || 0) - (b.dev || 0)) - ((a.pim || 0) - (a.dev || 0));
      return (b.pim || 0) - (a.pim || 0);
    });
    $("#progList").innerHTML = mlist(l.map(progRow).join("") || '<p class="note">Sin coincidencias.</p>', "tall", l.length);
    $$("#progList .hrow[data-pp]").forEach(bindPP);
  }
  function progDetail() {
    var c = (EX.categorias || []).filter(function (x) { return x.code === progState.sel; })[0];
    if (!c) { $("#progDet").innerHTML = '<p class="note">Selecciona un programa.</p>'; return; }
    var d = (EX.pp || {})[c.code], a = av(c);
    var h = '<p class="law-num">Programa ' + esc(c.code) + "</p><h3 style=\"font-size:var(--fs-h2)\">" + esc(title(c.name)) + "</h3>" +
      '<div class="stat-list" style="margin:var(--sp-4) 0">' + stat("PIM", M(c.pim), "PIA " + M(c.pia)) + stat("Devengado", M(c.dev), "") + stat("Avance", '<span class="pct ' + pc(a) + '">' + P(a) + "</span>", "") + stat("Sin ejecutar", M((c.pim || 0) - (c.dev || 0)), "") + "</div>";
    if (d) {
      h += "<h3>Por nivel de gobierno</h3>" + execRows(d.niveles || [], { clean: true }) +
        '<h3 style="margin-top:var(--sp-4)">¿Quién ejecuta?</h3>' + mlist(execRows(d.pliegos || [], { clean: true }), "short", (d.pliegos || []).length) +
        '<h3 style="margin-top:var(--sp-4)">¿Dónde?</h3>' + mlist(execRows(d.departamentos || []), "short", (d.departamentos || []).length);
    } else {
      h += '<p class="note">El desglose por ejecutor está disponible para los programas clave (0068, 1001, 0002, 0090, 0115, 0030, 0082, 0083). Para este programa, consulta la <a href="' + MEFURL + '" target="_blank" rel="noopener">Consulta Amigable ↗</a> (Categoría presupuestal → Nivel de gobierno → Pliego).</p>';
    }
    $("#progDet").innerHTML = h + src("MEF — Consulta Amigable, corte " + fdate(CORTE), MEFURL);
  }

  /* =================== enrutador =================== */
  var R = { inicio: renderInicio, leyes: renderLeyes, nino: renderNino, programas: renderProgramas };
  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]");
    if (g && window.APP) { e.preventDefault(); APP.go(g.dataset.go); }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".hrow.clickable")) { e.preventDefault(); e.target.click(); }
  });
  window.PANORAMA = { render: function (v) { if (R[v]) R[v](); } };
})();
