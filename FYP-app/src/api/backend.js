// backend.js
import axios from "axios";
import Constants from "expo-constants";

const getBaseURL = () => {
  // Check if we're in Expo Go (development)
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(":").shift();
    return `http://${host}:5000`;
  }
  
  // Check for environment-specific URL from app.config.js or eas.json
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  
  // For EAS builds, use your production/preview backend URL
  // REPLACE THIS with your actual backend URL
  if (__DEV__) {
    return "http://localhost:5000"; // Development fallback
  }
  
  // For production builds - YOU NEED TO SET THIS
  return "https://your-backend-url.com"; // <-- CHANGE THIS
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // Add timeout
});

// Add request interceptor for debugging
API.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return Promise.reject(error);
  }
);

export default API;