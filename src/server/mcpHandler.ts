import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { fetchCalendarEvents, formatCalendarEvents, createCalendarEvent } from '../services/calendarEventsService.js';
import { URLSearchParams } from 'url';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export class McpHandler {
  private sseServer: any; // Reference to SSE server for broadcasting

  constructor(sseServer: any) {
    this.sseServer = sseServer;
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Parse the request body
    const body = await this.parseRequestBody(req);
    
    // Parse JSON-RPC request
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(body);
      // Ensure request.id is properly typed
      if (request.id === undefined) {
        request.id = null;
      }
    } catch (error) {
      return this.sendErrorResponse(res, -32700, 'Parse error');
    }

    // Validate JSON-RPC request
    if (request.jsonrpc !== '2.0' || !request.method) {
      return this.sendErrorResponse(res, -32600, 'Invalid Request');
    }

    // Handle the MCP method
    try {
      const response = await this.handleMethod(request.method, request.params, request.id);
      this.sendResponse(res, response);
    } catch (error: any) {
      console.error('Error handling MCP request:', error);
      this.sendErrorResponse(
        res,
        error.code || -32603,
        error.message || 'Internal error',
        request.id
      );
    }
  }

  private async handleMethod(method: string, params: any, requestId: string | number | null, req?: IncomingMessage): Promise<any> {
    // Handle notifications/initialized - no response needed for notifications
    if (method === 'notifications/initialized') {
      console.log('Received initialized notification');
      return; // No response for notifications
    }
    // Extract access token from either headers or params
    let accessToken: string | undefined;
    
    // First try to get token from Authorization header
    const authHeader = req?.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } 
    // Then try to get from params if not in headers
    else if (params?.access_token) {
      accessToken = params.access_token;
      // Remove token from params to avoid passing it to the actual handler
      delete params.access_token;
    }

    // For methods that require authentication
    const authenticatedMethods = ['list_events', 'create_event', 'update_event', 'delete_event', 'list_calendars'];
    if (authenticatedMethods.includes(method) && !accessToken) {
      throw {
        code: -32600,
        message: 'Unauthorized',
        data: {
          error: 'Missing access token',
          details: 'Include access_token in the request headers (Authorization: Bearer <token>) or in the parameters.'
        }
      };
    }

    // Add access token to params for handlers that need it
    if (accessToken) {
      params = { ...params, accessToken };
    }

    // Route the method to the appropriate handler
    switch (method) {
      case 'initialize':
        return this.handleInitialize(params, requestId);
      case 'tools/list':
        return this.handleToolsList(requestId);
      case 'resources/list':
        return this.handleResourcesList(requestId);
      case 'prompts/list':
        return this.handlePromptsList(requestId);
      case 'list_events':
        return this.handleListEvents(params, requestId);
      case 'create_event':
        return this.handleCreateEvent(params, requestId);
      case 'update_event':
        return this.handleUpdateEvent(params, requestId);
      case 'delete_event':
        return this.handleDeleteEvent(params, requestId);
      case 'list_calendars':
        return this.handleListCalendars(params, requestId);
      case 'mcp.events.subscribe':
        return this.handleEventsSubscribe(params, requestId);
      case 'mcp.events.unsubscribe':
        return this.handleEventsUnsubscribe(params, requestId);
      default:
        throw { 
          code: -32601, 
          message: 'Method not found',
          data: { method }
        };
    }
  }

  private handleToolsList(requestId: string | number | null) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        tools: [
          {
            name: 'list_events',
            description: 'List calendar events',
            parameters: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date-time', description: 'Start date for events range' },
                endDate: { type: 'string', format: 'date-time', description: 'End date for events range' },
                calendarId: { type: 'string', description: 'Optional calendar ID to filter by' }
              }
            }
          },
          {
            name: 'create_event',
            description: 'Create a new calendar event',
            parameters: {
              type: 'object',
              required: ['title', 'start', 'end'],
              properties: {
                title: { type: 'string', description: 'Event title' },
                description: { type: 'string', description: 'Event description' },
                start: { type: 'string', format: 'date-time', description: 'Event start time' },
                end: { type: 'string', format: 'date-time', description: 'Event end time' },
                location: { type: 'string', description: 'Event location' },
                calendarId: { type: 'string', description: 'Calendar ID to create event in' },
                attendees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email' },
                      name: { type: 'string' }
                    },
                    required: ['email']
                  }
                }
              }
            }
          },
          {
            name: 'update_event',
            description: 'Update an existing calendar event',
            parameters: {
              type: 'object',
              required: ['eventId'],
              properties: {
                eventId: { type: 'string', description: 'ID of the event to update' },
                title: { type: 'string', description: 'Updated event title' },
                description: { type: 'string', description: 'Updated event description' },
                start: { type: 'string', format: 'date-time', description: 'Updated start time' },
                end: { type: 'string', format: 'date-time', description: 'Updated end time' },
                location: { type: 'string', description: 'Updated location' },
                calendarId: { type: 'string', description: 'Calendar ID containing the event' },
                status: { 
                  type: 'string', 
                  enum: ['confirmed', 'tentative', 'cancelled'],
                  description: 'Updated event status'
                }
              }
            }
          },
          {
            name: 'delete_event',
            description: 'Delete a calendar event',
            parameters: {
              type: 'object',
              required: ['eventId'],
              properties: {
                eventId: { type: 'string', description: 'ID of the event to delete' },
                calendarId: { type: 'string', description: 'Calendar ID containing the event' },
                sendUpdates: { 
                  type: 'string',
                  enum: ['all', 'externalOnly', 'none'],
                  default: 'all',
                  description: 'Whether to send notifications about the deletion'
                }
              }
            }
          },
          {
            name: 'list_calendars',
            description: 'List available calendars',
            parameters: {
              type: 'object',
              properties: {
                minAccessRole: {
                  type: 'string',
                  enum: ['owner', 'writer', 'reader', 'freeBusyReader'],
                  description: 'Minimum access role for the calendars to return'
                }
              }
            }
          }
        ]
      }
    };
  }

  private handleResourcesList(requestId: string | number | null) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        resources: [
          {
            resource: 'events',
            description: 'Calendar events management',
            methods: [
              { name: 'list_events', description: 'List calendar events' },
              { name: 'create_event', description: 'Create a new calendar event' },
              { name: 'update_event', description: 'Update an existing event' },
              { name: 'delete_event', description: 'Delete a calendar event' }
            ]
          },
          {
            resource: 'calendars',
            description: 'User calendars management',
            methods: [
              { name: 'list_calendars', description: 'List available calendars' },
              { name: 'get_calendar', description: 'Get calendar details' }
            ]
          },
          {
            resource: 'notifications',
            description: 'Real-time event notifications',
            methods: [
              { name: 'subscribe', description: 'Subscribe to calendar updates' },
              { name: 'unsubscribe', description: 'Unsubscribe from updates' }
            ]
          }
        ]
      }
    };
  }

  private handlePromptsList(requestId: string | number | null) {
    // Return an empty array if no prompts are available
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        prompts: []
      }
    };
  }

  private async handleListEvents(params: any, requestId: string | number | null) {
    const { accessToken, startDate, endDate, timezone = 'Asia/Manila' } = params;
    
    try {
      // Convert string dates to Date objects
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date();
      
      // Fetch events from calendar service
      const events = await fetchCalendarEvents(accessToken, start, end);
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          events: formatCalendarEvents(events)
        }
      };
    } catch (error) {
      console.error('Error listing events:', error);
      throw {
        code: -32603, // Internal error
        message: 'Failed to fetch calendar events',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async handleCreateEvent(params: any, requestId: string | number | null) {
    const { accessToken, ...eventData } = params;
    
    try {
      const createdEvent = await createCalendarEvent(accessToken, eventData);
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          success: true,
          event: createdEvent
        }
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw {
        code: -32603, // Internal error
        message: 'Failed to create calendar event',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async handleUpdateEvent(params: any, requestId: string | number | null) {
    const { accessToken, eventId, ...updates } = params;
    
    if (!eventId) {
      throw {
        code: -32602, // Invalid params
        message: 'Missing required parameter: eventId'
      };
    }
    
    try {
      // In a real implementation, you would call your calendar service to update the event
      // const updatedEvent = await updateCalendarEvent(accessToken, eventId, updates);
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          success: true,
          message: `Event ${eventId} updated successfully`
        }
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw {
        code: -32603, // Internal error
        message: 'Failed to update calendar event',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async handleDeleteEvent(params: any, requestId: string | number | null) {
    const { accessToken, eventId } = params;
    
    if (!eventId) {
      throw {
        code: -32602, // Invalid params
        message: 'Missing required parameter: eventId'
      };
    }
    
    try {
      // In a real implementation, you would call your calendar service to delete the event
      // await deleteCalendarEvent(accessToken, eventId);
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          success: true,
          message: `Event ${eventId} deleted successfully`
        }
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw {
        code: -32603, // Internal error
        message: 'Failed to delete calendar event',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async handleListCalendars(params: any, requestId: string | number | null) {
    const { accessToken } = params;
    
    try {
      // In a real implementation, you would fetch the list of calendars
      // const calendars = await listCalendars(accessToken);
      
      // For now, return a mock response
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          calendars: [
            {
              id: 'primary',
              name: 'Primary Calendar',
              isPrimary: true
            }
          ]
        }
      };
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw {
        code: -32603, // Internal error
        message: 'Failed to fetch calendars',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private handleInitialize(params: any, requestId: string | number | null) {
    const requestedVersion = params?.protocolVersion || '2025-06-18';
    
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        protocolVersion: requestedVersion,
        capabilities: {
          tools: {
            // Define available tools and their capabilities
            calendar: {
              listEvents: true,
              createEvent: true,
              updateEvent: true,
              deleteEvent: true
            },
            authentication: {
              oauth2: true,
              bearerToken: true
            }
          },
          resources: {
            // Define available resources and their capabilities
            events: {
              subscribe: true,
              unsubscribe: true,
              list: true,
              create: true,
              update: true,
              delete: true
            },
            calendars: {
              list: true
            }
          }
        },
        serverInfo: {
          name: 'outlook-calendar-mcp',
          version: '1.0.0',
          description: 'MCP server for Outlook Calendar integration',
          endpoints: [
            {
              type: 'sse',
              url: '/events',
              description: 'Server-Sent Events for real-time updates'
            },
            {
              type: 'rest',
              url: '/api/calendar/events',
              methods: ['GET', 'POST'],
              description: 'REST API for calendar events'
            }
          ]
        }
      }
    };
  }

  private handleEventsSubscribe(params: any, requestId: string | number | null) {
    // In a real implementation, you would register the client for specific event types
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: { 
        success: true, 
        message: 'Subscribed to events' 
      }
    };
  }

  private handleEventsUnsubscribe(params: any, requestId: string | number | null) {
    // In a real implementation, you would unregister the client
    return {
      jsonrpc: '2.0',
      id: requestId,
      result: { 
        success: true, 
        message: 'Unsubscribed from events' 
      }
    };
  }

  private async parseRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  private sendResponse(res: ServerResponse, data: any): void {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  }

  private sendErrorResponse(
    res: ServerResponse,
    code: number,
    message: string,
    id: string | number | null = null
  ): void {
    this.sendResponse(res, {
      jsonrpc: '2.0',
      error: { code, message },
      id
    });
  }
}
