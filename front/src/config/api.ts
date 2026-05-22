// API base URL configuration
export const API_URL =
  import.meta.env.MODE === "production"
    ? "https://api.wooljuterug.com/api"
    : "http://localhost:4001/api";
