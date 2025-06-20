import ForecastPeriod from "./forecastPeriod.js";
export default interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}