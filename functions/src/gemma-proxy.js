// Netlify function to proxy requests to HuggingFace API
import fetch from 'node-fetch';

// Handle preflight CORS requests
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        ...headers,
        'Allow': 'POST, OPTIONS'
      }
    };
  }

  try {
    // Get API key from environment variable
    const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    
    if (!API_KEY) {
      console.error("API key not found in environment variables");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured on server' })
      };
    }

    const API_URL = "https://api-inference.huggingface.co/models/google/gemma-2b-it";
    
    // Parse the request body from the client
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      console.error("Error parsing request body", e);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body - could not parse JSON' })
      };
    }
    
    console.log("Forwarding request to HuggingFace API");
    
    // Forward the request to HuggingFace API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Check if the response is ok before parsing JSON
    if (!response.ok) {
      console.error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Error from HuggingFace API: ${response.statusText}`,
          status: response.status
        })
      };
    }

    // Get the response data
    const data = await response.json();
    console.log("Received response from HuggingFace API");
    
    // Return the API response to the client
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Error proxying to HuggingFace API:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to proxy request to HuggingFace API',
        message: error.message
      })
    };
  }
}; 