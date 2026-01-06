'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
// 1. Importar el módulo 'http' y sus tipos
const http_1 = __importDefault(require('http'));
// 2. Definir el host y el puerto
const host = '127.0.0.1';
const port = 3000;
// 3. Crear el servidor con tipos para req y res
const server = http_1.default.createServer((req, res) => {
	// req: IncomingMessage (Información de la solicitud entrante)
	// res: ServerResponse (Respuesta que se enviará al cliente)
	// 4. Configurar la cabera de la respuesta
	res.statusCode = 200; // Código de estado HTTP 200 OK
	res.setHeader('Content-Type', 'text/plain'); // Tipo de contenido de la respuesta
	// 5. Escribir y enviar la respuesta
	res.end('Hola desde mi primera app Node.js con TypeScript!\n');
});
// 6. Hacer que el servidor escuche en el host y puerto definidos
server.listen(port, host, () => {
	console.log(`Servidor TypeScript escuchando en http://${host}:${port}/`);
});
