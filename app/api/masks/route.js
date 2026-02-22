import { NextResponse } from 'next/server';

// Python API URL via ngrok
const PYTHON_API_URL = 'http://127.0.0.1:8000';

export async function POST(request) {
  try {
    // Get the uploaded file
    const formData = await request.formData();
    
    // Forward to Python API via ngrok
    const response = await fetch(`${PYTHON_API_URL}/generate-masks`, {
      method: 'POST',
      body: formData,
      headers: {
        // ngrok may require this header to bypass warning page
        'ngrok-skip-browser-warning': 'true',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Return to frontend
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate masks',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      }
    });
    
    if (!response.ok) {
      throw new Error('Python API is down');
    }
    
    const data = await response.json();
    return NextResponse.json({ 
      status: 'healthy', 
      pythonAPI: data 
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message 
      },
      { status: 503 }
    );
  }
}