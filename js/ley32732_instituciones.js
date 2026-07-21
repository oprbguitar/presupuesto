/* Catálogo ampliado de instituciones — Ley N.° 32732 */
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
    var STORE = "presupuesto-peru-ley32732-entidades-v1";
    var state = { q: "", level: "", ref: "", dept: "", page: 1, size: 50, excludeMP: true };
    var execution = loadExecution();

    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
    function esc(v) { return String(v == null ? "" : v).replace(/[&<>\"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
    function norm(v) { return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    function money(v) { return v == null || isNaN(v) ? "—" : "S/ " + nf.format(Math.round(v)); }
    function pct(v) { return v == null || isNaN(v) ? "—" : nf1.format(v) + " %"; }
    function isMP(e) { return norm(e.name).indexOf("ministerio publico") >= 0; }
    function legalTotal(e) { return (Number(e.credit) || 0) + (Number(e.determined) || 0); }
    function execValue(e) { var v = execution[e.id]; return v == null || v === "" || isNaN(v) ? null : Math.max(0, Number(v)); }
    function loadExecution() { try { return JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { return {}; } }
    function saveExecution() { localStorage.setItem(STORE, JSON.stringify(execution)); }

    function waitForLawView(tries) {
      var view = $("#view-ley32732");
      if (view) { inject(view); return; }
      if (tries > 0) setTimeout(function () { waitForLawView(tries - 1); }, 60);
    }

    function inject(view) {
      if ($("#leyInstituciones")) return;
      var section = document.createElement("section");
      section.id = "leyInstituciones";
      section.innerHTML =
        '<div class="card ley-inst-card">' +
          '<div class="ley-cardhead">' +
            '<div><h3>Todas las entidades públicas contempladas en la Ley N.° 32732</h3>' +
            '<p class="note">Catálogo consolidado de pliegos nacionales, gobiernos regionales y municipalidades individualizadas en los artículos y anexos. El Ministerio Público conserva su seguimiento detallado en la sección anterior.</p></div>' +
            '<div class="ley-actions"><button class="ley-btn" id="leyInstCsv">Descargar catálogo CSV</button><label class="ley-btn file">Importar devengado<input id="leyInstImport" type="file" accept=".csv,text/csv"></label></div>' +
          '</div>' +
          '<div id="leyInstKpis" class="ley-inst-kpis"></div>' +
          '<div class="ley-inst-note"><strong>Lectura correcta:</strong> “Crédito identificado” corresponde a recursos individualizados en anexos de crédito suplementario. “Recursos determinados” reúne estimaciones e inversiones financiadas con canon, sobrecanon, regalías y participaciones; no equivale automáticamente a un crédito nuevo. Un devengado vacío significa <em>dato no cargado</em>, no ejecución cero.</div>' +
          '<div class="ley-inst-filters">' +
            '<input id="leyInstSearch" type="search" placeholder="Buscar entidad, código, departamento o anexo…">' +
            '<select id="leyInstLevel"><option value="">Todos los niveles</option><option>Gobierno Nacional</option><option>Gobierno Regional</option><option>Gobierno Local</option></select>' +
            '<select id="leyInstRef"><option value="">Todos los anexos y artículos</option></select>' +
            '<select id="leyInstDept"><option value="">Todos los departamentos</option></select>' +
            '<label class="ley-check"><input id="leyInstExcludeMP" type="checkbox" checked> Mostrar solo entidades adicionales al Ministerio Público</label>' +
          '</div>' +
          '<div id="leyInstTable"></div>' +
          '<div id="leyInstPager" class="ley-inst-pager"></div>' +
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
      bind();
      renderAll();
    }

    function fillFilters() {
      var refs = {}, depts = {};
      D.institutions.forEach(function (e) {
        (e.refs || []).forEach(function (r) { refs[r] = 1; });
        if (e.department) depts[e.department] = 1;
      });
      $("#leyInstRef").innerHTML += Object.keys(refs).sort().map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join("");
      $("#leyInstDept").innerHTML += Object.keys(depts).sort(function(a,b){return a.localeCompare(b,"es");}).map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join("");
    }

    function bind() {
      $("#leyInstSearch").addEventListener("input", function () { state.q = norm(this.value); state.page = 1; renderTable(); });
      $("#leyInstLevel").addEventListener("change", function () { state.level = this.value; state.page = 1; renderTable(); });
      $("#leyInstRef").addEventListener("change", function () { state.ref = this.value; state.page = 1; renderTable(); });
      $("#leyInstDept").addEventListener("change", function () { state.dept = this.value; state.page = 1; renderTable(); });
      $("#leyInstExcludeMP").addEventListener("change", function () { state.excludeMP = this.checked; state.page = 1; renderAll(); });
      $("#leyInstCsv").addEventListener("click", downloadCsv);
      $("#leyInstImport").addEventListener("change", importCsv);
      $("#leyMeasureSearch").addEventListener("input", function () { renderMeasures(norm(this.value)); });
    }

    function filtered() {
      return D.institutions.filter(function (e) {
        if (state.excludeMP && isMP(e)) return false;
        if (state.level && e.level !== state.level) return false;
        if (state.ref && (e.refs || []).indexOf(state.ref) < 0) return false;
        if (state.dept && e.department !== state.dept) return false;
        if (state.q) {
          var hay = norm([e.name,e.code,e.department,e.province,(e.refs||[]).join(" ")].join(" "));
          if (hay.indexOf(state.q) < 0) return false;
        }
        return true;
      });
    }

    function renderKpis() {
      var list = D.institutions.filter(function(e){return !(state.excludeMP && isMP(e));});
      var national = list.filter(function(e){return e.level === "Gobierno Nacional";}).length;
      var regional = list.filter(function(e){return e.level === "Gobierno Regional";}).length;
      var local = list.filter(function(e){return e.level === "Gobierno Local";}).length;
      var credit = list.reduce(function(a,e){return a+(Number(e.credit)||0);},0);
      var determined = list.reduce(function(a,e){return a+(Number(e.determined)||0);},0);
      $("#leyInstKpis").innerHTML =
        instKpi("Entidades mostradas", nf.format(list.length), state.excludeMP ? "Adicionales al Ministerio Público" : "Incluye Ministerio Público", "black") +
        instKpi("Gobierno Nacional", nf.format(national), "Pliegos y organismos", "blue") +
        instKpi("Gobiernos regionales", nf.format(regional), "Incluye régimen especial de Lima", "green") +
        instKpi("Gobiernos locales", nf.format(local), "Municipalidades individualizadas", "amber") +
        instKpi("Crédito identificado", money(credit), "Anexos de crédito suplementario", "red") +
        instKpi("Recursos determinados", money(determined), "Canon, sobrecanon, regalías y participaciones", "gold");
    }
    function instKpi(lbl,val,sub,cls){return '<div class="ley-inst-kpi '+cls+'"><span>'+esc(lbl)+'</span><strong>'+esc(val)+'</strong><small>'+esc(sub)+'</small></div>';}

    function renderTable() {
      var list = filtered();
      var totalPages = Math.max(1, Math.ceil(list.length / state.size));
      if (state.page > totalPages) state.page = totalPages;
      var start = (state.page - 1) * state.size;
      var rows = list.slice(start, start + state.size).map(function (e) {
        var dev = execValue(e), base = legalTotal(e), pending = dev == null ? null : Math.max(0, base - dev);
        var av = dev == null || !base ? null : dev / base * 100;
        var status = dev == null ? "nodata" : dev <= 0 ? "pending" : dev >= base ? "done" : "partial";
        var loc = [e.department,e.province].filter(Boolean).join(" · ");
        return '<tr class="ley-inst-row '+status+'">' +
          '<td><b>'+esc(e.name)+'</b><small>'+esc(e.code ? "Código "+e.code : "Entidad señalada en el articulado")+'</small></td>' +
          '<td><span class="ley-level">'+esc(e.level)+'</span><small>'+esc(loc||"Ámbito nacional")+'</small></td>' +
          '<td>'+((e.refs||[]).map(function(r){return '<span class="ley-ref">'+esc(r)+'</span>';}).join(" ")||"—")+'</td>' +
          '<td>'+money(e.credit)+'</td><td>'+money(e.determined)+'</td>' +
          '<td><input class="ley-inst-dev" type="number" min="0" step="1" data-id="'+esc(e.id)+'" value="'+(dev==null?"":dev)+'" placeholder="Sin dato" aria-label="Devengado atribuible a '+esc(e.name)+'"></td>' +
          '<td>'+money(pending)+'</td>' +
          '<td><span class="ley-status '+status+'">'+statusLabel(status)+'</span><small>'+pct(av)+'</small></td></tr>';
      }).join("");
      $("#leyInstTable").innerHTML = '<div class="tbl-wrap"><table class="t ley-inst-table"><thead><tr><th>Entidad</th><th>Nivel / ubicación</th><th>Base legal</th><th>Crédito identificado</th><th>Recursos determinados</th><th>Devengado atribuible</th><th>Pendiente</th><th>Estado</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="note ley-count">'+nf.format(list.length)+' entidades encontradas.</p>';
      $$(".ley-inst-dev", $("#leyInstTable")).forEach(function(inp){inp.addEventListener("change",function(){var v=this.value.trim();execution[this.dataset.id]=v===""?null:Math.max(0,Number(v)||0);saveExecution();renderTable();});});
      renderPager(totalPages,list.length,start);
    }
    function statusLabel(s){return {nodata:"Sin dato",pending:"Pendiente",partial:"Parcial",done:"Ejecutado"}[s]||s;}

    function renderPager(totalPages,total,start) {
      var end = Math.min(total,start+state.size);
      $("#leyInstPager").innerHTML = '<span>Mostrando '+(total?start+1:0)+'–'+end+' de '+total+'</span><div><button class="ley-btn" id="leyPrev" '+(state.page<=1?'disabled':'')+'>← Anterior</button><span>Página '+state.page+' de '+totalPages+'</span><button class="ley-btn" id="leyNext" '+(state.page>=totalPages?'disabled':'')+'>Siguiente →</button></div>';
      $("#leyPrev").addEventListener("click",function(){if(state.page>1){state.page--;renderTable();}});
      $("#leyNext").addEventListener("click",function(){if(state.page<totalPages){state.page++;renderTable();}});
    }

    function renderMeasures(query) {
      var rows = D.measures.filter(function(m){return !query || norm([m.actor,m.recipient,m.ref,m.title,m.purpose,m.type].join(" ")).indexOf(query)>=0;}).map(function(m){
        return '<tr><td><span class="ley-ref">'+esc(m.ref)+'</span><b>'+esc(m.title)+'</b><small>'+esc(m.type)+'</small></td><td>'+esc(m.actor)+'</td><td>'+esc(m.recipient)+'</td><td>'+money(m.amount)+'</td><td><span class="ley-purpose">'+esc(m.purpose)+'</span><small>'+esc(m.source||"")+'</small></td></tr>';
      }).join("");
      $("#leyMeasuresTable").innerHTML='<div class="tbl-wrap"><table class="t ley-measures-table"><thead><tr><th>Medida / referencia</th><th>Entidad habilitada</th><th>Beneficiario o destino</th><th>Monto</th><th>Finalidad y fuente</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="note ley-count">'+(rows?D.measures.filter(function(m){return !query || norm([m.actor,m.recipient,m.ref,m.title,m.purpose,m.type].join(" ")).indexOf(query)>=0;}).length:0)+' medidas.</p>';
    }

    function csvCell(v){var s=String(v==null?"":v);return '"'+s.replace(/"/g,'""')+'"';}
    function downloadCsv(){
      var cols=["id","codigo","entidad","nivel","departamento","provincia","referencias","credito_identificado","recursos_determinados","devengado_atribuible"];
      var rows=D.institutions.filter(function(e){return !(state.excludeMP&&isMP(e));}).map(function(e){return [e.id,e.code,e.name,e.level,e.department,e.province,(e.refs||[]).join(" | "),e.credit||0,e.determined||0,execValue(e)==null?"":execValue(e)];});
      var csv=[cols].concat(rows).map(function(r){return r.map(csvCell).join(";");}).join("\n");
      var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="ley32732_todas_las_entidades.csv";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
    }
    function importCsv(e){
      var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(){try{var lines=String(reader.result||"").replace(/^\ufeff/,"").split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error("El archivo no contiene datos.");var h=parseLine(lines[0]).map(function(x){return norm(x).replace(/\s+/g,"_");});var idIdx=h.indexOf("id"),devIdx=h.indexOf("devengado_atribuible");if(idIdx<0||devIdx<0)throw new Error("Se requieren las columnas id y devengado_atribuible.");var valid={};D.institutions.forEach(function(x){valid[x.id]=1;});var count=0;lines.slice(1).forEach(function(l){var c=parseLine(l),id=c[idIdx];if(!valid[id])return;var raw=(c[devIdx]||"").replace(/\s/g,"").replace(",",".");execution[id]=raw===""?null:Math.max(0,Number(raw)||0);count++;});saveExecution();renderAll();alert("Se importaron "+count+" registros de ejecución atribuible.");}catch(err){alert("No se pudo importar: "+err.message);}e.target.value="";};reader.readAsText(file,"utf-8");
    }
    function parseLine(line){var sep=line.indexOf(";")>=0?";":",",out=[],cur="",q=false;for(var i=0;i<line.length;i++){var ch=line[i];if(ch==='"'&&q&&line[i+1]==='"'){cur+='"';i++;}else if(ch==='"')q=!q;else if(ch===sep&&!q){out.push(cur);cur="";}else cur+=ch;}out.push(cur);return out;}

    function renderAll(){renderKpis();renderTable();renderMeasures(norm($("#leyMeasureSearch").value));}
    waitForLawView(80);
    }).catch(function (err) {
      console.error("No se pudo inicializar el catálogo de instituciones de la Ley 32732", err);
    });
  });
})();
