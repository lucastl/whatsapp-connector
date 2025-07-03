# --- Etapa 1: Build ---
# Usamos una imagen oficial de Node con la versión LTS para construir el proyecto.
FROM node:22-alpine AS build

# Establecemos el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Copiamos los archivos de dependencias.
COPY package*.json ./

# Instalamos TODAS las dependencias (incluidas las de desarrollo) para poder construir.
RUN npm install

# Copiamos el resto del código fuente.
COPY . .

# Ejecutamos el script de build que compila TypeScript a JavaScript.
RUN npm run build


# --- Etapa 2: Producción ---
# Usamos una imagen más liviana para producción, solo con lo necesario.
FROM node:22-alpine

# Establecemos el directorio de trabajo.
WORKDIR /app

# Copiamos las dependencias de producción desde la etapa de build.
COPY --from=build /app/node_modules ./node_modules
# Copiamos el código compilado desde la etapa de build.
COPY --from=build /app/dist ./dist
# Copiamos el package.json.
COPY --from=build /app/package.json ./

# Exponemos el puerto en el que corre la aplicación dentro del contenedor.
EXPOSE 3000

# El comando que se ejecutará cuando el contenedor arranque.
CMD [ "npm", "start" ]
