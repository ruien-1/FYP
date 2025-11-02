import axios from "axios";
import Constants from "expo-constants";

const getBaseURL = () => {
  // Development mode (Expo Go)
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(":").shift();
    return `http://${host}:5000`;
  }
  
  // Production/Preview builds - Your Render URL
  return "https://fyp-0rqn.onrender.com";
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60 seconds for cold starts
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log(`📡 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error.message);
    return Promise.reject(error);
  }
);

// Response interceptor
API.interceptors.response.use(
  (response) => {
    console.log(`✅ Response received: ${response.status}`);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error("⏱️ Timeout - backend might be waking up");
    } else if (error.response) {
      console.error(`❌ Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error("❌ No response - check if backend is running");
    } else {
      console.error("❌ Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default API;