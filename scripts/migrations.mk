ACTION_LIST = migration:generate migration:rollback

# 🛠️ Define a function to check if the action is migration:generate
define check-if-action-in-list
	$(if $(filter $(1),$(ACTION_LIST)), ./src/db/migrations/$(name)$(MIGRATIONTAG),)
endef

# 🛠️ Centralized migration command setup
define generate-command
	npx typeorm $(ACTION) $(call check-if-action-in-list,$(ACTION)) -d dist/src/db/ormconfig.js $(FLAGS)
endef

# 🛠️ Centralized migration command setup
migration-command:
	@echo "COMMAND: $(generate-command)"
	@echo "🏗️ Applying chmod: $(RUN_CHMOD)"
	# Run migration command
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) DOCKERFILE=$(DOCKERFILE) \
	docker compose -f $(COMPOSE_FILE) exec $(SERVICE) sh -c "$(generate-command)" \
	$(if $(filter $(ACTION),$(ACTION_LIST)), \
		$(if $(RUN_CHMOD),&& chmod -R 777 src/db/migrations,),)

# 🔍 Check for schema drift
check:
	$(MAKE) validate-env
	@echo "🔍 Checking for schema drift in $(ENVIRONMENT)..."
	$(MAKE) migration-command ACTION=migration:generate FLAGS=--dryrun RUN_CHMOD=false || true

# 🛠️ Generate migrations
generate:
	@echo "🛠️ Generating migration: $(name) for $(ENVIRONMENT)..."
	$(MAKE) migration-command ACTION=migration:generate RUN_CHMOD=true

# 🚀 Run migrations
run:
	$(MAKE) validate-env
	@echo "🚀 Running migrations in $(ENVIRONMENT)..."
	$(MAKE) migration-command ACTION=migration:run RUN_CHMOD=true

# 🔄 Revert migrations
revert:
	$(MAKE) validate-env
	@echo "🔄 Reverting migrations in $(ENVIRONMENT)..."
	$(MAKE) migration-command ACTION=migration:revert RUN_CHMOD=false

# 📌 Phony targets
.PHONY: check generate run revert validate-env migration-command
