#!/bin/bash

# Salir inmediatamente si un comando falla.
set -e

echo "🚀 Iniciando despliegue en el servidor..."

# 1. Descargar la última versión de la imagen desde Docker Hub.
echo "  -> Descargando la nueva imagen..."
# Usamos el nuevo comando sin guion
docker compose pull

# 2. Levantar los contenedores con la nueva imagen.
# Docker Compose es lo suficientemente inteligente para recrear solo los que cambiaron.
echo "  -> Reiniciando los servicios..."
# Usamos el nuevo comando sin guion
docker compose up -d

# 3. Limpiar imágenes viejas y sin usar para liberar espacio.
echo "  -> Limpiando imágenes antiguas..."
docker image prune -f

echo "🎉 ¡Despliegue en el servidor completado!"
