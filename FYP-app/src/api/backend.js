import axios from "axios";
import Constants from "expo-constants";

const getBaseURL = () => {
  const isStandalone = Constants.appOwnership === 'standalone' || 
                       Constants.executionEnvironment === 'standalone' ||
                       !__DEV__;
  
  if (isStandalone) {
    return "https://fyp-0rqn.onrender.com";
  }
  
  return "https://fyp-0rqn.onrender.com";
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, 
});

API.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
    } else if (error.response) {
    } else if (error.request) {
    } else {
    }
    return Promise.reject(error);
  }
);

export default API;