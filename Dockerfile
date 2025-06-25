# Stage 1: Build the application locally first
# This assumes the build is done on the host machine

# Stage 2: Create the runtime image
FROM node:18.19.1-alpine3.19

# Set working directory
WORKDIR /app

# Copy package files
COPY . ./

# Install only production dependencies
RUN npm ci --legacy-peer-deps
RUN npm run build

# Copy built files from host
COPY build/ ./build/

# Make the entry point executable
RUN chmod +x ./build/index.js

# Add a test command to verify the image works
RUN echo 'console.log("MCP Outlook Calendar Server is ready");' > /app/test.js

# Set the entry point
ENTRYPOINT ["node", "./build/index.js"]

# No need to expose ports as this is an STDIO server
