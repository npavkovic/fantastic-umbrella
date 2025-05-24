import axios from 'axios';

export async function fetchJsonFromServer(path, baseUrl = process.env.SERVER_BASE_URL || 'http://localhost:8080') {
  try {
    const response = await axios.get(`${baseUrl}${path}`);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    console.error(`Failed to fetch ${path}: ${status} ${statusText}`);
    return null;
  }
} 