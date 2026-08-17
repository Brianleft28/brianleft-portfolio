/**
 * Script para generar keywords con Gemini para todas las memorias
 * Ejecutar: npx ts-node src/scripts/generate-keywords.ts
 */

import { DataSource } from 'typeorm';
import { Memory } from '../entities/memory.entity';
import { MemoryKeyword } from '../entities/memory-keyword.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

async function generateKeywordsWithGemini(content: string, title: string): Promise<string[]> {
  const prompt = `Genera 15 keywords para RAG en español sobre este contenido.
Reglas:
- 1-3 palabras cada keyword
- Minusculas sin acentos  
- Incluir tecnologias, conceptos tecnicos
- Sin nombres de personas

Titulo: ${title}
Contenido: ${content.substring(0, 3000)}

Responde SOLO un array JSON sin markdown ni explicaciones:
["keyword1","keyword2","keyword3","keyword4","keyword5","keyword6","keyword7","keyword8","keyword9","keyword10","keyword11","keyword12","keyword13","keyword14","keyword15"]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates[0]?.content?.parts[0]?.text || '[]';
  
  // Limpiar markdown code blocks
  let cleanText = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Extraer JSON del texto
  const jsonMatch = cleanText.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    console.error('No se pudo parsear respuesta:', text.substring(0, 100));
    return [];
  }

  try {
    const keywords = JSON.parse(jsonMatch[0]) as string[];
    return keywords
      .map(k => k.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      .filter(k => k.length > 1 && k.length < 50)
      .slice(0, 15);
  } catch (e) {
    console.error('Error parseando JSON:', jsonMatch[0].substring(0, 100));
    return [];
  }
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY no está configurada en .env');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    username: process.env.DB_USER || 'portfolio_user',
    password: process.env.DB_PASSWORD || 'portfolio_pass',
    database: process.env.DB_NAME || 'portfolio_db',
    entities: [Memory, MemoryKeyword],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Conectado a la base de datos\n');

  const memoryRepo = dataSource.getRepository(Memory);
  const keywordRepo = dataSource.getRepository(MemoryKeyword);

  const memories = await memoryRepo.find();
  console.log(`📚 Procesando ${memories.length} memorias...\n`);

  for (const memory of memories) {
    console.log(`\n🔍 Procesando: ${memory.title} (${memory.type})`);
    
    // Saltar si no tiene contenido
    if (!memory.content || memory.content.length < 50) {
      console.log(`   ⚠️ Contenido muy corto, saltando...`);
      continue;
    }

    // Eliminar keywords existentes
    await keywordRepo.delete({ memoryId: memory.id });

    // Generar nuevas keywords con Gemini
    console.log(`   🤖 Consultando Gemini...`);
    const keywords = await generateKeywordsWithGemini(memory.content, memory.title);
    
    if (keywords.length === 0) {
      console.log(`   ❌ No se generaron keywords`);
      continue;
    }

    // Insertar nuevas keywords
    const keywordEntities = keywords.map(keyword => 
      keywordRepo.create({ memoryId: memory.id, keyword })
    );
    await keywordRepo.save(keywordEntities);

    console.log(`   ✅ ${keywords.length} keywords: ${keywords.join(', ')}`);
    
    // Rate limiting - esperar 1 segundo entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n🎉 Proceso completado!');
  await dataSource.destroy();
}

main().catch(console.error);
