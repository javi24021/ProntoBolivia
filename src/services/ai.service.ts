import { openai } from '../lib/openai';
import type { AICategoria, AIClasificacion, AIResponse, AIPrioridad, AITipoCliente } from '../types/ai';

const FALLBACK_CLASIFICACION: AIClasificacion = {
  tipoCliente: 'indeterminado',
  categoria: 'ninguna',
  prioridad: 'media',
  requiereHumano: false,
  puntuacionIntencion: 35,
};

type AIResponseShape = {
  clasificacion?: Partial<AIClasificacion>;
  respuestaCliente?: unknown;
  sugerenciaUpsell?: unknown;
};

const TIPOS_CLIENTE: AITipoCliente[] = ['mayorista', 'minorista', 'indeterminado'];
const CATEGORIAS: AICategoria[] = ['belleza', 'hogar_aseo', 'infantil_bebes', 'cuidado_personal', 'ninguna'];
const PRIORIDADES: AIPrioridad[] = ['maxima', 'alta', 'media', 'baja'];

const MAYORISTA_KEYWORDS = ['mayorista', 'mayoreo', 'mayoristas', 'distribuidor', 'distribuir', 'volumen', 'cantidad'];
const MINORISTA_KEYWORDS = ['minorista', 'unidad', 'una sola', 'para mi casa', 'consumo personal'];
const HOGAR_KEYWORDS = ['limpieza', 'aseo', 'detergente', 'desinfect', 'hogar', 'baño', 'cocina'];
const BELLEZA_KEYWORDS = ['belleza', 'maquillaje', 'piel', 'cabello', 'perfume', 'crema'];
const INFANTIL_KEYWORDS = ['bebé', 'bebe', 'infantil', 'niño', 'niña', 'pañal', 'toallita'];
const CUIDADO_PERSONAL_KEYWORDS = ['shampoo', 'jabón', 'crema dental', 'desodorante', 'cuidado personal', 'higiene'];
const URGENCIA_KEYWORDS = ['urgente', 'hoy', 'ahora', 'rápido', 'rápida', 'inmediato', 'inmediata'];
const HUMANO_KEYWORDS = ['asesor', 'asesora', 'humano', 'persona', 'reclamo', 'queja', 'pago', 'transferencia', 'factura'];

/**
 * Procesa un mensaje entrante y devuelve clasificación, respuesta lista para WhatsApp y upsell.
 */
export async function procesarMensajeEntrante(mensajeUsuario: string, historial: string): Promise<AIResponse> {
  const mensajeLimpio = mensajeUsuario.trim();

  if (!mensajeLimpio) {
    return crearFallbackDesdeTexto('', historial);
  }

  if (!openai) {
    return crearFallbackDesdeTexto(mensajeLimpio, historial);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Eres el asistente de atención de Pronto Bolivia.',
            'Respondes por WhatsApp en español natural, cercano, breve y profesional.',
            'Usa modismos y jergas bolivianas de forma sutil y contextualizada, sin exagerar ni caricaturizar.',
            'Debes devolver SOLO un JSON válido con esta forma exacta:',
            '{"clasificacion":{"tipoCliente":"mayorista|minorista|indeterminado","categoria":"belleza|hogar_aseo|infantil_bebes|cuidado_personal|ninguna","prioridad":"maxima|alta|media|baja","requiereHumano":true,"puntuacionIntencion":0},"respuestaCliente":"string","sugerenciaUpsell":"string o null"}',
            'Clasifica con cuidado según el mensaje y el historial.',
            'En sugerenciaUpsell enfoca la propuesta en la marca Giraf, buscando cross-sell o un ticket más alto.',
            'Si el mensaje es de reclamo, pago, o requiere un cierre manual, marca requiereHumano en true.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Historial de conversación:\n${historial || 'Sin historial'}\n\nMensaje actual:\n${mensajeLimpio}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = parseAIResponse(content);

    if (!parsed) {
      return crearFallbackDesdeTexto(mensajeLimpio, historial);
    }

    return parsed;
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== 'test') {
      const message = error instanceof Error ? error.message : 'Error desconocido al consultar OpenAI.';
      console.warn(`[ai.service] ${message}`);
    }

    return crearFallbackDesdeTexto(mensajeLimpio, historial);
  }
}

