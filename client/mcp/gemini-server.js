import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Cargar .env desde la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
config({ path: path.join(projectRoot, '.env'), override: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY no está configurada en .env");
  process.exit(1);
}
console.error("Usando GEMINI_API_KEY: ✅ Configurada");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cargar la personalidad base y los modos
function loadPersonality(mode = 'arquitecto') {
  try {
    const basePath = path.join(projectRoot, '.github', 'agents', 'torvalds.agent.md');
    let personality = fs.readFileSync(basePath, 'utf-8');

    const modePath = path.join(projectRoot, '.github', 'agents', 'modes', `${mode}.md`);
    if (fs.existsSync(modePath)) {
      const modeContent = fs.readFileSync(modePath, 'utf-8');
      personality += `\n\n${modeContent}`;
    }
    return personality;
  } catch (error) {
    console.error("Error cargando la personalidad:", error);
    return "Actuá como un CTO crítico y directo.";
  }
}

// Crear servidor MCP
const server = new McpServer({
  name: 'torvalds-gemini',
  version: '1.0.0',
});

// Registrar la herramienta 'ask_torvalds'
server.tool(
  'ask_torvalds',
  'Consulta a Torvalds (CTO AI) usando tu API de Gemini',
  z.object({
    question: z.string().describe('Tu pregunta'),
    mode: z.string().optional().describe('El modo de personalidad a usar (ej. arquitecto, debugger)'),
  }),
  async ({ question, mode }) => {
    const personality = loadPersonality(mode);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: personality,
    });

    const result = await model.generateContent(question);
    return {
      content: [{ type: 'text', text: result.response.text() }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Torvalds MCP corriendo en modo STIDO');
}

main().catch(console.error);