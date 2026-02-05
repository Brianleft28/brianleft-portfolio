# RAG-CONTEXT - Sistema de Generación Aumentada por Recuperación

Este documento describe la arquitectura y configuración del sistema RAG (Retrieval Augmented Generation) del portfolio.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│ CHAT CONTROLLER (/api/chat)                                 │
│ - Streaming HTTP con Transfer-Encoding: chunked             │
│ - Rate limiting: 15 req/día (free tier por IP)              │
│ - API key propia: sin límite                                │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ CHAT SERVICE                                                │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. buildContext(prompt, userId)                        │  │
│ │    - Carga memory.md (slug="memory") como base         │  │
│ │    - Busca memorias relevantes por keywords            │  │
│ │    - Combina contextos según tipo de consulta          │  │
│ └────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 2. buildFullPrompt(prompt, context, mode, userId)      │  │
│ │    - Carga personalidad IA activa del usuario          │  │
│ │    - Reemplaza placeholders {{variable}}               │  │
│ │    - Inyecta instrucciones de formato (terminal)       │  │
│ └────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 3. chat() - AsyncGenerator<string>                     │  │
│ │    - Streaming con Gemini 2.0 Flash                    │  │
│ │    - Yield por cada chunk de respuesta                 │  │
│ └────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ MEMORY SERVICE - Retrieval Engine                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ findRelevant(prompt, userId): Memory[]                 │  │
│ │ 1. Normaliza prompt a minúsculas                       │  │
│ │ 2. Busca keywords: LIKE CONCAT("%", keyword, "%")      │  │
│ │ 3. Si hay match: retorna memorias asociadas            │  │
│ │ 4. Si no hay match: retorna META + INDEX (fallback)    │  │
│ └────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ hydrateMemory(memory, userId): Memory                  │  │
│ │ - Reemplaza {{placeholders}} con valores de Settings   │  │
│ │ - Cache TTL: 60 segundos por usuario                   │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Entidades de Base de Datos

### Memory (tabla: memories)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | int | PK autoincremental |
| type | enum | PROJECT, META, INDEX, DOCS, CUSTOM |
| slug | varchar(100) | Identificador único por usuario |
| title | varchar(255) | Título de la memoria |
| content | longtext | Contenido Markdown completo |
| summary | text | Resumen generado por IA (3 oraciones max) |
| priority | int | Mayor = primero en búsqueda (default: 0) |
| active | boolean | Solo activas se incluyen en búsqueda |
| userId | int FK | Usuario propietario (null = global) |

**Índice único:** `(slug, userId)`

### MemoryKeyword (tabla: memory_keywords)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | int | PK autoincremental |
| memoryId | int FK | Memoria asociada |
| keyword | varchar(100) | Término de búsqueda (minúsculas) |

**Índice único:** `(memoryId, keyword)`

### Tipos de Memoria

```typescript
enum MemoryType {
  PROJECT = 'project',   // Proyecto específico con detalles
  META = 'meta',         // Info general del owner (skills, filosofía)
  INDEX = 'index',       // Perfil profesional con placeholders
  DOCS = 'docs',         // Índice de proyectos (memory.md)
  CUSTOM = 'custom',     // Documento personalizado
}
```

---

## Flujo de Recuperación (Retrieval)

### 1. Entrada del Usuario

```
Prompt: "¿Cuéntame sobre tu experiencia con Svelte?"
```

### 2. Búsqueda de Keywords

```sql
SELECT k.* FROM memory_keywords k
INNER JOIN memories m ON k.memory_id = m.id
WHERE m.user_id = :userId
  AND m.active = true
  AND LOWER(:prompt) LIKE CONCAT('%', LOWER(k.keyword), '%')
```

### 3. Recuperación de Memorias

Si hay keywords que hacen match:
- Se obtienen las memorias asociadas
- Se ordenan por `priority DESC`
- Se limitan a memorias activas del usuario

Si NO hay match:
- Fallback a memorias tipo META + INDEX
- Proporciona contexto genérico del portfolio

### 4. Construcción de Contexto

```typescript
context = memory.md + "\n\n---\n\n" + memorias_relevantes.join("\n\n---\n\n")
```

---

## Sistema de Placeholders

