#!/bin/bash
# Helper script to run TypeORM migrations via Makefile

COMMAND=$1      # TypeORM command: generate, run, revert
NAME=$2         # Migration name (optional for some commands)
ENVIRONMENT=$3  # Environment: dev, prod, test

if [[ -z "$COMMAND" ]]; then
  echo "Usage: ./scripts/migrate.sh <command> [name] [environment]"
  echo "Example: ./scripts/migrate.sh generate AddUserTable dev"
  exit 1
fi

# Default environment to 'dev' if not provided
ENVIRONMENT=${ENVIRONMENT:-dev}

# Invoke Makefile with appropriate parameters
if [[ "$COMMAND" == "generate" || "$COMMAND" == "revert" ]]; then
  make "$COMMAND" name="$NAME" ENVIRONMENT="$ENVIRONMENT"
else
  make "$COMMAND" ENVIRONMENT="$ENVIRONMENT"
fi
