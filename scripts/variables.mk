# Default configurations
# Add these new migration commands to your Makefile
MIGRATIONTAG=-migration
ENVIRONMENT ?= dev
SERVICE ?= app

DOCKERFILE_DEV = Dockerfile.dev
DOCKERFILE_PROD = Dockerfile.prod

# Environment files
ENV_PROD = .env
ENV_TEST = .env.test
ENV_DEV = .env.dev

PROJECT_NAME = app
# Project names
PROD_PROJECT_NAME = $(PROJECT_NAME)_prod
DEV_PROJECT_NAME = $(PROJECT_NAME)_dev
TEST_PROJECT_NAME = $(PROJECT_NAME)_test

# Supported environments
SUPPORTED_ENVIRONMENTS = dev prod test

# Environment-specific variables
COMPOSE_FILE = compose.$(ENVIRONMENT).yml
ENV_FILES = $(ENV_PROD) $(ENV_$(shell echo $(ENVIRONMENT) | tr '[:lower:]' '[:upper:]'))

# Compose project and Dockerfile based on environment
COMPOSE_PROJECT_NAME = $($(shell echo $(ENVIRONMENT) | tr '[:lower:]' '[:upper:]')_PROJECT_NAME)


# Environment-specific variables
ifeq ($(ENVIRONMENT), prod)
    DOCKERFILE = $(DOCKERFILE_PROD)
else
    DOCKERFILE = $(DOCKERFILE_DEV)
endif