import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import * as adminLib from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!adminLib.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      adminLib.initializeApp({
        credential: adminLib.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      const serviceAccount = require('../../../../serviceAccountKey.json');
      adminLib.initializeApp({ credential: adminLib.credential.cert(serviceAccount) });
    }
  } catch (e) {
    console.error('Firebase Admin init error in /api/chatbot:', e);
  }
}

const adminDb = adminLib.firestore();


// Fallback: fetch using Firebase REST API (no admin SDK needed)
async function fetchApisViaRest(): Promise<ApiDoc[]> {
  const projectId = process.env.NEXT_PUBLIC_Firebase_projectId;
  const apiKey = process.env.NEXT_PUBLIC_Firebase_apiKey;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/apis?key=${apiKey}&pageSize=300`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Firestore REST error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.documents) return [];

  return data.documents.map((doc: FirestoreDoc) => {
    const fields = doc.fields || {};
    return {
      API: fields.API?.stringValue || '',
      Description: fields.Description?.stringValue || '',
      Category: fields.Category?.stringValue || '',
      Link: fields.Link?.stringValue || '',
      Auth: fields.Auth?.stringValue || '',
      HTTPS: fields.HTTPS?.booleanValue ?? false,
      Cors: fields.Cors?.stringValue || '',
      status: fields.status?.stringValue || '',
    };
  });
}

interface ApiDoc {
  API: string;
  Description: string;
  Category: string;
  Link: string;
  Auth: string;
  HTTPS: boolean;
  Cors: string;
  status?: string;
}

interface FirestoreDoc {
  fields?: {
    API?: { stringValue?: string };
    Description?: { stringValue?: string };
    Category?: { stringValue?: string };
    Link?: { stringValue?: string };
    Auth?: { stringValue?: string };
    HTTPS?: { booleanValue?: boolean };
    Cors?: { stringValue?: string };
    status?: { stringValue?: string };
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    // Fetch APIs — try Admin SDK first, fall back to REST
    let apis: ApiDoc[] = [];
    try {
      const snapshot = await adminDb.collection('apis').get();
      apis = snapshot.docs.map((doc: any) => doc.data() as ApiDoc);
    } catch {
      // Admin SDK not configured — use public REST API
      try {
        const all = await fetchApisViaRest();
        apis = all;
      } catch (restErr) {
        console.error('REST fallback failed:', restErr);
        apis = [];
      }
    }

    // Build a concise context string (avoid token bloat)
    const apiContext = apis.length > 0
      ? apis
          .slice(0, 150) // cap at 150 to stay within token limits
          .map((api, i) =>
            `${i + 1}. [${api.API}] - ${api.Description} | Category: ${api.Category} | Auth: ${api.Auth || 'None'} | HTTPS: ${api.HTTPS} | Link: ${api.Link}`
          )
          .join('\n')
      : 'No APIs are currently available in the database.';

    const systemPrompt = `You are a helpful API Marketplace Assistant for "API Store" — a platform where developers discover and integrate APIs.

You have access to the following APIs currently available in the marketplace:

${apiContext}

Your job:
- Help users find the right API based on their requirements (use case, category, auth type, HTTPS, etc.)
- Recommend relevant APIs with their name, a brief explanation of why it fits, and the documentation link
- If no API matches perfectly, suggest the closest alternatives and explain why
- Keep responses concise, clear, and developer-friendly
- Format recommendations as a short list when recommending multiple APIs
- If asked about categories, list the distinct categories available
- Do NOT make up APIs that aren't in the list above`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chatbot route error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
