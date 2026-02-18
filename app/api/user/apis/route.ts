import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to the APIs JSON file
const apisFilePath = path.join(process.cwd(), 'data', 'apis.json');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Read the existing APIs
    let apis = [];
    const apisFilePath = path.join(process.cwd(), 'data', 'apis.json');
    if (fs.existsSync(apisFilePath)) {
      const fileContent = fs.readFileSync(apisFilePath, 'utf8');
      const data = JSON.parse(fileContent);
      apis = data.entries || [];
    }

    // Filter APIs by userId
    const userApis = apis.filter((api: any) => api.userId === userId);

    return NextResponse.json({ apis: userApis });
  } catch (error) {
    console.error('Error fetching user APIs:', error);
    return NextResponse.json({ error: 'Failed to fetch APIs' }, { status: 500 });
  }
}
