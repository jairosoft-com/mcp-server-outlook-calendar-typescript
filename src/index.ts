import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SseServer } from "./server/sseServer.js";
import dotenv from 'dotenv';
import { registerTools } from "./tools/index.js";

dotenv.config();

// Get port from environment variable or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Create server instance
const server = new McpServer({
  name: "outlook-calendar",
  version: "1.0.0",
});

// Register all tools
registerTools(server);

// Create SSE server
const sseServer = new SseServer(PORT);

// Connect MCP server to the SSE transport
server.connect(sseServer.transport);

// Handle graceful shutdown
async function shutdown() {
  console.log('Shutting down server...');
  try {
    await sseServer.stop();
    console.log('Server stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT. Starting graceful shutdown...');
  shutdown().catch(console.error);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Starting graceful shutdown...');
  shutdown().catch(console.error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown().catch(console.error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown().catch(console.error);
});

// Start the server
async function main() {
  try {
    // Start the SSE server
    await sseServer.start();
    await server.connect(sseServer.transport);
    console.log(`Calendar MCP Server running on port ${PORT}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    await shutdown();
  }
}

// Start the application
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});