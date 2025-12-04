import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Missing required parameter: password' },
        { status: 400 }
      );
    }

    // For password testing, we use the Have I Been Pwned Password API
    const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);
    
    const endpoint = `https://api.pwnedpasswords.com/range/${prefix}`;

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        'User-Agent': 'API-Marketplace-Playground/1.0'
      }
    };

    const response = await fetch(endpoint, requestOptions);

    if (!response.ok) {
      if (response.status === 404) {
        // For Have I Been Pwned, 404 means not found (good for passwords)
        return NextResponse.json({
          result: false,
          message: 'Password not found in breaches',
          status: 'safe'
        });
      }
      
      return NextResponse.json(
        { 
          error: `Have I Been Pwned API error: ${response.status} ${response.statusText}`,
          status: response.status
        },
        { status: response.status }
      );
    }

    // Parse the response for password testing
    const data = await response.text();
    const lines = data.split('\n');
    
    // Check if our password hash suffix is in the response
    const found = lines.some(line => {
      const [hashSuffix, count] = line.split(':');
      return hashSuffix === suffix;
    });

    if (found) {
      const line = lines.find(l => l.startsWith(suffix));
      const count = line ? parseInt(line.split(':')[1]) : 0;
      return NextResponse.json({
        result: true,
        message: `Password found in ${count} data breaches`,
        status: 'compromised',
        breachCount: count
      });
    } else {
      return NextResponse.json({
        result: false,
        message: 'Password not found in breaches',
        status: 'safe'
      });
    }
  } catch (error) {
    console.error('Have I Been Pwned proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
