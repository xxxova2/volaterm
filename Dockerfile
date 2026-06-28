FROM node:22-slim

# Install Python 3, pip, and build tools for yfinance data fetching
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install yfinance Python package
RUN pip3 install yfinance --break-system-packages 2>&1

# Verify yfinance works
RUN python3 -c "import yfinance; print('yfinance OK:', yfinance.__version__)"

# Create app directory
WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install dependencies (using ci for reproducible builds when lockfile present)
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend (devDependencies still available)
RUN npm run build

# Production mode for runtime
ENV NODE_ENV=production

# Expose the port Render will set via PORT env var
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
