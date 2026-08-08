# Get the GitHub reference from the first argument
GITHUB_REF=$1


# Determine environment and paths
if [[ "$GITHUB_REF" == "refs/heads/main" ]]; then
    ENVIRONMENT="prod"
    REMOTE_PATH="prod"
elif [[ "$GITHUB_REF" == "refs/heads/dev" ]]; then
    ENVIRONMENT="dev"
    REMOTE_PATH="dev"
elif [[ "$GITHUB_REF" == "refs/heads/test" ]]; then
    ENVIRONMENT="test"
    REMOTE_PATH="test"
else
    echo "❌ Branch not mapped to an environment. Exiting."
    exit 1
fi

echo "🔀 Branch Reference: $GITHUB_REF"
echo "🌍 Environment: $ENVIRONMENT"
echo "📂 Remote Path: $REMOTE_PATH"

# SSH into the server and perform tasks
ssh -v -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST << EOF
    set -e

    read_env_value() {
        local key="\$1"
        shift

        grep -hE "^\\s*\${key}=" "\$@" 2>/dev/null | tail -n 1 | cut -d= -f2- | sed 's/^ *//; s/ *$//; s/^"//; s/"$//; s/^'\''//; s/'\''$//'
    }
    
    # Define the execute_action function inside the SSH session
    execute_action() {
        local tag=\$1
        local action=\$2
        local command=\$3

        if git log -n 1 | grep "\$tag"; then
            echo "✅ Detected '\$tag' in recent commit messages. \$action..."
            eval \$command
        else
            echo "🚫 No '\$tag' detected in recent commit messages. Skipping \$action."
        fi
    }

    prepare_runtime_dirs() {
        echo "🛠️  Preparing bind-mounted runtime directories..."
        local app_uid=\$(read_env_value APP_UID .env .env.$ENVIRONMENT)
        local app_gid=\$(read_env_value APP_GID .env .env.$ENVIRONMENT)
        app_uid=\${app_uid:-1000}
        app_gid=\${app_gid:-1000}

        docker run --rm -v "\$PWD:/app" alpine sh -c "mkdir -p /app/logs /app/uploads /app/dist && chown -R \$app_uid:\$app_gid /app/logs /app/uploads /app/dist"
    }

    # Change to the correct directory
    cd $REMOTE_PATH

    # Pull the latest changes
    echo "🔄 Pulling the latest changes..."
    git pull

    prepare_runtime_dirs

    # Execute actions based on tags
    execute_action "-r" "Rebuilding services" "make rebuild ENVIRONMENT=$ENVIRONMENT"
    execute_action "-m" "Running migrations" "make run ENVIRONMENT=$ENVIRONMENT"
    execute_action "-core" "Rebuilding Traefik" "make traefik-rebuild"
EOF
