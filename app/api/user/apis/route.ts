import { NextRequest, NextResponse } from 'next/server';
import * as adminLib from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!adminLib.apps.length) {
  try {
    adminLib.initializeApp({
      credential: adminLib.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (e) {
    console.error('Firebase Admin init error in /api/user/apis:', e);
  }
}

const db = adminLib.firestore();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    // Fetch from both collections: pending_apis and approved apis
    const [pendingSnap, approvedSnap] = await Promise.all([
      db.collection('pending_apis').where('userId', '==', userId).get(),
      db.collection('apis').where('userId', '==', userId).get(),
    ]);

    const pendingApis = pendingSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: 'pending',
    }));

    const approvedApis = approvedSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: 'approved',
    }));

    return NextResponse.json({ apis: [...pendingApis, ...approvedApis] });
  } catch (error) {
    console.error('Error fetching user APIs:', error);
    return NextResponse.json({ error: 'Failed to fetch APIs' }, { status: 500 });
  }
}
