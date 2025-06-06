FROM denoland/deno:latest

# Create working directory
WORKDIR /app

# Copy source
COPY src src/
COPY deno.json .

# Compile the main app
RUN deno cache src/main.ts

# Run the app
CMD ["deno", "run", "--allow-net", "--allow-env", "--unstable-kv", "src/main.ts"]