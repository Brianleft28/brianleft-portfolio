# --- ETAPA 1: Build Stage (El Taller de Construcción) ---
# Usamos una imagen oficial de Node.js que incluye todas las herramientas necesarias.
# 'lts-alpine' usa la versión Long-Term Support sobre una base de Linux Alpine, que es muy ligera.
FROM node:lts-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor. Todos los comandos se ejecutarán aquí.
WORKDIR /app

# Copiamos los archivos que definen nuestro proyecto y sus dependencias.
# Copiamos solo estos primero para aprovechar la caché de Docker. Si no cambian, Docker no volverá a instalar las dependencias.
COPY package.json package-lock.json ./

# Instalamos TODAS las dependencias, incluyendo las de desarrollo, necesarias para construir el proyecto.
RUN npm install

# Ahora copiamos el resto del código fuente de nuestra aplicación.
COPY . .

# Ejecutamos el script 'build' de nuestro package.json.
# Esto compilará nuestro SvelteKit y generará la salida en la carpeta './build'.
RUN npm run build


# --- ETAPA 2: Production Stage (El Contenedor de Envío) ---
# Empezamos de nuevo desde una imagen base limpia y ligera.
FROM node:lts-alpine AS production

# Establecemos el directorio de trabajo para la etapa de producción.
WORKDIR /app

# Copiamos solo los archivos de dependencias de producción desde la etapa 'builder'.
# Esto es más eficiente que copiarlos desde nuestro disco local de nuevo.
COPY --from=builder /app/package.json /app/package-lock.json ./

# Instalamos SOLAMENTE las dependencias de PRODUCCIÓN.
# El flag '--omit=dev' le dice a npm que ignore las devDependencies.
RUN npm install --omit=dev

# ¡La magia del multi-stage! Copiamos la aplicación ya construida desde la etapa 'builder'.
# No copiamos el código fuente, solo el resultado final y optimizado.
COPY --from=builder /app/build ./build

# Exponemos el puerto en el que la aplicación SvelteKit correrá por defecto.
# Esto es documentación para Docker; no abre el puerto en la máquina host.
EXPOSE 3000

# El comando final para iniciar la aplicación cuando se ejecute el contenedor.
# SvelteKit con adapter-node (el adaptador por defecto) inicia un servidor Node.js.
# Usamos 'node build/index.js' para ejecutar el servidor de producción.
# El host 0.0.0.0 es crucial para que sea accesible desde fuera del contenedor.
# (Nota: El adaptador de SvelteKit maneja la variable de entorno HOST, por lo que no es necesario especificarlo aquí)
CMD [ "node", "build/index.js" ]