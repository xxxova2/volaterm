FROM node:22-slim

# Install Python 3 and pip for yfinance data fetching
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yfinance Python package
RUN pip3 install yfinance --break-system-packages

# Create app directory
WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install npm dependencies (ci for reproducible builds)
RUN npm ci

# Set production environment
ENV NODE_ENV=production

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

# Expose the port Render will set via PORT env var
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
