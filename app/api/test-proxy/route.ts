import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, method = 'GET', headers = {}, body: requestBody } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'API-Marketplace-Test/1.0',
        ...headers,
      },
    };

    // Add body for non-GET requests
    if (method.toUpperCase() !== 'GET' && requestBody) {
      fetchOptions.body = typeof requestBody === 'string' 
        ? requestBody 
        : JSON.stringify(requestBody);
    }

    // Make the request server-side (bypasses CORS)
    const response = await fetch(targetUrl.toString(), fetchOptions);
    
    // Get response text
    const responseText = await response.text();
    
    // Try to parse as JSON
    let responseData: any;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = responseText || null;
    }

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
      ok: response.ok,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
        statusText: 'Internal Server Error',
        data: null,
      },
      { status: 500 }
    );
  }
}

