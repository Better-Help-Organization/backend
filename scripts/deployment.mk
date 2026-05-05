# Proxy management
proxy-up:
	@echo "🚀 Starting proxy reverse proxy..."
	@docker compose -f compose.core.yml up -d

proxy-down:
	@echo "🛑 Stopping proxy reverse proxy..."
	@docker compose -f compose.core.yml down

proxy-logs:
	@echo "📜 Fetching proxy logs..."
	@docker logs -f --tail 100 traefik

proxy-build:
	@echo "🔨 Building proxy..."
	@docker compose -f compose.core.yml build --no-cache
	
proxy-rebuild: proxy-down
	@echo "🔄 Rebuilding proxy..."
	make proxy-build
	make proxy-up

# Centralized docker-compose command setup
docker-compose-command:
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) DOCKERFILE=$(DOCKERFILE) \
	docker compose -f $(COMPOSE_FILE) $(foreach file,$(ENV_FILES),--env-file $(file)) $(CMD)

bash-service:
	@$(MAKE) docker-compose-command CMD="exec $(SERVICE) /bin/sh"

db-dump:
	@echo "📦 Dumping MySQL database..."
	$(MAKE) docker-compose-command CMD="exec -T db sh -c 'mysqldump -u root -p123456789 nc' > dump.sql"
# 	@docker compose exec -T db \
# 	sh -c 'mysqldump -u root -p123456789 nc' \
# 	> dump.sql
# 	@echo "✅ Dump saved to dump.sql"

# Declare phony targets
.PHONY: up down rebuild logs test docker-compose-command validate-env bash-service proxy-build seed

# Targets
up:
	$(MAKE) validate-env
	@echo "🚀 Starting $(ENVIRONMENT) environment..."
	$(MAKE) docker-compose-command CMD="up -d"

down:
	$(MAKE) validate-env
	@echo "🛑 Stopping $(ENVIRONMENT) environment..."
	$(MAKE) docker-compose-command CMD="down"

stop:
	$(MAKE) validate-env
	@echo "🛑 Stopping $(SERVICE) environment..."
	$(MAKE) docker-compose-command CMD="stop $(SERVICE)" 

start:
	$(MAKE) validate-env
	@echo "🛑 Starting $(SERVICE) environment..."
	$(MAKE) docker-compose-command CMD="start $(SERVICE)" 

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

seed:
	@$(MAKE) docker-compose-command CMD="exec $(SERVICE) npx ts-node -r tsconfig-paths/register scripts/seed-client.ts $(ARGS)"

reset:
	@$(MAKE) down up logs