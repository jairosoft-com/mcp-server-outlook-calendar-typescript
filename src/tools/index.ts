import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCalendarTools } from "./calendarTools.js";

// Re-export tool registration functions
export * from "./calendarTools.js";

/**
 * Registers all available tools with the MCP server
 * @param server The MCP server instance to register tools with
 */
export function registerTools(server: McpServer): void {
  // Register calendar tools
  registerCalendarTools(server);
}
