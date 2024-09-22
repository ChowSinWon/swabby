FROM denoland/deno:1.46.3 AS builder

# Set the working directory in the container
WORKDIR /app

# Copy the deno.json file and all dependencies first, to cache them
COPY ../deno.json ./
COPY ../deno.lock ./
COPY ../.env ./
COPY ../configs.ts ./
COPY ../mod.ts ./
COPY ../deps.ts ./
COPY ../fileloader.ts ./
COPY ../src ./src

# Cache the dependencies by running the `deno task cache` command
RUN deno task cache

# Use a smaller final image
FROM denoland/deno:1.46.3

# Set the working directory in the container
WORKDIR /app

# Copy the cached build from the builder stage
COPY --from=builder /deno-dir /deno-dir
COPY --from=builder /app /app


# Command to run the application
CMD ["deno", "task", "swabby"]
