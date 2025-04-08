#!/bin/bash
# Wait for Elasticsearch to start
echo "⏳ Waiting for Elasticsearch to start..."
until curl -s http://localhost:9200; do
  echo "🔄 Waiting for Elasticsearch to be healthy..."
  sleep 5
done

# Run the create enrollment token command
echo "🔑 Creating Kibana enrollment token..."
/bin/elasticsearch-create-enrollment-token --scope kibana

# Continue the original entrypoint (start Elasticsearch)
echo "🚀 Starting Elasticsearch..."
/usr/local/bin/docker-entrypoint.sh "$@"