// Import axios for making HTTP requests
import axios from 'axios';

// Set the base URL for the backend API
const API_BASE_URL = 'http://localhost:3000'; // 修改為你的後端伺服器地址

/**
 * Register a new user
 * @param {Object} userData - The user data (name, email, password, role)
 * @returns {Promise<Object>} - The response from the server
 */
export const register = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

/**
 * Log in a user
 * @param {Object} credentials - The user credentials (email, password)
 * @returns {Promise<Object>} - The response from the server
 */
export const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

/**
 * Get the profile of the logged-in user
 * @param {string} token - The JWT token for authentication
 * @returns {Promise<Object>} - The user profile data
 */
export const getProfile = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};
