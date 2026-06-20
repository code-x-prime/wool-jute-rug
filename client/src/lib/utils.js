import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Strip inline styles from Jodit-generated HTML so prose CSS applies cleanly
export function stripInlineStyles(html) {
  if (!html) return "";
  return html
    .replace(/\s*style="[^"]*"/gi, "")
    .replace(/\s*style='[^']*'/gi, "");
}

// API URL
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

// Track in-flight requests to prevent duplicates
const pendingRequests = {};

// API request helper with error handling
export async function fetchApi(endpoint, options = {}) {
  // Ensure endpoint doesn't duplicate /api if it's already in API_URL
  const fixedEndpoint =
    API_URL.endsWith("/api") && endpoint.startsWith("/api")
      ? endpoint.replace("/api", "")
      : endpoint;

  const url = `${API_URL}${fixedEndpoint}`;

  // For GET requests to verification endpoints, implement request deduplication
  if (options.method === "GET" || !options.method) {
    const requestKey = url; // Use URL as the request key

    // If this exact request is already in flight, wait for it
    if (pendingRequests[requestKey]) {
      try {
        return await pendingRequests[requestKey];
      } catch (error) {
        throw error;
      }
    }

    // No request in flight, create a new promise
    pendingRequests[requestKey] = (async () => {
      try {
        const result = await performFetch(url, options);
        return result;
      } finally {
        // Clear the pending request after completion (success or error)
        delete pendingRequests[requestKey];
      }
    })();

    return pendingRequests[requestKey];
  }

  // For other requests (POST, PUT, etc.), just perform the fetch
  return performFetch(url, options);
}

// Internal fetch function
async function performFetch(url, options) {
  const headers = { ...options.headers };

  // Set default Content-Type to application/json only if it's not FormData
  if (options.body && options.body instanceof FormData) {
    // Let browser set the correct multipart/form-data boundary
    delete headers["Content-Type"];
  } else if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers,
    credentials: "include", // Always include credentials for cookies
  };

  try {
    // Add timestamp to prevent caching
    const urlWithTimestamp =
      url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
    let response = await fetch(urlWithTimestamp, config);

    // Handle token expiration
    if (
      response.status === 401 &&
      !url.includes("/users/refresh-token") &&
      !url.includes("/users/logout")
    ) {
      // Try to refresh the token
      try {
        const refreshResponse = await fetch(`${API_URL}/users/refresh-token`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshResponse.ok) {
          // Token refreshed successfully, retry the original request
          response = await fetch(urlWithTimestamp, {
            ...config,
            credentials: "include",
          });
          // Refresh user_session cookie timestamp so client-side check stays valid
          if (response.ok && typeof window !== "undefined") {
            const existingSession = document.cookie
              .split("; ")
              .find((row) => row.startsWith("user_session="));
            if (existingSession) {
              try {
                const sessionData = JSON.parse(
                  decodeURIComponent(existingSession.split("=")[1])
                );
                document.cookie = `user_session=${encodeURIComponent(
                  JSON.stringify({ ...sessionData, timestamp: new Date().getTime() })
                )}; path=/; max-age=86400`;
              } catch {}
            }
          }
        } else if (typeof window !== "undefined") {
          // Refresh token also expired — clear all session cookies
          document.cookie = "user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        // If refresh fails, proceed with the original 401 response
      }
    }

    // Try to parse the response as JSON (even for error responses)
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      try {
        // Try to parse text as JSON anyway
        data = JSON.parse(text);
      } catch (e) {
        // If it's not parseable JSON, create a minimal response object
        data = {
          success: response.ok,
          message: text || (response.ok ? "Success" : "Request failed"),
        };
      }
    }

    if (!response.ok) {
      // Create a structured error object
      const error = new Error(data.message || "Something went wrong");
      error.statusCode = response.status;
      error.data = data;
      error.response = response;
      throw error;
    }

    return data;
  } catch (error) {
    // If it's already our formatted error, just rethrow it
    if (error.statusCode && error.data) {
      throw error;
    }

    // Otherwise create a new error
    console.error("API Error:", error);
    const enhancedError = new Error(error.message || "Failed to fetch data");
    enhancedError.originalError = error;
    throw enhancedError;
  }
}

// Helper for getting auth token from cookies
export function getAuthToken() {
  if (typeof window !== "undefined") {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];
  }
  return null;
}

// Format currency (whole numbers only - no decimals)
export function formatCurrency(amount) {
  const parseAmount =
    amount !== undefined && amount !== null ? parseFloat(amount) : 0;
  const rounded = Math.round(parseAmount);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

// Format date
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Load an external script
export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      reject(false);
    };
    document.body.appendChild(script);
  });
};

// Fetch products by type
export async function fetchProductsByType(productType, limit = 8) {
  try {
    const response = await fetchApi(
      `/public/products/type/${productType}?limit=${limit}`
    );
    return response;
  } catch (error) {
    console.error(`Error fetching ${productType} products:`, error);
    throw error;
  }
}
