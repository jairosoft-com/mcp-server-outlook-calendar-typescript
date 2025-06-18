# MCP Server with Weather and Calendar Integration

A Model Context Protocol (MCP) server implementation with weather data and Microsoft Calendar integration, built with TypeScript and Node.js. This server provides weather alerts, forecasts, and calendar event management through the MCP protocol.

## Features

- **Weather Operations**
  - Get weather alerts by US state code
  - Get weather forecasts by coordinates

- **Calendar Integration**
  - Fetch calendar events from Microsoft 365/Outlook
  - Filter events by date range
  - Timezone support for event times

- **Developer Experience**
  - TypeScript support with type safety
  - Environment-based configuration
  - Comprehensive error handling
  - Easy setup and configuration

## Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- TypeScript 4.9.x or later

## Microsoft Calendar Integration

This server includes integration with Microsoft 365/Outlook Calendar using Microsoft Graph API. Follow these steps to set it up:

### Prerequisites

1. **Azure AD App Registration**
   - Go to the [Azure Portal](https://portal.azure.com/)
   - Navigate to Azure Active Directory > App registrations > New registration
   - Register a new application with a name (e.g., "MCP Calendar Integration")
   - Note down the Application (client) ID and Directory (tenant) ID

2. **Configure API Permissions**
   - Under your app registration, go to API permissions
   - Add the following Microsoft Graph API permissions:
     - `Calendars.Read`
     - `Calendars.Read.Shared`
     - `User.Read`
   - Grant admin consent for these permissions

3. **Create a Client Secret**
   - In your app registration, go to Certificates & secrets
   - Create a new client secret
   - Note down the secret value (it will only be shown once)

### Configuration

Update your `.env` file with the Azure AD credentials:

```env
# Microsoft Graph API
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mcp-server-outlook-calendar-typescript
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Configuration

Create a `.env` file in the root directory with the following environment variables:

```env
# Weather Service
DEBUG=false
USER_AGENT=weather-app/1.0

# Microsoft Graph API (Calendar)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Optional: Set timezone for calendar events (default: UTC)
TZ=UTC
```

### Using the Calendar Tool

Once the server is running, you can use the following MCP tool to interact with Microsoft Calendar:

### Get Calendar Events

**Tool Name:** `get-calendar-events`

**Description:** Fetch calendar events for a user within a specified date range.

**Parameters:**
- `user_id` (string): Microsoft Graph user ID or 'me' for current user
- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format
- `timezone` (string, optional): IANA timezone (e.g., 'America/New_York'). Default: 'UTC'

**Example Request:**
```json
{
  "user_id": "me",
  "start_date": "2025-06-18",
  "end_date": "2025-06-19",
  "timezone": "Asia/Manila"
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Found 3 events between 2025-06-18 and 2025-06-19"
    },
    {
      "type": "resource",
      "resource": {
        "text": "Calendar Events",
        "uri": "data:application/json,...",
        "mimeType": "application/json"
      }
    }
  ]
}
```

## Running the Server

### Development Mode
Start the server with auto-reload:
```bash
npm run dev
```

### Production Mode
1. Build the project:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

### Running with MCP Inspector

This MCP server uses stdio (standard input/output) for communication. To test it with the MCP inspector, follow these steps:

1. First, ensure your project is built:
   ```bash
   npm run build
   ```

2. Install the MCP inspector globally if you haven't already:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

3. Start the MCP inspector:
   ```bash
   mcp-inspector
   ```

4. In the MCP inspector UI that opens in your browser:
   - **Command**: `node`
   - **Arguments**: `build/index.js`
   - **Working Directory**: Project root directory
   - Click "Start" to launch the server

5. Once connected, you'll be able to:
   - List available resources
   - Inspect resource details
   - Send MCP protocol messages
   - Debug the communication

> **Note**: Make sure no other instance of the server is running when you try to connect.

## Available Tools

This MCP server provides the following tools:

### get-alerts
Get weather alerts for a US state.
- **Parameters**:
  - `state`: Two-letter US state code (e.g., "CA" for California)

### get-forecast
Get weather forecast for specific coordinates.
- **Parameters**:
  - `latitude`: Number between -90 and 90
  - `longitude`: Number between -180 and 180

## Debugging Tips

If you encounter issues:
1. Ensure the project is built: `npm run build`
2. Check for error messages in the inspector console
3. Set `DEBUG=true` in your `.env` file for more detailed logs
4. The server is working correctly if it doesn't output anything - it's waiting for MCP protocol messages on stdio

## MCP Protocol Endpoints

This server implements the standard MCP protocol:
- `POST /mcp/` - Main MCP endpoint
- `GET /mcp/resources` - List available resources
- `GET /mcp/resource/{uri}` - Get a specific resource

Available resources:
- `get-alerts` - Get weather alerts for a US state
- `get-forecast` - Get weather forecast for coordinates

## Development

### Building the Project

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

For support, please open an issue in the GitHub repository.
