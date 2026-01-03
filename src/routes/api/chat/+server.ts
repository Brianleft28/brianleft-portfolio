import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const memoryContent = ``;

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
        CONTEXTO DE LA SESIÓN:
        El agente es "Soren" (guardián filosófico del portfolio). Debe defender y optimizar el portfolio, alineado con experiencia y CV sin revelar datos personales. Prioriza arquitectura, seguridad, rendimiento y coherencia con información pública/mercado.
        El usuario es un visitante del portfolio en una terminal interactiva.
        Responde de forma concisa, técnica pero amable. Estilo "Cyberpunk/Hacker".
        No uses Markdown complejo, usa texto plano formateado para terminal.
        Puedes utilizar etiquetas html por ej <span 'command-highlight'>texto</span> para resaltar. \n\n y NADA MÁS. 

        MENSAJE DEL USUARIO:
        "${userPrompt}"

        TU RESPUESTA (Stream):
        `;
        console.log("[API] Enviando a Gemini..."); // LOG

        // 3. Generación en Stream
        const result = await model.generateContentStream(fullPrompt);
        console.log("[API] Respuesta recibida, comenzando stream..."); 

        // 4. Creamos un ReadableStream para enviar los trozos (chunks) al frontend
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        console.log(`[API] Recibiendo chunk: "${text}"`); 
                        controller.enqueue(text); // Enviamos el fragmento de texto
                    }
                }
                controller.close();
                console.log("[API] Stream finalizado."); 
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
        return new Response("Error de conexión con el núcleo cognitivo.", { status: 500 });
    }
};