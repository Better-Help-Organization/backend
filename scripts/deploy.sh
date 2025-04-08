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

    # Change to the correct directory
    cd $REMOTE_PATH

    # Pull the latest changes
    echo "🔄 Pulling the latest changes..."
    git pull

    # Execute actions based on tags
    execute_action "-r" "Rebuilding services" "make rebuild ENVIRONMENT=$ENVIRONMENT"
    execute_action "-m" "Running migrations" "make run ENVIRONMENT=$ENVIRONMENT"
    execute_action "-core" "Rebuilding Traefik" "make traefik-rebuild"
EOF
