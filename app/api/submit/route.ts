import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase Admin (server-side)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_Firebase_apiKey,
  authDomain: process.env.NEXT_PUBLIC_Firebase_authDomain,
  projectId: process.env.NEXT_PUBLIC_Firebase_projectId,
  storageBucket: process.env.NEXT_PUBLIC_Firebase_storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_Firebase_messagingSenderId,
  appId: process.env.NEXT_PUBLIC_Firebase_appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Optional: Get user ID from request (client-side Firebase Auth)
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    let uid: string | null = null;
    if (token && body.userId) {
      uid = body.userId;
    } else if (token) {
      uid = 'anonymous';
    }

    // Basic validation
    const { name, description, link, category, auth: authType, https, cors, isPaid, price } = body;
    if (!name || !description || !link) {
      return NextResponse.json({ success: false, error: 'Missing required fields (name, description, link)' }, { status: 400 });
    }

    // Validate pricing
    if (isPaid && (!price || price < 0.99)) {
      return NextResponse.json({ success: false, error: 'Paid APIs must have a price of at least $0.99' }, { status: 400 });
    }

    // Check if API already exists (by name or link)
    const apisRef = collection(db, 'apis');
    const nameQuery = query(apisRef, where('API', '==', name));
    const linkQuery = query(apisRef, where('Link', '==', link));

    const [nameSnapshot, linkSnapshot] = await Promise.all([
      getDocs(nameQuery),
      getDocs(linkQuery)
    ]);

    if (!nameSnapshot.empty || !linkSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'API already exists in the list'
      }, { status: 409 });
    }

    // Create new API entry
    const newApiEntry = {
      API: name,
      Description: description,
      Auth: authType || '',
      HTTPS: https !== undefined ? https : true,
      Cors: cors || 'unknown',
      Link: link,
      Category: category || 'General',
      userId: uid,
      submittedAt: new Date().toISOString(),
      isPaid: isPaid || false,
      price: isPaid ? price : 0,
      endpoint: link, // Store endpoint for paid APIs
      createdAt: new Date().toISOString(),
    };

    // Add to Firestore
    const docRef = await addDoc(apisRef, newApiEntry);

    return NextResponse.json({
      success: true,
      message: 'API added successfully to the marketplace',
      api: { ...newApiEntry, id: docRef.id },
      totalCount: 'N/A' // We can add a count query if needed
    }, { status: 201 });
  } catch (err) {
    console.error('Submit API error', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
