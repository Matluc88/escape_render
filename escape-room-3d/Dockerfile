# Multi-stage build for Escape Room Frontend
# Ottimizzato per Raspberry Pi (ARM64/ARM)

# Stage 1: Builder - Build dell'applicazione React/Vite
FROM node:18-alpine AS builder

WORKDIR /app

# Accetta variabili d'ambiente come ARG per la build
ARG VITE_BACKEND_URL=/api
ARG VITE_WS_URL=/ws

# Esporta come ENV per la build
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

# Copia package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copia il codice sorgente
COPY . .

# Build dell'applicazione (le ENV vengono usate da Vite)
RUN npm run build

# Stage 2: Production - Nginx per servire i file statici
FROM nginx:1.25-alpine AS production

# Installa curl per health check (più affidabile di wget)
RUN apk add --no-cache curl

# Copia i file buildati dal builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia la configurazione Nginx custom
COPY nginx.conf /etc/nginx/nginx.conf

# Esponi la porta 80
EXPOSE 80

# Health check - usa curl per verificare l'endpoint /health
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
