# 🚀 Pronto Bolivia CRM Inteligente

Pronto Bolivia CRM es una plataforma moderna de gestión de clientes (CRM) integrada directamente con WhatsApp, diseñada para automatizar la atención comercial mediante Inteligencia Artificial. Utiliza una arquitectura soberana sin intermediarios para garantizar estabilidad y privacidad.

## ✨ Características Principales

-   **Integración Nativa con WhatsApp:** Conexión directa vía WebSocket (Baileys) sin servidores externos.
-   **IA Comercial (GPT-4o-mini):** Detecta automáticamente si el cliente busca compras por mayor o unidad, identifica categorías de interés y envía catálogos.
-   **Detección de Identidad Moderna (@lid):** Soporte total para las nuevas medidas de privacidad de Meta, permitiendo responder a usuarios con números ocultos.
-   **Dashboard en Tiempo Real:** Interfaz intuitiva para monitorear conversaciones, gestionar contactos y supervisar la IA.
-   **Control Humano ↔ Bot:** Los asesores pueden tomar el control de cualquier chat y devolverlo al bot con un solo clic.
-   **Blindaje de Seguridad:** Filtros heurísticos y reglas de IA para bloquear solicitudes maliciosas o peligrosas.
-   **Filtro de Grupos:** El bot ignora automáticamente grupos para evitar intervenciones no deseadas.

## 🛠️ Stack Tecnológico

-   **Frontend & Backend:** [Next.js 16](https://nextjs.org/) con Turbopack.
-   **Lenguaje:** TypeScript.
-   **WhatsApp Core:** [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).
-   **Base de Datos:** Firebase Firestore (Tiempo Real).
-   **IA:** OpenAI API.
-   **Estilos:** SASS / CSS Modules.

## 📋 Requisitos Previos

-   Node.js v20 o superior (Recomendado v26).
-   Una cuenta de Firebase con un proyecto configurado.
-   Una API Key de OpenAI.
-   Un número de WhatsApp para vincular.

## ⚙️ Configuración e Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/javi24021/ProntoBolivia.git
    cd apex-pronto-ai
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env.local` en la raíz de `apex-pronto-ai/` basándote en el archivo `.env.example`. Asegúrate de completar los siguientes campos:
    -   `NEXT_PUBLIC_FIREBASE_*`: Credenciales de tu cliente Firebase.
    -   `FIREBASE_SERVICE_ACCOUNT`: JSON de tu cuenta de servicio (formato string).
    -   `OPENAI_API_KEY`: Tu llave de OpenAI.
    -   `EVOLUTION_INSTANCE_NAME`: Nombre de tu instancia (ej: "ProntoBolivia").

4.  **Iniciar el entorno de desarrollo:**
    ```bash
    npm run dev
    ```

## 📱 Cómo Vincular WhatsApp

1.  Abre el Dashboard en `http://localhost:3000/dashboard`.
2.  Haz clic en el icono de **tres puntos (⋮)** en la parte superior derecha.
3.  Espera a que aparezca el código QR.
4.  Escanea con tu celular (WhatsApp -> Dispositivos vinculados).
5.  ¡Listo! Verás el estado **Conectado** y el bot empezará a trabajar.

## 🛡️ Reglas de Seguridad y Negocio

### Seguridad Ética (Layer 0)
El sistema tiene un filtro de bloqueo inmediato si el usuario solicita información para:
-   Dañar seres vivos o actos violentos.
-   Actos ilegales (robos, estafas).
-   Uso peligroso de químicos.
*La respuesta será bloqueada y escalada a un supervisor con prioridad alta.*

### Flujo Comercial
1.  **Identificación:** El bot pregunta el nombre si no lo conoce.
2.  **Calificación:** Identifica si es Mayorista o Minorista.
3.  **Conversión:** Envía el link del catálogo según la categoría detectada.

## 📄 Licencia
Este proyecto es propiedad privada de Pronto Bolivia. Todos los derechos reservados.
