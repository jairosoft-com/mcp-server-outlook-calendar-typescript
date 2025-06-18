import { z } from "zod";
import { makeNWSRequest } from "../services/nwsService.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type PointsResponse from "../interfaces/pointsResponse.js";
import type ForecastResponse from "../interfaces/forecastResponse.js";
import type ForecastPeriod from "../interfaces/forecastPeriod.js";

/**
 * Registers the get-forecast tool with the MCP server
 * @param server The MCP server instance to register the tool with
 */
export function registerForecastTool(server: McpServer): void {
  server.tool(
    "get-forecast",
    "Get weather forecast for a location",
    {
      latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
      longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
      // Get grid point data
      const pointsUrl = `/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

      if (!pointsData) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
            },
          ],
        };
      }

      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to get forecast URL from grid point data",
            },
          ],
        };
      }

      // Get forecast data
      const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
      if (!forecastData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve forecast data",
            },
          ],
        };
      }

      const periods = forecastData.properties?.periods || [];
      if (periods.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No forecast periods available",
            },
          ],
        };
      }

      // Format forecast periods
      const formattedForecast = periods.map((period: ForecastPeriod) =>
        [
          `${period.name || "Unknown"}:`,
          `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
          `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
          `${period.shortForecast || "No forecast available"}`,
          "---",
        ].join("\n"),
      );

      const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

      return {
        content: [
          {
            type: "text",
            text: forecastText,
          },
        ],
      };
    },
  );
}
