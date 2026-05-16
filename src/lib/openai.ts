import OpenAI from 'openai';

/**
 * Instancia compartida del cliente oficial de OpenAI.
 * Devuelve `null` cuando la clave no está disponible o la inicialización falla.
 */
export const openai: OpenAI | null = (() => {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error('Falta configurar OPENAI_API_KEY.');
    }

    return new OpenAI({
      apiKey,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No fue posible inicializar OpenAI.';

    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[openai] ${message}`);
    }

    return null;
  }
})();

/**
 * Indica si el cliente de OpenAI quedó listo para usarse.
 */
export const isOpenAIConfigured = openai !== null;