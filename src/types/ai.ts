/**
 * Segmento comercial detectado para el mensaje del cliente.
 */
export type AITipoCliente = 'mayorista' | 'minorista' | 'indeterminado';

/**
 * Categoría principal asociada a la consulta o al producto de interés.
 */
export type AICategoria = 'belleza' | 'hogar_aseo' | 'infantil_bebes' | 'cuidado_personal' | 'ninguna';

/**
 * Nivel de prioridad operativa asignado al mensaje.
 */
export type AIPrioridad = 'maxima' | 'alta' | 'media' | 'baja';

/**
 * Clasificación estructurada del mensaje entrante.
 */
export interface AIClasificacion {
  /**
   * Tipo de cliente inferido a partir del mensaje y su contexto.
   */
  tipoCliente: AITipoCliente;

  /**
   * Categoría comercial principal vinculada al mensaje.
   */
  categoria: AICategoria;

  /**
   * Prioridad de atención sugerida para el equipo.
   */
  prioridad: AIPrioridad;

  /**
   * Indica si conviene escalar la conversación a una persona.
   */
  requiereHumano: boolean;

  /**
   * Estimación de intención comercial en una escala de 0 a 100.
   */
  puntuacionIntencion: number;
}

/**
 * Respuesta final generada por la IA para automatizar la atención por WhatsApp.
 */
export interface AIResponse {
  /**
   * Clasificación del mensaje entrante.
   */
  clasificacion: AIClasificacion;

  /**
   * Respuesta empática, breve y lista para enviar por WhatsApp.
   */
  respuestaCliente: string;

  /**
   * Sugerencia de upsell o cross-sell enfocada en la marca Giraf.
   */
  sugerenciaUpsell: string | null;
}
