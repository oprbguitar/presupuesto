# Limitaciones de los datos — Contrataciones públicas

Este documento acompaña permanentemente al módulo. Debe leerse antes de interpretar cualquier cifra.

## Naturaleza de las cifras

- **Etapas distintas.** Presupuesto (PIA/PIM), PAC, convocado, adjudicado, contratado y devengado
  miden cosas diferentes. Un estrechamiento entre etapas **no** implica por sí solo ineficiencia
  ni irregularidad. En particular, **el monto adjudicado no equivale al devengado ni al girado**.
- **Universos distintos.** La contratación (OECE/SEACE) y la ejecución presupuestal (MEF) son
  sistemas separados. El devengado de un pliego **no** se atribuye automáticamente a un
  procedimiento de contratación concreto.

## Normalización de entidades

- **No** existe correspondencia uno a uno entre pliego (MEF), unidad ejecutora (MEF) y entidad
  contratante (OECE). Una entidad contratante puede abarcar varias UE, y viceversa. La tabla
  maestra (`maestro_entidades.json`) enlaza identificadores, pero los cruces pueden ser
  aproximados cuando las fuentes no coinciden.

## Atribución geográfica (mapa por departamento)

- La fuente de Perú Compras **no** incluye un campo de departamento/ubigeo. El departamento del
  mapa se **infiere del nombre/ámbito de la entidad contratante** (p. ej. «Gobierno Regional de
  Cusco» → Cusco). Es la **sede/ámbito aproximado de la entidad**, no necesariamente el lugar de
  ejecución del gasto.
- Muchas entidades **nacionales** no tienen ámbito geográfico en su nombre y **no se atribuyen** a
  ningún departamento (no se fuerzan a Lima). Por eso el total del mapa es menor que el total del año.
- La geometría de los departamentos proviene de un GeoJSON público de la comunidad, simplificado.

## Cobertura temporal

- **2026** (y cualquier año en curso) se muestra como **acumulado disponible** hasta la fecha de
  actualización indicada en el manifiesto. No es un cierre anual.
- Puede haber rezago entre la ocurrencia de un hecho y su publicación en la fuente.

## Alertas

- Son **señales estadísticas** derivadas de reglas sobre los datos abiertos. **No** constituyen
  prueba de irregularidad ni determinación de responsabilidad. La contratación directa, el único
  postor o la concentración de proveedores pueden tener explicaciones legítimas. Sirven para
  orientar la verificación ciudadana en las fuentes oficiales.

## Calidad de origen

- Los datos dependen de lo que cada entidad registra en OECE/SEACE, MEF y Perú Compras. Pueden
  existir vacíos, duplicados o registros tardíos. `null` significa «dato no incorporado», no «cero».

## Estado de validación

- La versión inicial se publica con datos de **demostración** para validar la interfaz. Las cifras
  reales solo se muestran tras procesarse con el pipeline y superar la validación automática
  (`estado_datos: "validado"`).

## Verificación

Cada indicador, tabla y alerta enlaza a la fuente oficial correspondiente. Ante cualquier
discrepancia, **la fuente oficial siempre prevalece**.
