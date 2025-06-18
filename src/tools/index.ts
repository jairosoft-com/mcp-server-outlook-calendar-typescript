import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAlertsTool } from "./getAlerts.js";
import { registerForecastTool } from "./getForecast.js";
import { registerCalendarTools } from "./calendarTools.js";

// Re-export tool registration functions
export * from "./getAlerts.js";
export * from "./getForecast.js";
export * from "./calendarTools.js";

/**
 * Registers all available tools with the MCP server
 * @param server The MCP server instance to register tools with
 */
export function registerTools(server: McpServer): void {
  // Register weather tools
  registerAlertsTool(server);
  registerForecastTool(server);
  
  // Register calendar tools
  registerCalendarTools(server);
}