El contenido de las memorias puede incluir placeholders que se reemplazan dinámicamente con valores de la tabla `settings`.

### Placeholders Disponibles

**Categoría: owner**
- `{{owner_name}}` - Nombre completo
- `{{owner_first_name}}` - Primer nombre
- `{{owner_last_name}}` - Apellido
- `{{owner_role}}` - Rol/título profesional
- `{{owner_role_short}}` - Rol abreviado
- `{{owner_location}}` - Ubicación
- `{{owner_email}}` - Email de contacto
- `{{owner_bio}}` - Biografía
- `{{owner_philosophy}}` - Filosofía profesional

**Categoría: contact**
- `{{contact_availability}}` - Estado de disponibilidad
- `{{contact_email}}` - Email (alias de owner_email)

**Categoría: social**
- `{{social_github}}` - URL de GitHub
- `{{social_linkedin}}` - URL de LinkedIn
- `{{social_website}}` - URL de sitio web

**Categoría: branding**
- `{{site_title}}` - Título del sitio
- `{{site_description}}` - Descripción del sitio

**Categoría: ai**
- `{{ai_name}}` - Nombre del asistente IA
- `{{ai_command}}` - Comando para invocar IA
- `{{ai_greeting}}` - Mensaje de bienvenida

### Ejemplo de Hidratación

**Antes:**
```markdown
# Perfil de {{owner_name}}
Soy {{owner_role}} ubicado en {{owner_location}}.
Contacto: {{owner_email}}
```

**Después (con settings del usuario):**
```markdown
# Perfil de Brian Lefkowitz
Soy Full Stack Developer ubicado en Buenos Aires, Argentina.
Contacto: brian@ejemplo.com
```

---

## Personalidades de IA

El sistema soporta múltiples personalidades que modifican el comportamiento de la IA.

### Estructura de Personalidad

```typescript
interface AiPersonality {
  slug: string;           // 'asistente', 'arquitecto', etc.
  name: string;           // Nombre interno
  displayName: string;    // Nombre mostrado al usuario
  systemPrompt: string;   // Prompt completo con instrucciones
  traits: string[];       // ['amigable', 'técnico', 'directo']
  language: string;       // 'es-AR', 'es-ES', 'en-US', 'pt-BR'
  voiceStyle: string;     // 'casual', 'formal', 'technical'
  mode: string;           // 'asistente', 'arquitecto', 'debugger'
  active: boolean;
  isDefault: boolean;
  userId: number | null;  // null = global
}
```

### Idiomas Soportados

| Código | Idioma | Instrucción |
|--------|--------|-------------|
| es-AR | Español (Argentina) | Usar voseo (vos, usás, tenés) |
| es-ES | Español (España) | Usar tuteo (tú, usas, tienes) |
| en-US | English (US) | Formal but friendly |
| pt-BR | Português (Brasil) | Usar você, informal |

### Estilos de Voz

| Estilo | Descripción |
|--------|-------------|
| casual | Amigable, conversacional, usa contracciones |
| formal | Profesional, evita jerga, estructurado |
| technical | Preciso, usa terminología técnica, directo |

---

## Formato de Respuesta

Las respuestas están optimizadas para terminal/CLI:

### Reglas de Formato