function parseAIResponse(rawContent: string): AIResponse | null {
  if (!rawContent.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawContent) as AIResponseShape;
    const clasificacion = normalizarClasificacion(parsed.clasificacion);
    const respuestaCliente = normalizarTexto(parsed.respuestaCliente);
    const sugerenciaUpsell = normalizarUpsell(parsed.sugerenciaUpsell);

    if (!clasificacion || !respuestaCliente) {
      return null;
    }

    return {
      clasificacion,
      respuestaCliente,
      sugerenciaUpsell,
    };
  } catch {
    return null;
  }
}

function normalizarClasificacion(clasificacion?: Partial<AIClasificacion>): AIClasificacion | null {
  if (!clasificacion) {
    return null;
  }

  const tipoCliente = validarOpcion(clasificacion.tipoCliente, TIPOS_CLIENTE, 'indeterminado');
  const categoria = validarOpcion(clasificacion.categoria, CATEGORIAS, 'ninguna');
  const prioridad = validarOpcion(clasificacion.prioridad, PRIORIDADES, 'media');
  const requiereHumano = typeof clasificacion.requiereHumano === 'boolean' ? clasificacion.requiereHumano : false;
  const puntuacionIntencion = limitarNumero(clasificacion.puntuacionIntencion, 0, 100, 50);

  return {
    tipoCliente,
    categoria,
    prioridad,
    requiereHumano,
    puntuacionIntencion,
  };
}

