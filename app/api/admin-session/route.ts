import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../../../serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('Failed to initialize Firebase Admin in admin-session:', e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
        }

        // Verify token and check for admin claim
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        if (decodedToken.admin) {
            // Create session cookie - valid for 5 days
            const expiresIn = 60 * 60 * 24 * 5 * 1000;
            const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

            const response = NextResponse.json({ success: true }, { status: 200 });
            response.cookies.set('admin-session', sessionCookie, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
            });

            return response;
        } else {
            return NextResponse.json({ error: 'Unauthorized: Not an admin' }, { status: 403 });
        }
    } catch (error) {
        console.error('Admin session error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    // Clear admin session
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin-session');
    return response;
}