1. **NUNCA usar headers markdown** (# o ##)
2. Usar texto plano con saltos de línea
3. Listas con viñetas (• o -)
4. **Negritas** para énfasis permitidas
5. Código inline con backticks permitido
6. Bloques de código con triple backtick permitidos
7. ASCII art permitido
8. Respuestas concisas (no más de 500 palabras)

### Ejemplo de Respuesta Correcta

```
¡Hola! Soy el asistente del portfolio de Brian.

Te cuento sobre su experiencia con Svelte:

• **3+ años** trabajando con Svelte y SvelteKit
• Proyectos destacados en producción
• Contribuciones a la comunidad open source

El proyecto principal es este portfolio interactivo que usa:
- Svelte 5 con runes
- TypeScript strict
- Tailwind CSS
- Vite como bundler

¿Te gustaría saber más sobre algún aspecto específico?
```

---

## Inicialización de Usuario

Al registrar un nuevo usuario, el sistema crea automáticamente:

### 1. Memoria INDEX (Perfil)

```markdown
# PERFIL PROFESIONAL — {{owner_name}}

## Identidad
- **Nombre:** {{owner_name}}
- **Rol:** {{owner_role}}
- **Ubicación:** {{owner_location}}

## Especialización
Configura desde /admin/settings

## Enlaces
- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
- Email: {{owner_email}}
```

### 2. Memoria DOCS (memory.md)

```markdown
# Base de Conocimiento — {{owner_name}}

## Proyectos
_Los proyectos aparecen automáticamente al crearlos._

## Contacto
- Email: {{owner_email}}
- GitHub: {{social_github}}
```

### 3. Settings Iniciales

| Key | Valor Default | Categoría |
|-----|---------------|-----------|
| owner_name | (del registro) | owner |
| owner_role | Developer | owner |
| owner_email | (del registro) | contact |
| ai_name | Asistente | ai |
| ai_command | ai | ai |

### 4. Personalidades por Defecto

- **Asistente** (default): Amigable, profesional, ayuda general
- **Arquitecto**: Técnico, directo, enfocado en código

---

## Sincronización con Proyectos

Cuando se crea un proyecto desde `/admin/projects`:

1. Se crea la memoria tipo PROJECT con el contenido
2. Se generan keywords automáticamente (hasta 15)
3. Se genera un summary con IA (3 oraciones)
4. Se actualiza memory.md con una entrada nueva
5. Se sincroniza el filesystem virtual

### Estructura de Proyecto

```typescript
{
  type: 'project',
  slug: 'mi-proyecto',
  title: 'Mi Proyecto',
  content: '# Mi Proyecto\n\nDescripción completa...',
  summary: 'Proyecto web con React y Node.js.',
  priority: 5,
  keywords: ['react', 'nodejs', 'fullstack', 'api']
}
```

---

## Cache y Performance

### Cache de Settings

- **TTL:** 60 segundos por usuario
- **Invalidación:** Automática por TTL
- **Alcance:** Por instancia del servicio

### Recomendaciones

1. **Keywords efectivos:** Usar 10-15 keywords por proyecto
2. **Prioridades:** Proyectos importantes con priority > 5
3. **Summaries:** Mantenerlos concisos (máx 3 oraciones)
4. **Contenido:** Markdown bien estructurado, sin headers h1

---

## Limitaciones Conocidas

1. **Búsqueda por substring:** No semántica, solo coincidencia de texto
2. **Sin embeddings:** No hay búsqueda vectorial
3. **MySQL específico:** Query usa CONCAT() que es MySQL
4. **Context acumulativo:** memory.md crece con cada proyecto
5. **Cache estático:** TTL fijo de 60 segundos

---

## Configuración de Producción

### Variables de Entorno Requeridas

```env
# IA
GEMINI_API_KEY=tu-api-key-de-gemini

# Base de datos (para queries RAG)
DB_HOST=db
DB_PORT=3306
DB_NAME=portfolio
DB_USER=portfolio
DB_PASSWORD=<seguro>

# Redis (para rate limiting)
REDIS_HOST=redis
REDIS_PORT=6379
```

### Rate Limiting

| Tier | Límite | Ventana |
|------|--------|---------|
| Free (sin API key) | 15 requests | 24 horas |
| Pro (con API key propia) | Ilimitado | - |

---

## Troubleshooting

### La IA no encuentra proyectos

1. Verificar que la memoria tiene `active: true`
2. Verificar que hay keywords asociados
3. Verificar que el keyword aparece en el prompt del usuario
4. Revisar que memory.md (slug="memory") existe

### Placeholders no se reemplazan

1. Verificar que el setting existe en la tabla
2. Verificar que tiene el userId correcto
3. Esperar 60 segundos (TTL del cache)

### Respuestas genéricas

1. Agregar más keywords específicos
2. Aumentar la prioridad de memorias relevantes
3. Revisar que el contenido tiene información útil

---

## Endpoints Relacionados

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /chat | Chat con IA (streaming) |
| GET | /memory | Listar memorias |
| GET | /memory/:slug | Obtener memoria |
| POST | /memory | Crear memoria |
| PUT | /memory/:slug | Actualizar memoria |
| DELETE | /memory/:slug | Eliminar memoria |
| POST | /memory/search | Buscar memorias relevantes |

---

*Documento actualizado: Febrero 2026*
