import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { z } from 'zod';
import { fetchCalendarEvents, createCalendarEvent, formatCalendarEvents } from './calendarEventsService.js';
import { fetchCalendarEventsSchema } from '../schemas/fetchCalendarEventsSchema.js';
import { createEventToolSchema } from '../schemas/createEventSchema.js';

export async function handleCreateCalendarEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  return new Promise((resolve) => {
    req.on('end', async () => {
      try {
        // Extract access token from Authorization header
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Unauthorized',
            details: 'Authorization header with Bearer token is required'
          }));
          return resolve();
        }
        const accessToken = authHeader.split(' ')[1];

        // Parse and validate request body
        const eventData = JSON.parse(body);
        const schema = z.object(createEventToolSchema);
        const validation = schema.safeParse(eventData);

        if (!validation.success) {
          const errorMessages = validation.error.issues.map(issue => 
            `${issue.path.join('.')}: ${issue.message}`
          ).join(', ');
          
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Validation failed',
            details: errorMessages
          }));
          return resolve();
        }
        
        // Create the event using the validated data
        const createdEvent = await createCalendarEvent(accessToken, validation.data);
        
        // Send the response
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: createdEvent
        }));
      } catch (error) {
        console.error('Error creating calendar event:', error);
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Failed to create calendar event',
          details: error instanceof Error ? error.message : 'Unknown error'
        }));
      } finally {
        resolve();
      }
    });
  });
}

export async function handleCalendarEvents(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    console.log('Handling calendar events request');
    const { query } = parse(req.url || '', true);
    console.log('Request query parameters:', JSON.stringify(query, null, 2));
    
    // Extract access token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Authorization header with Bearer token is required'
      }));
      return;
    }
    const accessToken = authHeader.split(' ')[1];
    
    // Validate query parameters using the schema
    const schema = z.object(fetchCalendarEventsSchema);
    const validation = schema.safeParse({
      start_date: query.start_date,
      end_date: query.end_date,
      timezone: query.timezone
    });
    
    console.log('Validation result:', validation.success ? 'Valid' : 'Invalid');
    if (!validation.success) {
      console.error('Validation errors:', validation.error.issues);
      
      const errorMessages = validation.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Validation failed',
        details: errorMessages
      }));
      return;
    }

    const { start_date, end_date, timezone } = validation.data;
    
    // Parse dates (already validated by the schema)
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    // Additional date validation
    if (startDate > endDate) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Invalid date range',
        details: 'Start date must be before end date'
      }));
      return;
    }

    console.log('Fetching calendar events with parameters:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone
    });
    
    // Fetch events using the service
    const events = await fetchCalendarEvents(accessToken, startDate, endDate);
    console.log(`Fetched ${events.length} events from the service`);
    
    // Format the events
    const formattedEvents = formatCalendarEvents(events);
    const response = {
      data: formattedEvents,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone
    };

    console.log('Sending response with events');
    // Send the response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error handling calendar events:', error);
    const statusCode = error instanceof z.ZodError ? 400 : 500;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}
