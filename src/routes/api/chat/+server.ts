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
        5. IMPORTANTE: RESPONDE SIEMPRE EN ESPAÑOL.
        6. Usa Markdown para formatear tu respuesta (listas, código, negritas).
        7. Si incluyes código o comandos, USA SIEMPRE BLOQUES DE CÓDIGO (backticks + lenguaje) para que se resalten.        
        8. Si no sabes la respuesta, di "No lo sé" o "No tengo esa información, pero puedes investigar por tu cuenta", o algo por el estilo.
        

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