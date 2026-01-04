import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Optional: Get user ID from request (client-side Firebase Auth)
    // For production, you should verify this server-side with Firebase Admin
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // If token is provided, extract user ID from it (basic parsing)
    // Note: This is NOT secure - for production, use Firebase Admin to verify tokens
    let uid: string | null = null;
    if (token && body.userId) {
      // Use userId from body if provided (from client-side auth)
      uid = body.userId;
    } else if (token) {
      // Try to extract from token (not secure, but works for demo)
      // In production, verify with Firebase Admin
      uid = 'anonymous';
    }

    // Basic validation
    const { name, description, link, category, auth: authType, https, cors } = body;
    if (!name || !description || !link) {
      return NextResponse.json({ success: false, error: 'Missing required fields (name, description, link)' }, { status: 400 });
    }

    // Read the existing apis.json file
    const apisJsonPath = path.join(process.cwd(), 'public', 'apis.json');
    let apisData: { count: number; entries: any[] };
    
    try {
      const file = await fs.readFile(apisJsonPath, 'utf8');
      apisData = JSON.parse(file);
    } catch (e) {
      // If file doesn't exist or is invalid, create new structure
      apisData = { count: 0, entries: [] };
    }

    // Check if API already exists (by name or link)
    const existingApi = apisData.entries.find(
      (api: any) => api.API === name || api.Link === link
    );

    if (existingApi) {
      return NextResponse.json({ 
        success: false, 
        error: 'API already exists in the list' 
      }, { status: 409 });
    }

    // Create new API entry in the same format as apis.json
    const newApiEntry = {
      API: name,
      Description: description,
      Auth: authType || '',
      HTTPS: https !== undefined ? https : true,
      Cors: cors || 'unknown',
      Link: link,
      Category: category || 'General'
    };

    // Add to entries array
    apisData.entries.push(newApiEntry);
    apisData.count = apisData.entries.length;

    // Write back to apis.json
    await fs.writeFile(
      apisJsonPath, 
      JSON.stringify(apisData, null, 4), 
      'utf8'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'API added successfully to the marketplace',
      api: newApiEntry,
      totalCount: apisData.count
    }, { status: 201 });
  } catch (err) {
    console.error('Submit API error', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
