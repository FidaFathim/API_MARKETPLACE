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
    console.error('Firebase Admin init error in /api/process-payment:', e);
  }
}

const db = adminLib.firestore();

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, apiId, paymentIntentId } = await req.json();

    if (!userId || !apiId || !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, apiId, paymentIntentId' },
        { status: 400 }
      );
    }

    // 1. Get the API document
    const apiDoc = await db.collection('apis').doc(apiId).get();
    if (!apiDoc.exists) {
      return NextResponse.json({ error: 'API not found' }, { status: 404 });
    }
    const apiData = apiDoc.data()!;

    // 2. Check if already purchased (idempotency)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    if (userData?.purchasedAPIs?.includes(apiId)) {
      return NextResponse.json({
        success: true,
        message: 'Already purchased',
        apiName: apiData.API,
      });
    }

    // 3. Update buyer: add to purchasedAPIs, remove from cart
    const buyerUpdate: Record<string, any> = {
      purchasedAPIs: adminLib.firestore.FieldValue.arrayUnion(apiId),
      cart: adminLib.firestore.FieldValue.arrayRemove(apiId),
    };
    await db.collection('users').doc(userId).update(buyerUpdate);

    // 4. Update seller's earnings (if seller exists)
    if (apiData.userId) {
      const sellerRef = db.collection('users').doc(apiData.userId);
      const sellerDoc = await sellerRef.get();
      if (sellerDoc.exists) {
        await sellerRef.update({
          earnings: adminLib.firestore.FieldValue.increment(apiData.price || 0),
        });
      }
    }

    // 5. Record the transaction
    await db.collection('transactions').add({
      buyerId: userId,
      buyerEmail: userEmail || null,
      sellerId: apiData.userId || null,
      apiId: apiId,
      apiName: apiData.API,
      amount: apiData.price || 0,
      paymentIntentId: paymentIntentId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      apiName: apiData.API,
      apiDescription: apiData.Description,
      apiEndpoint: apiData.endpoint || apiData.Link,
      apiPrice: apiData.price,
    });
  } catch (error) {
    console.error('Process payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process payment' },
      { status: 500 }
    );
  }
}
