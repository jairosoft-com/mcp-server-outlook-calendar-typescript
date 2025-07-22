import http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { McpHandler } from './mcpHandler.js';

export class SseServer {
  private server: http.Server;
  private clients: Map<string, ServerResponse> = new Map();
  private port: number;

  private mcpHandler: McpHandler;

  constructor(port: number = 3000) {
    this.port = port;
    
    // Create HTTP server
    this.server = http.createServer(this.handleRequest.bind(this));
    
    // Initialize MCP handler
    this.mcpHandler = new McpHandler(this);
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse) {
    const parsedUrl = parse(req.url || '/', true);
    const pathname = parsedUrl.pathname;
    
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log('Pathname:', pathname);
    console.log('Query params:', parsedUrl.query);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route requests
    if (pathname === '/health' && req.method === 'GET') {
      // Health check endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'mcp-outlook-calendar',
        version: '1.0.0'
      }));
    } else if (pathname === '/' && req.method === 'POST') {
      // Handle MCP protocol requests
      this.mcpHandler.handleRequest(req, res).catch(error => {
        console.error('Error handling MCP request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: null
        }));
      });
    } else if (pathname === '/events' && req.method === 'GET') {
      this.handleSSEConnection(req, res);
    } else if (pathname === '/api/calendar/events') {
      if (req.method === 'GET') {
        this.handleCalendarEvents(req, res);
      } else if (req.method === 'POST') {
        this.handleCreateCalendarEvent(req, res);
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    } else {
      console.log('No matching route found for:', { 
        method: req.method, 
        pathname, 
        url: req.url,
        headers: req.headers 
      });
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Endpoint not found',
        method: req.method,
        path: pathname,
        availableEndpoints: [
          { method: 'POST', path: '/', description: 'MCP protocol endpoint' },
          { method: 'GET', path: '/events', description: 'SSE events' },
          { method: ['GET', 'POST'], path: '/api/calendar/events', description: 'Calendar events API' }
        ]
      }));
    }
  }

  private handleSSEConnection(req: IncomingMessage, res: ServerResponse) {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Generate a unique ID for this client
    const clientId = Date.now().toString();
    
    // Add client to the map
    this.clients.set(clientId, res);

    // Send initial connection message
    this.sendEvent(res, 'connected', { 
      clientId,
      message: 'Connected to SSE server',
      timestamp: new Date().toISOString()
    });

    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });
  }

  private async handleCreateCalendarEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { handleCreateCalendarEvent } = await import('../services/calendarEventHandlers.js');
    return handleCreateCalendarEvent(req, res);
  }

  private async handleCalendarEvents(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { handleCalendarEvents } = await import('../services/calendarEventHandlers.js');
    return handleCalendarEvents(req, res);
  }

  // Helper to send SSE events
  public sendEvent(res: ServerResponse, event: string, data: any) {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(message);
      // Ensure the message is sent immediately
      if ((res as any).flush) {
        (res as any).flush();
      }
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  }

  // Broadcast event to all connected clients
  public broadcast(event: string, data: any) {
    const message = {
      event,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all connected clients
    for (const [clientId, client] of this.clients.entries()) {
      try {
        this.sendEvent(client, event, message.data);
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  public async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.on('error', (error) => {
        console.error('Server error:', error);
        reject(error);
      });

      this.server.listen(this.port, () => {
        const baseUrl = process.env.BASE_URL || `http://localhost:${this.port}`;
        console.log(`SSE Server running on ${baseUrl}`);
        console.log(`SSE endpoint: ${baseUrl}/events`);
        console.log(`Calendar API endpoint: ${baseUrl}/api/calendar/events`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close all client connections
      for (const [clientId, client] of this.clients.entries()) {
        try {
          client.end();
        } catch (error) {
          console.error(`Error closing client ${clientId}:`, error);
        }
      }
      this.clients.clear();

      // Close the server
      this.server.close((error) => {
        if (error) {
          console.error('Error stopping server:', error);
          reject(error);
        } else {
          console.log('SSE Server stopped');
          resolve();
        }
      });
    });
  }
}
