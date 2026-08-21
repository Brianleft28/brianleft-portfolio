# Todos hacen un chatbot RAG con LangChain. Yo escribí el pipeline a mano — y lo deployé.

*"Una IA personal que conoce mis proyectos" ya es todo un género. Esta es la versión que construí, y las dos decisiones que la llevaron a otro lado.*

---

La receta estándar está en todos lados: LangChain, una base vectorial, un modelo local, y tenés una IA que responde sobre tus documentos. Yo hice una también. Pero tomé dos decisiones que cambiaron lo que es.

## 1. Escribí cada paso a mano — sin framework

No porque los frameworks sean malos. Porque aprendo un sistema construyéndolo, y quería **ser dueño de los modos de falla**. Así que ingesta, extracción de keywords, recuperación por relevancia, armado de contexto y streaming están escritos en TypeScript, dentro de la misma app — código que puedo debuggear, testear y explicar línea por línea.

El trade-off que defiendo: **mi índice son keywords curadas a mano, no embeddings opacos.** Menos magia, más control. El pago aparece cuando el asistente responde *mal* sobre un proyecto — lo corrijo **editando datos** (una keyword), no re-embebiendo ni reentrenando nada. El índice de recuperación es contenido editable.

## 2. No es un chatbot — es un sistema parametrizable, y está vivo

La parte que más me importa: **todo lo que el asistente sabe, y todo lo que el sitio muestra, es dato — no código.** Un panel de administración gobierna tres capas:

- **Contenido:** los proyectos se cargan como Markdown, se sincronizan a un filesystem virtual, y cada uno lleva las keywords que alimentan la recuperación.
- **Idiomas:** todo existe en español e inglés, resuelto por visitante, sin escribir el contenido dos veces.
- **Comportamiento:** las personalidades del asistente —voz, idioma, saludo, prompt— son filas en una base de datos.

Un cambio de contenido, de idioma o del tono del asistente se despliega **como dato, no como deploy**. Es white-label por diseño.

Y está **hosteado de punta a punta** — VPS, nginx, TLS, CI/CD. Lo que significa lo que la mayoría de estos proyectos no puede ofrecer: **podés usarlo de verdad.** No es un screenshot de mi setup local. Está vivo.

## Qué me enseñó de verdad hacerlo a mano

Escribir el pipeline yo mismo no lo hizo más "avanzado". Lo hizo **mío** — puedo explicar y debuggear cada línea, y entiendo exactamente qué habría estado haciendo un framework por mí. Deployarlo convirtió una demo en algo que la gente puede tocar.

Esa, para mí, es la diferencia entre "seguí un tutorial de RAG" y "construí y opero un sistema".

---

*Es el frente de mi portfolio — se navega como una terminal de Linux y le preguntás a un asistente lo que quieras sobre mi trabajo. Andá y rompelo: **[brianleft.com](https://brianleft.com)**. Backend / sistemas, abierto a remoto.*
