/* Presupuesto Perú — acomoda en el riel los botones que inyectan los módulos (Ley 32732, Contrataciones). */
(function () {
  "use strict";
  function $(s) { return document.querySelector(s); }
  var stamp = $("#stampFecha");
  if (stamp) {
    var f = (window.EXTRA && EXTRA.updated) || (window.MEF && MEF.updated) || "";
    var p = f.split("-"), mm = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
    stamp.textContent = p.length === 3 ? (+p[2]) + " " + mm[+p[1] - 1] + " " + p[0] : f;
  }
  function place() {
    var ley = $("#navLey32732"), cx = $("#navContrat"), prog = $('.navbtn[data-view="programas"]'), compras = $("#railCompras");
    if (ley && prog && ley.previousElementSibling !== prog) {
      ley.textContent = "Ley 32732 · Ministerio Público";
      ley.style.paddingLeft = "var(--sp-5)";
      ley.style.fontSize = "var(--fs-caption)";
      var leyes = $('.navbtn[data-view="leyes"]');
      leyes.parentNode.insertBefore(ley, leyes.nextSibling);
    }
    if (cx && compras && compras.nextElementSibling !== cx) {
      cx.textContent = "Contrataciones públicas";
      compras.parentNode.insertBefore(cx, compras.nextSibling);
    }
  }
  place();
  document.addEventListener("DOMContentLoaded", place);
  window.addEventListener("load", place);
})();
