const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

/**
 * Makes a request to the National Weather Service API
 * @param url The URL to request (can be relative to NWS_API_BASE)
 * @returns Promise with the parsed JSON response or null if the request fails
 */
export async function makeNWSRequest<T>(url: string): Promise<T | null> {
  // If URL is relative, prepend the base URL
  const fullUrl = url.startsWith('http') ? url : `${NWS_API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "application/geo+json",
  };

  try {
    const response = await fetch(fullUrl, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as T;
  } catch (error) {
    console.error("Error making NWS request to", fullUrl, ":", error);
    return null;
  }
}
