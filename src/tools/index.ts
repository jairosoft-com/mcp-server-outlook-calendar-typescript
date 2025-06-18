import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAlertsTool } from "./getAlerts.js";
import { registerForecastTool } from "./getForecast.js";

/**
 * Registers all available tools with the MCP server
 * @param server The MCP server instance to register tools with
 */
export function registerTools(server: McpServer): void {
  registerAlertsTool(server);
  registerForecastTool(server);
}
