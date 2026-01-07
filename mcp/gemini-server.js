import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Cargar .env desde la raíz del proyecto
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
config({ path: envPath, override: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.error("Usando GEMINI_API_KEY:", GEMINI_API_KEY ? "✅ Configurada" : "❌ No configurada");

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY no configurada");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cargar el system prompt de Torvalds
function loadTorvaldsPersonality() {
  try {
    const agentPath = path.join(process.cwd(), ".github/copilot-agents/torvalds.md");
    return fs.readFileSync(agentPath, "utf-8");
  } catch {
    return "Actuá como un CTO crítico y directo.";
  }
}

// Crear servidor MCP con la nueva API
const server = new McpServer({
  name: "torvalds-gemini",
  version: "1.0.0"
});

// Registrar herramienta con la nueva sintaxis
server.tool(
  "ask_torvalds",
  "Consulta a Torvalds (CTO AI) usando tu API de Gemini",
  { question: z.string().describe("Tu pregunta") },
  async ({ question }) => {
    const personality = loadTorvaldsPersonality();
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: personality
    });

    const result = await model.generateContent(question);
    return {
      content: [{ type: "text", text: result.response.text() }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Torvalds MCP corriendo");
}

main().catch(console.error);