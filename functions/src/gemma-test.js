// Simple test function to verify Gemma API proxy functionality
export const handler = async (event, context) => {
  // Set proper CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Return test response for both GET and POST requests
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: "Gemma API test function is working",
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      apiKeyStatus: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY ? "Set" : "Not set",
      request: {
        path: event.path,
        headers: Object.keys(event.headers)
      }
    })
  };
}; 