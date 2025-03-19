const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST'
      }
    };
  }

  try {
    // Get API key from environment variable or function settings
    const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured on server' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const API_URL = "https://api-inference.huggingface.co/models/google/gemma-2b-it";
    
    // Parse the request body from the client
    const requestBody = JSON.parse(event.body);
    
    // Forward the request to HuggingFace API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Get the response data
    const data = await response.json();
    
    // Return the API response to the client
    return {
      statusCode: response.status,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Allow all origins for development
      }
    };
    
  } catch (error) {
    console.error('Error proxying to HuggingFace API:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to proxy request to HuggingFace API',
        message: error.message
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
}; 