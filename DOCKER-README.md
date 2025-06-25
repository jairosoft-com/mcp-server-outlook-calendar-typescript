# MCP Outlook Calendar Server - Docker Setup

This document provides instructions for building and running the MCP Outlook Calendar Server in a Docker container.

## Prerequisites

- Docker installed on your system
- Azure AD App credentials (Client ID, Client Secret, Tenant ID)
- User ID (user id for azure ad app) for calendar access

## Building the Docker Image

1. Navigate to the project directory containing the Dockerfile
2. Build the Docker image:
   ```bash
   docker build -t mcp-outlook-calendar .
   ```

## Running the Container

### Basic Usage

```bash
docker run -it --rm \
  -e AZURE_TENANT_ID="your-tenant-id" \
  -e AZURE_CLIENT_ID="your-client-id" \
  -e AZURE_CLIENT_SECRET="your-client-secret" \
  -e USER_ID="your-user-id" \
  mcp-outlook-calendar
```

### Using Environment File

1. Create a `.env` file in the project root with your credentials:
   ```
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret
   USER_ID=your-user-id
   ```

2. Run the container with the environment file:
   ```bash
   docker run -it --rm --env-file .env mcp-outlook-calendar
   ```

## Integration with Claude Desktop

Update your `claude_desktop_config.json` to use the Docker container:

```json
{
  "mcpServers": {
    "MS_CALENDAR": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "AZURE_TENANT_ID=your-tenant-id",
        "-e", "AZURE_CLIENT_ID=your-client-id",
        "-e", "AZURE_CLIENT_SECRET=your-client-secret",
        "-e", "USER_ID=your-user-id",
        "mcp-outlook-calendar"
      ]
    }
  }
}
```

## Troubleshooting

- If you see permission errors, try running Docker with `--user` flag:
  ```bash
  docker run -it --rm --user $(id -u):$(id -g) ...
  ```

- To debug container issues, you can start an interactive shell:
  ```bash
  docker run -it --entrypoint /bin/sh mcp-outlook-calendar
  ```

## Security Notes

- Never commit your `.env` file to version control
- Use Docker secrets or a secrets manager for production environments
- Ensure your Azure AD app has the minimum required permissions


## Docker Commands:
docker build -t mcp-outlook-calendar .
docker images mcp-outlook-calendar

Running docker image paste it as one line:
docker run -it --rm -e AZURE_TENANT_ID="your-tenant-id" -e AZURE_CLIENT_ID="your-client-id" -e AZURE_CLIENT_SECRET="your-client-secret" -e USER_ID="your-user-id" mcp-outlook-calendar

## Running Docker Container in MCP-inspector
Command:
docker

Arguments:
run -i --rm -e AZURE_TENANT_ID="your-tenant-id" -e AZURE_CLIENT_ID="your-client-id" -e
AZURE_CLIENT_SECRET="your-client-secret" -e USER_ID="your-user-id" mcp-outlook-calendar


## for clients, Pull the docker image from Azure Container Registry:
docker pull jairo.azurecr.io/mcpserver:latest