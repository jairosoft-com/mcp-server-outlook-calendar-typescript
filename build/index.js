"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const index_js_1 = require("./tools/index.js");
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "weather",
    version: "1.0.0",
});
// Register all tools
(0, index_js_1.registerTools)(server);
// Start the server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Calendar MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
