# MCP Server Docker Setup

This document explains how to build and run the MCP server in a Docker container.

## Prerequisites

- Docker installed on your system
- Node.js and npm (for local development without Docker)

## Building the Docker Image

```bash
docker build -t mcp-outlook-calendar .
```

## Running the Container

### Basic Usage

```bash
docker run -d -p 8787:8787 --name mcp-outlook-calendar mcp-outlook-calendar
```

### Authentication

To obtain an authentication token:

1. Visit: https://delegated-login-ui.thankfulground-ca4b1ba2.westus2.azurecontainerapps.io/
2. Log in with your Microsoft account
3. Copy the displayed authentication token (valid for 1 hour)
4. Use the token when making requests to the API

### Running with Authentication

When making requests to the API, include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" http://localhost:8787/your-endpoint
```

## Accessing the Server

- MCP Endpoint: `http://localhost:8787/mcp`
- Server-Sent Events: `http://localhost:8787/sse`

## Development

For local development without Docker:

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Set environment variables:
   ```bash
   export AUTH_TOKEN=your_auth_token
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Notes

- The server runs in development mode by default when using `npm run dev`
- In production, ensure proper logging and monitoring are set up
- The container exposes port 8787 by default
