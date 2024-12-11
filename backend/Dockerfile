# Use Bun.js image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json bun.lockb ./
RUN bun install

# Copy the rest of the application
COPY . .

# Expose the application port
EXPOSE 3000
EXPOSE 3002

# Run the Bun.js server
CMD ["bun", "run", "index.js"]
