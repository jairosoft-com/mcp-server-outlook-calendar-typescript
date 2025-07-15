import http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { registerTools } from '../tools/index.js';

// Define the Transport interface since it's not exported from the SDK
interface Transport {
  onMessage(handler: (message: any) => Promise<void>): void;
  onClose(handler: () => void): void;
  send(message: any): Promise<void>;
  close(): void;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

/**
 * Custom transport implementation for MCP server over HTTP/SSE
 */
class SseTransport implements Transport {
  private messageHandler?: (message: any) => Promise<void>;
  private closeHandler?: () => void;
  private isStarted: boolean = false;

  async start(): Promise<void> {
    this.isStarted = true;
    console.log('SSE Transport started');
  }

  async stop(): Promise<void> {
    this.isStarted = false;
    if (this.closeHandler) {
      this.closeHandler();
    }
    console.log('SSE Transport stopped');
  }

  onMessage(handler: (message: any) => Promise<void>): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  async send(message: any): Promise<void> {
    if (!this.isStarted) {
      throw new Error('Transport not started');
    }
    console.log('Sending message to MCP server:', message);
  }

  async close(): Promise<void> {
    if (this.closeHandler) {
      this.closeHandler();
    }
    this.isStarted = false;
    return Promise.resolve();
  }
}

export class SseServer {
  private server: http.Server;
  private clients: Map<string, ServerResponse> = new Map();
  private mcpServer: McpServer;
  public transport: SseTransport;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.transport = new SseTransport();

    // Create MCP server with the transport
    this.mcpServer = new McpServer({
      name: 'outlook-calendar',
      version: '1.0.0',
    });

    // Register tools with the MCP server
    registerTools(this.mcpServer);

    // Create HTTP server
    this.server = http.createServer(this.handleRequest.bind(this));

    // Handle incoming MCP server messages
    this.transport.onMessage(this.handleMcpMessage.bind(this));
  }

  /**
   * Handle incoming messages from the MCP server
   * @param message The message from the MCP server
   */
  private async handleMcpMessage(message: any): Promise<void> {
    try {
      // Log the message for debugging
      console.log('Received message from MCP server:', message);
      
      // Broadcast to all connected clients
      if (this.clients.size > 0) {
        const eventData = JSON.stringify({
          type: 'mcp-message',
          data: message,
          timestamp: new Date().toISOString()
        });
        this.broadcast(eventData, 'message');
      }
    } catch (error) {
      console.error('Error handling MCP message:', error);
    }
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse) {
    const { pathname } = parse(req.url || '/', true);

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
    if (pathname === '/events' && req.method === 'GET') {
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
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
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

  private async handleCreateCalendarEvent(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const eventData = JSON.parse(body);
        const { accessToken, ...eventDetails } = eventData;

        if (!accessToken) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access token is required' }));
          return;
        }

        // Import the calendar service functions directly
        const { createCalendarEvent } = await import('../services/calendarEventsService.js');
        
        // Create the event
        const createdEvent = await createCalendarEvent(accessToken, eventDetails);
        
        // Send the response
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: createdEvent
        }));
      } catch (error) {
        console.error('Error creating calendar event:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Failed to create calendar event',
          details: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });
  }

  private async handleCalendarEvents(req: IncomingMessage, res: ServerResponse) {
    const { query } = parse(req.url || '', true);
    const accessToken = query.accessToken as string;
    const timezone = (query.timezone as string) || 'Asia/Manila';
    
    // Set default date range: today to 7 days from now
    const defaultStartDate = new Date();
    defaultStartDate.setHours(0, 0, 0, 0);
    
    const defaultEndDate = new Date(defaultStartDate);
    defaultEndDate.setDate(defaultStartDate.getDate() + 7);
    defaultEndDate.setHours(23, 59, 59, 999);

    // Parse dates from query or use defaults
    const startDate = query.start_date 
      ? new Date(query.start_date as string)
      : defaultStartDate;
      
    const endDate = query.end_date
      ? new Date(query.end_date as string)
      : defaultEndDate;
    
    if (!accessToken) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access token is required' }));
      return;
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Invalid date format. Please use YYYY-MM-DD format' 
      }));
      return;
    }

    try {
      // Import the calendar service functions directly
      const { fetchCalendarEvents, formatCalendarEvents } = await import('../services/calendarEventsService.js');
      
      // Fetch events directly using the service
      const events = await fetchCalendarEvents(
        accessToken, 
        startDate, 
        endDate
      );
      
      // Format the events
      const response = {
        data: formatCalendarEvents(events),
        startDate,
        endDate,
        timezone
      };

      // Send the response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      console.error('Error handling calendar events:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Failed to fetch calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
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
        console.log(`SSE Server running on http://localhost:${this.port}`);
        console.log(`SSE endpoint: http://localhost:${this.port}/events`);
        console.log(`Calendar API endpoint: http://localhost:${this.port}/api/calendar/events`);
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
