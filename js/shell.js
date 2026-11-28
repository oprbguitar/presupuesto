/* Presupuesto Perú — fecha de corte y orden de los botones que inyectan los módulos (Ley 32732, Contrataciones). */
(function () {
  "use strict";
  function $(s) { return document.querySelector(s); }
  var stamp = $("#stampFecha");
  if (stamp) {
    var f = (window.EXTRA && EXTRA.updated) || (window.MEF && MEF.updated) || "";
    var p = f.split("-"), mm = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
    stamp.textContent = p.length === 3 ? (+p[2]) + " " + mm[+p[1] - 1] + " " + p[0] : f;
  }
  function after(ref, el) { if (ref && el && ref.nextElementSibling !== el) ref.parentNode.insertBefore(el, ref.nextSibling); }
  function place() {
    var ley = $("#navLey32732"), cx = $("#navContrat");
    if (ley) { ley.textContent = "Ley 32732 · M. Público"; after($('.navbtn[data-view="leyes"]'), ley); }
    if (cx) { cx.textContent = "Contrataciones"; after($('.navbtn[data-view="programas"]'), cx); }
  }
  place();
  document.addEventListener("DOMContentLoaded", place);
  window.addEventListener("load", place);
})();
