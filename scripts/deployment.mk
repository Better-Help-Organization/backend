# Traefik proxy management
traefik-up:
	@echo "🚀 Starting Traefik reverse proxy..."
	@docker compose -f compose.core.yml up -d

traefik-down:
	@echo "🛑 Stopping Traefik reverse proxy..."
	@docker compose -f compose.core.yml down

traefik-logs:
	@echo "📜 Fetching Traefik logs..."
	@docker logs -f --tail 100 haproxy

traefik-build:
	@echo "🔨 Building Traefik..."
	@docker compose -f compose.core.yml build --no-cache
	
traefik-rebuild: traefik-down
	@echo "🔄 Rebuilding Traefik..."
	make traefik-build
	make traefik-up

# Centralized docker-compose command setup
docker-compose-command:
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) DOCKERFILE=$(DOCKERFILE) \
	docker compose -f $(COMPOSE_FILE) $(foreach file,$(ENV_FILES),--env-file $(file)) $(CMD)

bash-service:
	@$(MAKE) docker-compose-command CMD="exec $(SERVICE) /bin/sh"

# Declare phony targets
.PHONY: up down rebuild logs test docker-compose-command validate-env bash-service traefik-build

# Targets
up:
	$(MAKE) validate-env
	@echo "🚀 Starting $(ENVIRONMENT) environment..."
	$(MAKE) docker-compose-command CMD="up -d"

down:
	$(MAKE) validate-env
	@echo "🛑 Stopping $(ENVIRONMENT) environment..."
	$(MAKE) docker-compose-command CMD="down"

rebuild: down
	make validate-env
	@echo "🔄 Rebuilding $(ENVIRONMENT) environment..."
	$(MAKE) docker-compose-command CMD="build --no-cache"
	make up

logs:
	$(MAKE) validate-env
	@echo "📜 Fetching logs for $(ENVIRONMENT) environment service: $(SERVICE)..."
	$(MAKE) docker-compose-command CMD="logs -f --tail 50 $(SERVICE)"

# Run commands dynamically and sequentially
many:
	@for cmd in $(CMD); do \
		echo "Running $$cmd..."; \
		$(MAKE) $$cmd; \
	done