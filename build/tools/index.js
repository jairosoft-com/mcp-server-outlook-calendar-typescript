"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTools = registerTools;
const calendarTools_js_1 = require("./calendarTools.js");
// Re-export tool registration functions
__exportStar(require("./calendarTools.js"), exports);
/**
 * Registers all available tools with the MCP server
 * @param server The MCP server instance to register tools with
 */
function registerTools(server) {
    // Register calendar tools
    (0, calendarTools_js_1.registerCalendarTools)(server);
}
