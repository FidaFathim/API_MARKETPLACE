'use server';

import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        } else {
            const serviceAccount = require('../../serviceAccountKey.json');
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
    } catch (e) {
        console.error('Failed to initialize Firebase Admin in server actions:', e);
    }
}

async function verifyAdmin() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin-session');

    if (!sessionCookie) return null;

    try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie.value, true);
        if (!decodedClaims.admin) return null;
        return decodedClaims;
    } catch (error) {
        return null;
    }
}

// Fetch all pending API submissions from the dedicated 'pending_apis' collection
export async function getPendingAPIs() {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) throw new Error('Unauthorized');

    const snapshot = await admin.firestore()
        .collection('pending_apis')
        .orderBy('submittedAt', 'desc')
        .get();

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Enrich with submitter username (batch lookup)
    const userIds = [...new Set(docs.map((d: any) => d.userId).filter(Boolean))];
    const usernameMap: Record<string, string> = {};

    await Promise.all(
        userIds.map(async (uid: string) => {
            try {
                const userDoc = await admin.firestore().collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data()!;
                    usernameMap[uid] = data.username || data.email || uid;
                }
            } catch {
                // skip
            }
        })
    );

    return docs.map((doc: any) => ({
        ...doc,
        submitterUsername: doc.userId ? (usernameMap[doc.userId] || doc.userId) : 'Unknown',
    }));
}

// Approve: move from 'pending_apis' → 'apis', then delete from pending
export async function approveAPI(apiId: string) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) throw new Error('Unauthorized');

    const db = admin.firestore();
    const pendingRef = db.collection('pending_apis').doc(apiId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
        throw new Error('Pending API not found');
    }

    const data = pendingSnap.data()!;

    // Write the approved API to the main 'apis' collection
    await db.collection('apis').add({
        ...data,
        status: 'approved',
        approvedAt: new Date().toISOString(),
    });

    // Delete from the pending_apis collection
    await pendingRef.delete();
}

// Reject: just delete from 'pending_apis'
export async function deleteAPI(apiId: string) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) throw new Error('Unauthorized');

    await admin.firestore().collection('pending_apis').doc(apiId).delete();
}
