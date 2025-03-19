// ES Module version of the Gemma proxy for better Netlify compatibility
import fetch from 'node-fetch';

// Handle preflight CORS requests
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Environment variables access
const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/google/gemma-2b-it";

export const handler = async (event, context) => {
  console.log("Gemma proxy function invoked with method:", event.httpMethod);
  
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
      headers: {
        ...headers,
        'Allow': 'POST, OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Method Not Allowed',
        method: event.httpMethod
      })
    };
  }

  try {
    // Check for API key
    if (!API_KEY) {
      console.error("API key not found in environment variables");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured on server' })
      };
    }

    // Simple request body parsing
    const requestBody = JSON.parse(event.body);
    console.log("Request received:", JSON.stringify(requestBody).substring(0, 150) + "...");
    
    // Forward the request to HuggingFace API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Handle API error responses
    if (!response.ok) {
      console.error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Error from HuggingFace API: ${response.status} ${response.statusText}`
        })
      };
    }
    
    // Parse the response data
    const data = await response.json();
    console.log("Response from API:", JSON.stringify(data).substring(0, 150) + "...");
    
    // Return the response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Error in gemma-proxy function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error',
        message: error.message
      })
    };
  }
}; 