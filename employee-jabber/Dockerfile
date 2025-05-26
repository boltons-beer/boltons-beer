FROM denoland/deno:latest

# Create working directory
WORKDIR /app

# Copy source
COPY src src/
COPY deno.json .
COPY deno.lock .

# Compile the main app
RUN deno cache src/main.ts

# Run the app
CMD ["deno", "serve", "--allow-net", "--allow-env", "src/main.ts"]