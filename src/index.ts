import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Env } from "./interface/calendarInterfaces";
import { getCalendarEvents, createCalendarEvent, setAuthToken } from "./tools/calendarTools";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Microsoft Calendar Events Fetcher",
		version: "1.0.0",
	});

	async init() {
		// Get tool definitions by calling the factory functions
		const getEventsTool = getCalendarEvents();
		const createEventTool = createCalendarEvent();

		// Register the getCalendarEvents tool
		this.server.tool(
			getEventsTool.name,
			getEventsTool.schema,
			getEventsTool.handler
		);

		// Register the createCalendarEvent tool
		this.server.tool(
			createEventTool.name,
			createEventTool.schema,
			createEventTool.handler
		);
    }
}

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
        const tokenFromUrl = url.searchParams.get('token');
        const authToken = tokenFromUrl || env.AUTH_TOKEN;
        
        console.log('Auth token received:', authToken ? `${authToken.substring(0, 10)}...` : 'No token found');
		
		setAuthToken(authToken);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};