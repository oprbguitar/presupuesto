/* Cargador comprimido del catálogo integral de la Ley N.° 32732. */
(function(){
  "use strict";
  function decodeBase64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
  async function inflate(){
    var packed=window.__LEY32732_PACK||"";
    if(!packed) throw new Error("No se cargaron los segmentos del catálogo.");
    if(typeof DecompressionStream!=="function") throw new Error("El navegador no admite descompresión gzip.");
    var stream=new Blob([decodeBase64(packed)]).stream().pipeThrough(new DecompressionStream("gzip"));
    var text=await new Response(stream).text();
    (0,eval)(text);
    delete window.__LEY32732_PACK;
    return window.LEY32732_INSTITUTIONS;
  }
  window.LEY32732_INSTITUTIONS_READY=inflate().catch(function(err){console.error("Ley 32732: no se pudo cargar el catálogo integral",err);throw err;});
})();
