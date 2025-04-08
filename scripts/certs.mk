# Certificate extractor 
CONTAINER_NAME = proxy
ACME_PATH = /letsencrypt/acme.json
OUTPUT_DIR = ./certs

# Create the output directory
prepare:
	@echo "📁 Creating output directory..."
	mkdir -p $(OUTPUT_DIR)

# Extract the acme.json file and process certificates
extract: prepare
	@echo "📦 Copying acme.json from container..."
	docker cp $(CONTAINER_NAME):$(ACME_PATH) $(OUTPUT_DIR)/acme.json
	@echo "🔍 Extracting certificates and keys..."
	jq -r '.myresolver.Certificates[] | .certificate' $(OUTPUT_DIR)/acme.json > $(OUTPUT_DIR)/cert.pem
	jq -r '.myresolver.Certificates[] | .key' $(OUTPUT_DIR)/acme.json > $(OUTPUT_DIR)/key.pem	
	@echo "✅ Certificates extracted to $(OUTPUT_DIR)/cert.pem and $(OUTPUT_DIR)/key.pem"

# Clean up extracted files
clean:
	@echo "🧹 Cleaning up..."
	rm -rf $(OUTPUT_DIR)
	@echo "✅ Cleaned up $(OUTPUT_DIR)"

.PHONY: clean extract prepare
