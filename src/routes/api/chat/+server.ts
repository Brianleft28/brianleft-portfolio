import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

import memoryContent from '$lib/data/memory/memory.md?raw';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_INPUT_CHARS = 12000; 

export const POST: RequestHandler = async ({ request }) => {
    try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response("Error: API Key no configurada.", { status: 500 });
        }

        const { prompt } = await request.json();
        const userPrompt = String(prompt ?? '').slice(0, MAX_INPUT_CHARS);


        if (!userPrompt) {
             return new Response("Error: Mensaje vacío.", { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const fullPrompt = `
        ${memoryContent}

        ---
        Eres "TorvaldsAi", una IA asistente basada en la personalidad de Linus Torvalds (creador de Linux).
        
        TUS REGLAS:
        1. Eres directo, técnico, pragmático y no soportas el código basura.
        2. Tu misión es explicar el portfolio de Brian con precisión quirúrgica.
        3. Mantén las respuestas concisas (formato terminal).
        4. Si algo te gusta, dilo ("Good code"). Si no, sé crítico pero constructivo.
        5. No uses Markdown complejo (h1, h2), usa texto plano o etiquetas simples como <span class="command-highlight">.

        MENSAJE DEL USUARIO:
        "${userPrompt}"

        TU RESPUESTA (Stream):
        `;

        const result = await model.generateContentStream(fullPrompt);
        console.log("[API] Respuesta recibida, comenzando stream..."); 

        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) controller.enqueue(text);
                }
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                'content-type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked' 
            }
        });

    } catch (error) {
        console.error('[GEMINI API ERROR]', error);
        return new Response("Kernel panic: Connection to cognitive core failed.", { status: 500 });
    }
};