import { SseServer } from "./server/sseServer.js";
import dotenv from 'dotenv';

dotenv.config();

// Get port from environment variable or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Create and start the SSE server
const sseServer = new SseServer(PORT);

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
  shutdown().catch(() => process.exit(1));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown().catch(console.error);
});

// Start the server
sseServer.start()
  .then(() => {
    console.log(`Server started on port ${PORT}`);
  })
  .catch((error) => {
    console.error("Fatal error starting server:", error);
    process.exit(1);
  });