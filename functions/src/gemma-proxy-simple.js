// A minimal gemma-proxy function using CommonJS format
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // For debugging - let's return basic info for GET requests
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "This is the simplified gemma-proxy endpoint",
        apiKeyAvailable: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY ? true : false,
        method: event.httpMethod,
        requestPath: event.path
      })
    };
  }
  
  // Only handle POST for actual API requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        'Allow': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // First return a simplified response for testing
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        generated_text: "This is a test response from the simplified gemma-proxy function. The actual API call is disabled for debugging.",
        test_request_body: event.body ? JSON.parse(event.body) : null
      })
    };

    /* Actual API call code would go here once the endpoint is confirmed working
    const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const API_URL = "https://api-inference.huggingface.co/models/google/gemma-2b-it";
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: event.body
    });
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    */
  } catch (error) {
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