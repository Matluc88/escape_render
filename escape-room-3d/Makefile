# Escape Room 3D - Makefile
# Comandi rapidi per gestire l'applicazione Docker

.PHONY: help build up down restart logs ps clean backup restore deploy

# Colori per output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
NC     := \033[0m # No Color

help: ## Mostra questo messaggio di aiuto
	@echo "$(GREEN)Escape Room 3D - Docker Management$(NC)"
	@echo ""
	@echo "Comandi disponibili:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

build: ## Build delle immagini Docker
	@echo "$(GREEN)Building Docker images...$(NC)"
	docker-compose build

up: ## Avvia tutti i servizi
	@echo "$(GREEN)Starting services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "Frontend: http://$$(hostname -I | awk '{print $$1}')"

down: ## Ferma tutti i servizi (mantiene i dati)
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker-compose down

restart: ## Riavvia tutti i servizi
	@echo "$(YELLOW)Restarting services...$(NC)"
	docker-compose restart

logs: ## Mostra i logs di tutti i servizi
	docker-compose logs -f

logs-frontend: ## Mostra i logs del frontend
	docker-compose logs -f frontend

logs-backend: ## Mostra i logs del backend
	docker-compose logs -f backend

logs-db: ## Mostra i logs del database
	docker-compose logs -f db

logs-mqtt: ## Mostra i logs di MQTT
	docker-compose logs -f mqtt

ps: ## Mostra lo stato dei servizi
	docker-compose ps

stats: ## Mostra l'uso delle risorse
	docker stats

clean: ## Ferma e rimuove tutto (ATTENZIONE: elimina anche i volumi!)
	@echo "$(YELLOW)WARNING: This will remove all containers, networks, and volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)Cleanup completed$(NC)"; \
	fi

deploy: ## Deploy automatico (usa lo script)
	@echo "$(GREEN)Running deployment script...$(NC)"
	./deploy-raspberry.sh

init: ## Inizializza l'ambiente (copia .env e installa dipendenze)
	@echo "$(GREEN)Initializing environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.docker .env; \
		echo "$(GREEN)Created .env file$(NC)"; \
		echo "$(YELLOW)Remember to edit .env with your settings!$(NC)"; \
	else \
		echo "$(YELLOW).env already exists$(NC)"; \
	fi

backup-db: ## Backup del database
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backups
	docker exec escape-db pg_dump -U escape_user escape_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup saved in backups/$(NC)"

restore-db: ## Restore del database (usa: make restore-db FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "$(YELLOW)Usage: make restore-db FILE=backups/backup_YYYYMMDD_HHMMSS.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring database from $(FILE)...$(NC)"
	cat $(FILE) | docker exec -i escape-db psql -U escape_user escape_db
	@echo "$(GREEN)Database restored$(NC)"

shell-frontend: ## Accedi alla shell del container frontend
	docker exec -it escape-frontend sh

shell-backend: ## Accedi alla shell del container backend
	docker exec -it escape-backend bash

shell-db: ## Accedi al database PostgreSQL
	docker exec -it escape-db psql -U escape_user escape_db

migrate: ## Esegui le migrazioni del database
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker exec escape-backend alembic upgrade head

migrate-rollback: ## Rollback dell'ultima migrazione
	@echo "$(YELLOW)Rolling back last migration...$(NC)"
	docker exec escape-backend alembic downgrade -1

dev: ## Avvia in modalità development (con logs in tempo reale)
	docker-compose up

rebuild: down build up ## Rebuild completo (ferma, builda, riavvia)

update: ## Aggiorna l'applicazione (git pull + rebuild)
	@echo "$(GREEN)Updating application...$(NC)"
	git pull
	docker-compose build
	docker-compose up -d
	@echo "$(GREEN)Update completed$(NC)"

prune: ## Pulizia delle immagini Docker non usate
	@echo "$(YELLOW)Cleaning unused Docker images...$(NC)"
	docker system prune -a -f

ip: ## Mostra l'IP del Raspberry Pi
	@echo "$(GREEN)Raspberry Pi IP addresses:$(NC)"
	@hostname -I

urls: ## Mostra gli URL dell'applicazione
	@echo "$(GREEN)Application URLs:$(NC)"
	@IP=$$(hostname -I | awk '{print $$1}'); \
	echo "  Frontend:  http://$$IP"; \
	echo "  API:       http://$$IP/api"; \
	echo "  WebSocket: ws://$$IP/ws"; \
	echo "  MQTT:      mqtt://$$IP:1883"; \
	echo "  MQTT WS:   ws://$$IP:9001"

health: ## Verifica lo stato di salute dei servizi
	@echo "$(GREEN)Checking service health...$(NC)"
	@docker-compose ps | grep healthy && echo "$(GREEN)All services healthy$(NC)" || echo "$(YELLOW)Some services are not healthy$(NC)"

test-mqtt: ## Test della connessione MQTT
	@echo "$(GREEN)Testing MQTT connection...$(NC)"
	docker exec escape-mqtt mosquitto_pub -h localhost -t test -m "Hello from Makefile"

verify-spawn: ## Verifica sincronizzazione coordinate spawn
	@echo "$(GREEN)Verifying spawn coordinates synchronization...$(NC)"
	@./verify-spawn-sync.sh

fix-spawn: ## Applica fix coordinate spawn al database locale
	@echo "$(GREEN)Applying spawn coordinate fix to local database...$(NC)"
	docker-compose exec -T db psql -U escape_user -d escape_db < fix-spawn-raspberry-CORRETTE-2026.sql
	@echo "$(GREEN)Spawn coordinates updated$(NC)"

deploy-spawn-raspberry: ## Deploy coordinate spawn su Raspberry Pi
	@echo "$(GREEN)Deploying spawn coordinates to Raspberry Pi...$(NC)"
	@./deploy-spawn-fix-raspberry.sh

.DEFAULT_GOAL := help