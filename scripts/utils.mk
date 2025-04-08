set-env:
	@$(eval ENVIRONMENT := $(ENVIRONMENT))
	@export ENVIRONMENT=$(ENVIRONMENT)      # Optional: Also exports to shell

	@echo "Environment set to: $(ENVIRONMENT)"
	@echo $(ENVIRONMENT)
# Specific environment targets
test:
	@make ENVIRONMENT=test

prod:
	@make set-env ENVIRONMENT=prod

dev:
	@make set-env ENVIRONMENT=dev

log:
	@echo $(ENVIRONMENT)	


# Validate the provided environment
validate-env:
	@if [ -z "$(ENVIRONMENT)" ]; then \
		echo "❌ Error: You must specify an environment (e.g., make up ENVIRONMENT=dev)"; \
		exit 1; \
	elif ! echo "$(SUPPORTED_ENVIRONMENTS)" | grep -wq "$(ENVIRONMENT)"; then \
		echo "❌ Error: Undefined environment '$(ENVIRONMENT)'. Supported environments are: $(SUPPORTED_ENVIRONMENTS)"; \
		exit 1; \
	fi
	@echo "🌍 Using environment: $(ENVIRONMENT)"
	@echo "📄 COMPOSE_FILE: $(COMPOSE_FILE)"
	@echo "🏗️ COMPOSE_PROJECT_NAME: $(COMPOSE_PROJECT_NAME)"
	@echo "🐳 DOCKERFILE: $(DOCKERFILE)"
	@echo "📂 ENVIRONMENT FILES: $(ENV_FILES)"