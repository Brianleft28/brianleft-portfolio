import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Cargar .env desde la raíz del proyecto
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
config({ path: envPath, override: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log("Usando GEMINI_API_KEY:", GEMINI_API_KEY ? "✅ Configurada" : "❌ No configurada");

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY no configurada");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cargar el system prompt de Torvalds
function loadTorvaldsPersonality() {
  try {
    const agentPath = path.join(process.cwd(), ".github/agents/torvalds.agent.md");
    return fs.readFileSync(agentPath, "utf-8");
  } catch {
    return "Actuá como un CTO crítico y directo.";
  }
}

const server = new Server(
  { name: "torvalds-gemini", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ask_torvalds",
      description: "Consulta a Torvalds (CTO AI) usando tu API de Gemini",
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string", description: "Tu pregunta" }
        },
        required: ["question"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "ask_torvalds") {
    const personality = loadTorvaldsPersonality();
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: personality
    });

    const result = await model.generateContent(args.question);
    return {
      content: [{ type: "text", text: result.response.text() }]
    };
  }

  return { content: [{ type: "text", text: "Herramienta no encontrada" }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Torvalds MCP corriendo");
}

main().catch(console.error);