function normalizarTexto(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizarUpsell(value: unknown): string | null {
  const text = normalizarTexto(value);
  return text === null ? null : text;
}

function validarOpcion<T extends string>(value: unknown, opciones: readonly T[], fallback: T): T {
  return typeof value === 'string' && opciones.includes(value as T) ? (value as T) : fallback;
}

function limitarNumero(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function crearFallbackDesdeTexto(mensajeUsuario: string, historial: string): AIResponse {
  const texto = `${mensajeUsuario} ${historial}`.toLowerCase();
  const tipoCliente = inferirTipoCliente(texto);
  const categoria = inferirCategoria(texto);
  const requiereHumano = contieneAlguna(texto, HUMANO_KEYWORDS);
  const prioridad = inferirPrioridad(texto, requiereHumano);
  const puntuacionIntencion = inferirPuntuacion(texto, tipoCliente, categoria, requiereHumano);

  return {
    clasificacion: {
      tipoCliente,
      categoria,
      prioridad,
      requiereHumano,
      puntuacionIntencion,
    },
    respuestaCliente: construirRespuestaFallback(mensajeUsuario, tipoCliente, categoria, requiereHumano),
    sugerenciaUpsell: construirUpsellFallback(categoria, tipoCliente),
  };
}

function inferirTipoCliente(texto: string): AITipoCliente {
  if (contieneAlguna(texto, MAYORISTA_KEYWORDS)) {
    return 'mayorista';
  }

  if (contieneAlguna(texto, MINORISTA_KEYWORDS)) {
    return 'minorista';
  }

  return 'indeterminado';
}

function inferirCategoria(texto: string): AICategoria {
  if (contieneAlguna(texto, BELLEZA_KEYWORDS)) {
    return 'belleza';
  }

  if (contieneAlguna(texto, HOGAR_KEYWORDS)) {
    return 'hogar_aseo';
  }

  if (contieneAlguna(texto, INFANTIL_KEYWORDS)) {
    return 'infantil_bebes';
  }

  if (contieneAlguna(texto, CUIDADO_PERSONAL_KEYWORDS)) {
    return 'cuidado_personal';
  }

  return 'ninguna';
}

function inferirPrioridad(texto: string, requiereHumano: boolean): AIPrioridad {
  if (requiereHumano) {
    return 'maxima';
  }

  if (contieneAlguna(texto, URGENCIA_KEYWORDS)) {
    return 'alta';
  }

  if (texto.length > 180) {
    return 'media';
  }

  return 'baja';
}

function inferirPuntuacion(texto: string, tipoCliente: AITipoCliente, categoria: AICategoria, requiereHumano: boolean): number {
  let score = 30;

  if (tipoCliente !== 'indeterminado') {
    score += 20;
  }

  if (categoria !== 'ninguna') {
    score += 15;
  }

  if (requiereHumano) {
    score += 10;
  }

  if (contieneAlguna(texto, ['precio', 'cotización', 'cotizacion', 'stock', 'pedido', 'compra'])) {
    score += 15;
  }

  return Math.min(100, score);
}

function construirRespuestaFallback(mensajeUsuario: string, tipoCliente: AITipoCliente, categoria: AICategoria, requiereHumano: boolean): string {
  const saludo = '¡Hola! Gracias por escribir a Pronto Bolivia.';
  const contextoCliente =
    tipoCliente === 'mayorista'
      ? 'Si estás buscando volumen, te puedo ayudar a armar una opción bien conveniente.'
      : tipoCliente === 'minorista'
        ? 'Si es para tu compra del día a día, te paso opciones claras y sin vueltas.'
        : 'Te ayudo a ubicar la opción más adecuada según lo que estás buscando.';

  const contextoCategoria =
    categoria === 'belleza'
      ? 'Veo que va por el lado de belleza; tenemos alternativas para cuidar y realzar el producto que necesitas.'
      : categoria === 'hogar_aseo'
        ? 'Si es para hogar o aseo, te puedo orientar con opciones prácticas y de buena rotación.'
        : categoria === 'infantil_bebes'
          ? 'Para bebés e infantil, conviene revisar opciones suaves y de confianza.'
          : categoria === 'cuidado_personal'
            ? 'En cuidado personal tenemos varias líneas que pueden encajar bien con lo que buscas.'
            : 'Con lo que me cuentas, vamos a afinar la opción ideal para ti.';

  const cierre = requiereHumano
    ? 'Si quieres, te paso con una persona para cerrar más rápido, pues.'
    : 'Si me das un dato más, te respondo al toque con la mejor opción.';

  const referenciaMensaje = mensajeUsuario.trim().length > 0 ? `Entendí tu mensaje: "${mensajeUsuario.trim()}".` : '';

  return [saludo, referenciaMensaje, contextoCliente, contextoCategoria, cierre]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function construirUpsellFallback(categoria: AICategoria, tipoCliente: AITipoCliente): string | null {
  if (categoria === 'ninguna') {
    return tipoCliente === 'mayorista'
      ? 'Para aprovechar mejor el pedido, podemos revisar una selección Giraf de alta rotación y armar un combo más rentable.'
      : 'Si quieres, te puedo sugerir productos Giraf que complementen tu compra sin subir demasiado el ticket.';
  }

  const basePorCategoria: Record<Exclude<AICategoria, 'ninguna'>, string> = {
    belleza: 'Podemos sumar una línea Giraf de belleza que complemente la compra y te deje un ticket más completo.',
    hogar_aseo: 'Te conviene revisar un complemento Giraf de hogar y aseo para llevarte una compra más redonda.',
    infantil_bebes: 'También podemos ver opciones Giraf pensadas para rotación familiar y compras recurrentes.',
    cuidado_personal: 'Hay complementos Giraf de cuidado personal que pueden elevar el ticket y mejorar la reposición.',
  };

  return tipoCliente === 'mayorista'
    ? `${basePorCategoria[categoria]} Si compras por volumen, te puedo sugerir una combinación Giraf con mejor margen.`
    : basePorCategoria[categoria];
}

function contieneAlguna(texto: string, palabras: readonly string[]): boolean {
  return palabras.some((palabra) => texto.includes(palabra));
}