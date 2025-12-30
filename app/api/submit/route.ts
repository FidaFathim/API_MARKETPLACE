import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import admin from 'firebase-admin';

// Initialize Firebase Admin using a service account JSON stored in env var
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let serviceAccount: any | undefined;
if (serviceAccountEnv) {
  try {
    serviceAccount = JSON.parse(serviceAccountEnv);
  } catch (e) {
    console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT env var as JSON');
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // If not configured, admin calls will fail; still export a handler that returns an informative error
    console.warn('Firebase Admin not initialized — set FIREBASE_SERVICE_ACCOUNT env var with service account JSON');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    if (!admin.apps.length) {
      return NextResponse.json({ success: false, error: 'Server not configured to verify tokens' }, { status: 500 });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      console.error('Token verification failed', err);
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const uid = decoded.uid;

    // Basic validation
    const { name, description, link, category, auth: authType, https, cors } = body;
    if (!name || !description || !link) {
      return NextResponse.json({ success: false, error: 'Missing required fields (name, description, link)' }, { status: 400 });
    }

    // Ensure data folder exists and append submission
    const submissionsPath = path.join(process.cwd(), 'data', 'submissions.json');
    await fs.mkdir(path.dirname(submissionsPath), { recursive: true });

    let submissions: any[] = [];
    try {
      const file = await fs.readFile(submissionsPath, 'utf8');
      submissions = JSON.parse(file || '[]');
    } catch (e) {
      submissions = [];
    }

    const newSubmission = {
      id: Date.now().toString(),
      user: uid,
      name,
      description,
      link,
      category: category || 'General',
      auth: authType || 'none',
      https: !!https,
      cors: cors || 'unknown',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    submissions.push(newSubmission);
    await fs.writeFile(submissionsPath, JSON.stringify(submissions, null, 2), 'utf8');

    return NextResponse.json({ success: true, submission: newSubmission }, { status: 201 });
  } catch (err) {
    console.error('Submit API error', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
