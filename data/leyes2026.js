/* Normas presupuestales 2026–2027 — curado a mano desde El Peruano, MEF, Congreso y prensa económica.
   Cada cifra lleva su fuente. "estado": vigente | en_tramite. Revisado el 2026-11-27. */
window.LEYES2026 = {
  revisado: "2026-11-27",
  pia2026: { norma: "Ley N.° 32513 — Presupuesto del Sector Público 2026", url: "https://www.mef.gob.pe/contenidos/presu_publ/anexos/ppto2026/Ley_N_32513-LeydePpto2026.pdf" },
  normas: [
    {
      id: "32732",
      numero: "Ley N.° 32732",
      estado: "vigente",
      publicada: "2026-07-19",
      titulo: "Créditos suplementarios para inversiones orientadas al cierre de brechas, continuidad de los servicios del Estado y transición democrática",
      monto: 4160277816,
      bonos: 1260000000,
      resumen: "Primera incorporación de recursos al presupuesto 2026, a favor de pliegos del Gobierno Nacional, gobiernos regionales y gobiernos locales (detalle por pliego en los anexos). Incluye medidas para personal CAS, docentes y Fuerzas Armadas.",
      componentes: [
        { concepto: "Bonificación extraordinaria de S/ 487 a docentes y auxiliares (Leyes 29944, 30328, 30493)", monto: 211823085, ejecutor: "Minedu · gobiernos regionales" },
        { concepto: "Censo Nacional de la Pequeña Minería y Minería Artesanal (vía convenio con INEI)", monto: 38123560, ejecutor: "Minem · INEI" },
        { concepto: "Bono de S/ 300 al personal del servicio militar acuartelado", monto: 13000000, ejecutor: "Mindef (Ejército, Marina, FAP)" },
        { concepto: "Financiamiento contingente frente al Fenómeno El Niño (préstamo BID, DS 144-2024-EF) vía Reserva de Contingencia", monto: 300000000, ejecutor: "MEF · pliegos que declare la emergencia" },
        { concepto: "Ministerio Público: gestión administrativa, IML, control funcional y casos (anexos I y IX)", monto: 61335216, ejecutor: "Ministerio Público" },
        { concepto: "Transferencia de utilidades 2025 de Fonafe al Tesoro Público (ingreso, no gasto)", monto: 300000000, ejecutor: "Fonafe → Tesoro", ingreso: true },
        { concepto: "Gratificación mínima de S/ 300 y CTS para trabajadores CAS", monto: null, ejecutor: "Todos los pliegos con personal CAS" },
        { concepto: "Medidas remunerativas para docentes de institutos y escuelas de educación superior (desde agosto 2026)", monto: null, ejecutor: "Minedu" },
        { concepto: "Juegos Panamericanos y Parapanamericanos Lima 2027 (transferencias IPD → ANIN, PNUD)", monto: null, ejecutor: "IPD · ANIN" }
      ],
      plazos: [
        "5 días calendario para que cada pliego apruebe la desagregación programática.",
        "60 días calendario para adecuar reglamentos por decreto supremo.",
        "Los gobiernos locales pudieron reordenar estos recursos en 15 días (habilitado luego por la Ley 32744)."
      ],
      fuentes: [
        ["El Peruano / gob.pe — texto oficial", "https://www.gob.pe/institucion/mef/normas-legales/8403069-32732"],
        ["Andina — monto exacto y medidas", "https://andina.pe/agencia/noticia-normas-legales-oficializan-ley-aprueba-creditos-suplementarios-para-cierre-brechas-1084228.aspx"],
        ["Gestión — destinos", "https://gestion.pe/economia/credito-suplementario-por-s-4160-millones-queda-oficializado-a-que-se-destinara-noticia/"],
        ["LP Derecho — CAS", "https://lpderecho.pe/ley-32732-credito-suplementario-pago-gratificaciones-cts-trabajadores-cas/"]
      ]
    },
    {
      id: "32744",
      numero: "Ley N.° 32744",
      estado: "vigente",
      publicada: "2026-11-02",
      titulo: "Créditos suplementarios para acciones frente al Fenómeno El Niño 2026-2027, impulso de la infraestructura, seguridad ciudadana, salud, educación y otras obligaciones esenciales",
      monto: 8228414502,
      bonos: 4428734398,
      resumen: "Segunda incorporación de 2026 (≈3,19 % del PIA). Aprobada por el Pleno el 28-29 de octubre (83 diputados y 37 senadores a favor). Financiada con Recursos Ordinarios y Recursos por Operaciones Oficiales de Crédito; lo no devengado al 31-12-2026 revierte a la Cuenta Única del Tesoro.",
      componentes: [
        { concepto: "Inversión pública y equipamiento: Línea 2 del Metro, anillo vial periférico, agua y saneamiento, capacidad operativa de FF. AA.", monto: 3620000000, ejecutor: "MTC · ATU · MVCS · Mindef · GR/GL", aprox: true },
        { concepto: "Servicios esenciales: kits escolares (MYPErú), conectividad satelital en postas, colegios y comisarías rurales", monto: 2308000000, ejecutor: "Produce · Minedu · PCM · Minsa · Mininter" },
        { concepto: "Obligaciones ineludibles: Caja de Pensiones Militar-Policial y Fondo de Estabilización de Precios de Combustibles", monto: 1596700000, ejecutor: "MEF · Mindef · Mininter" },
        { concepto: "Fenómeno El Niño: mantenimiento de 12 054 colegios, empleo temporal Llamkasun Perú (> S/ 200 mill.), créditos a pescadores", monto: 702900000, ejecutor: "Minedu · MTPE · Produce" },
        { concepto: "Subvención adicional de S/ 350 a usuarios de Pensión 65 (única vez)", monto: null, ejecutor: "Midis" },
        { concepto: "Bonificación de S/ 300 a personal administrativo D. Leg. 276 de Educación y GR", monto: null, ejecutor: "Minedu · gobiernos regionales" },
        { concepto: "Bienes urgentes para la PNP (chalecos, vehículos) y IOARR sin declaratoria de emergencia", monto: null, ejecutor: "Mininter · PNP" }
      ],
      plazos: [
        "5 días calendario para la desagregación programática por resolución del titular (art. 3.3).",
        "15 días hábiles para que Minedu apruebe las subvenciones de mantenimiento (art. 7.2).",
        "30 días para que el MEF informe a la Comisión Bicameral y a la Contraloría sobre la emisión de bonos (art. 2.7).",
        "Lo no devengado al 31-12-2026 revierte al Tesoro; prohibido usarlo en otros fines (art. 12)."
      ],
      fuentes: [
        ["El Peruano — texto oficial", "https://busquedas.elperuano.pe/dispositivo/EX/2571013-1"],
        ["Andina — destinos aprobados", "https://andina.pe/agencia/noticia-credito-suplementario-que-se-destinaran-los-8228-millones-aprobados-el-congreso-1097757.aspx"],
        ["Gestores Públicos — articulado y plazos", "https://www.gestorespublicos.pe/2026/11/03/ley-32744-creditos-suplementarios-2026-fenomeno-el-nino/"],
        ["Congreso — aprobación en el Pleno", "https://comunicaciones.congreso.gob.pe/noticias/congreso-aprueba-credito-suplementario-de-mas-de-s-8-200-millones-para-enfrentar-el-fenomeno-el-nino-e-impulsar-la-infraestructura/"]
      ]
    },
    {
      id: "ppto2027",
      numero: "Ley de Presupuesto del Sector Público 2027",
      estado: "en_tramite",
      publicada: null,
      hito: "Aprobada por el Congreso el 20-21 de nov. de 2026 (107 a favor, 46 en contra, 15 abstenciones). Pendiente de promulgación (plazo constitucional: 30 de noviembre).",
      titulo: "Presupuesto inicial 2027: S/ 266 506 millones (+3,5 % frente al PIA 2026)",
      monto: 266506316735,
      niveles: [
        { nivel: "Gobierno Nacional", monto: 165604542258 },
        { nivel: "Gobiernos Regionales", monto: 58832000000 },
        { nivel: "Gobiernos Locales", monto: 42069000000 }
      ],
      resumen: "Financiado 90,8 % con recursos fiscales y 9,2 % con endeudamiento. Mantiene aguinaldos de hasta S/ 300 y escolaridad de hasta S/ 400; restringe compra de vehículos y telefonía. Una disposición sobre cargos de confianza sin experiencia generó objeciones.",
      fuentes: [
        ["Andina — aprobación", "https://andina.pe/agencia/noticia-congreso-aprueba-ley-presupuesto-publico-para-ano-fiscal-2027-1100905.aspx"],
        ["Gestión — ¿en qué se gastará?", "https://gestion.pe/peru/politica/congreso-aprueba-presupuesto-publico-de-s-266506-millones-para-el-2027-en-que-se-gastara-noticia/"],
        ["La República — votación", "https://larepublica.pe/politica/2026/11/21/congreso-aprueba-presupuesto-2027-de-s-266-506-millones-con-107-votos-a-favor-46-en-contra-y-15-abstenciones-hnews-822192"]
      ]
    },
    {
      id: "endeud2027",
      numero: "Leyes de Endeudamiento y de Equilibrio Financiero 2027",
      estado: "en_tramite",
      publicada: null,
      hito: "Dictámenes aprobados por la Comisión Bicameral el 2 de nov. de 2026; sustentados ante el Pleno el 17 de nov. Verificar votación final y autógrafa.",
      titulo: "Endeudamiento autorizado hasta US$ 2 800 millones y S/ 19 183 millones",
      monto: null,
      resumen: "Acompañan a la Ley de Presupuesto 2027. Endeudamiento: 23 votos a favor y 12 abstenciones en comisión; Equilibrio Financiero: 25 a favor y 10 abstenciones.",
      fuentes: [
        ["Congreso — dictámenes en comisión", "https://comunicaciones.congreso.gob.pe/noticias/comision-bicameral-de-presupuesto-aprueba-dictamenes-de-endeudamiento-y-equilibrio-financiero-para-el-2027/"],
        ["El Peruano — dictámenes fiscales", "https://elperuano.pe/noticia/308216-aprueban-dictamenes-fiscales-leyes-de-endeudamiento-y-equilibrio-financiero-2027"]
      ]
    }
  ],
  /* Dispositivos del Ejecutivo frente al Fenómeno El Niño 2026-2027 (transferencias desde la Reserva de Contingencia y medidas) */
  nino: [
    { norma: "D. U. N.° 008-2026", fecha: "2026", monto: 179500000, entidad: "Autoridad Nacional del Agua (ANA)", detalle: "Limpieza y descolmatación de ríos: 70 puntos críticos en seis regiones. Vigente al 31-12-2026.", url: "https://contadores360.pe/fenomeno-el-nino-autorizan-mas-de-s-179-millones-para-intervenciones-de-emergencia/" },
    { norma: "D. S. N.° 185-2026-EF", fecha: "2026", monto: 658500000, entidad: "ANIN (hasta S/ 375 mill.) y Ministerio de Defensa", detalle: "Transferencia de la Reserva de Contingencia para reducir riesgos por El Niño.", url: "https://gestion.pe/peru/mef-autorizo-transferencia-de-s-6585-millones-para-enfrentar-riesgos-por-el-fenomeno-el-nino-noticia/" },
    { norma: "D. S. N.° 191-2026-EF", fecha: "2026-09-17", monto: 205300000, entidad: "Ministerio de Transportes y Comunicaciones", detalle: "Puentes y carreteras en riesgo de colapso por lluvias; desagregación en 5 días.", url: "https://www.infobae.com/peru/2026/09/17/fenomeno-el-nino-el-despacho-de-rafael-rey-recibe-s205-millones-ante-riesgo-de-colapso-en-puentes-y-carreteras-de-peru/" },
    { norma: "D. S. N.° 221-2026-EF", fecha: "2026", monto: 90799974, entidad: "Ministerio de Desarrollo Agrario y Riego", detalle: "Preparación y respuesta del agro frente a El Niño.", url: "https://www.gob.pe/institucion/mef/noticias/1458866-mef-destina-recursos-para-acciones-limpieza-y-descolmatacion-de-rios-frente-al-fenomeno-el-nino" },
    { norma: "Ley N.° 32744 (componente FEN)", fecha: "2026-11-02", monto: 702900000, entidad: "Minedu · MTPE · Produce", detalle: "Mantenimiento de colegios, empleo temporal y créditos a pescadores.", url: "https://andina.pe/agencia/noticia-credito-suplementario-que-se-destinaran-los-8228-millones-aprobados-el-congreso-1097757.aspx" },
    { norma: "Ley N.° 32732 (contingente BID)", fecha: "2026-07-19", monto: 300000000, entidad: "Reserva de Contingencia — MEF", detalle: "Disponible solo con declaratoria de emergencia nacional.", url: "https://andina.pe/agencia/noticia-normas-legales-oficializan-ley-aprueba-creditos-suplementarios-para-cierre-brechas-1084228.aspx" },
    { norma: "D. U. N.° 015-2026 (RM 525 y 526-2026-EF/15)", fecha: "2026-10-31", monto: 2000000000, entidad: "MYPE — garantías y reprogramación de créditos", detalle: "Garantías estatales (no es gasto presupuestal directo). Solicitudes hasta el 30-04-2027.", url: "https://energiminas.com/2026/11/23/el-nino-mef-establece-disposiciones-para-respaldar-capacidad-de-pago-de-las-mype/", garantia: true },
    { norma: "D. U. N.° 010-2026", fecha: "2026", monto: null, entidad: "Obras por Impuestos", detalle: "Facilita inversión privada en prevención; vigente al 31-12-2027.", url: "https://www.gob.pe/institucion/mef/noticias/1438579-gobierno-dinamiza-la-inversion-privada-para-prevenir-danos-y-proteger-a-la-poblacion-ante-el-nino" }
  ]
};
