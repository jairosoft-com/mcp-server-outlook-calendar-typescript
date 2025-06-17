# MCP Weather Server

A Model Context Protocol (MCP) server implementation for weather data, built with TypeScript and Node.js. This server provides weather alerts and forecasts through the MCP protocol.

## Features

- MCP protocol implementation for weather operations
- Get weather alerts by US state code
- Get weather forecasts by coordinates
- TypeScript support with type safety
- Easy setup and configuration

## Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- TypeScript 4.9.x or later

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
# Optional: Set to true to enable debug logging
DEBUG=false
# User agent for NWS API requests
USER_AGENT=weather-app/1.0
```

### Running the Server

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
