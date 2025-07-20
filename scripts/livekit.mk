livekit-up:
	docker run -d \
	-p 7880:7880 \
	-p 7881:7881 \
	-p 7882:7882/udp \
	-e LIVEKIT_KEYS="devkey:secret" \
	livekit/livekit-server \
	--dev

# livekit-down:
# 	docker rm -f $$(docker ps -q --filter ancestor=livekit/livekit-server)

livekit-down:
	@if [ -n "$$(docker ps -q --filter ancestor=livekit/livekit-server)" ]; then \
		docker rm -f $$(docker ps -q --filter ancestor=livekit/livekit-server); \
	else \
		echo "No running LiveKit containers to stop."; \
	fi
