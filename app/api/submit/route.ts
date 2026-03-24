import { NextRequest, NextResponse } from 'next/server';
import * as adminLib from 'firebase-admin';

// Initialize Firebase Admin SDK (server-side only — bypasses Firestore security rules)
if (!adminLib.apps.length) {
  try {
    const serviceAccount = require('../../../serviceAccountKey.json');
    adminLib.initializeApp({
      credential: adminLib.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Firebase Admin init error in /api/submit:', e);
  }
}

const db = adminLib.firestore();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract user ID from request
    const { name, description, link, category, auth: authType, https, cors, isPaid, price, userId } = body;

    // Basic validation
    if (!name || !description || !link) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (name, description, link)' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(link);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid API link URL' },
        { status: 400 }
      );
    }

    // Validate pricing
    if (isPaid && (!price || price < 50)) {
      return NextResponse.json(
        { success: false, error: 'Paid APIs must have a price of at least ₹50' },
        { status: 400 }
      );
    }

    // ── Run automated security checks ────────────────────────────────────────
    // Call the security-check route internally
    let securityReport: any = null;
    try {
      const origin = req.nextUrl.origin;
      const secRes = await fetch(`${origin}/api/security-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });
      securityReport = await secRes.json();
    } catch (secErr) {
      console.error('Security check error (non-blocking):', secErr);
      // Don't block submission if security service fails
    }

    // ── Hard block: block submissions flagged as CRITICAL risk ────────────────
    if (securityReport && securityReport.riskLevel === 'critical') {
      return NextResponse.json(
        {
          success: false,
          error: 'Security scan failed: This URL was flagged as malicious by VirusTotal. Submission blocked.',
          securityReport,
        },
        { status: 422 }
      );
    }

    // Check for duplicates across both 'apis' (approved) and 'pending_apis' collections
    const [
      approvedByName,
      approvedByLink,
      pendingByName,
      pendingByLink,
    ] = await Promise.all([
      db.collection('apis').where('API', '==', name).get(),
      db.collection('apis').where('Link', '==', link).get(),
      db.collection('pending_apis').where('API', '==', name).get(),
      db.collection('pending_apis').where('Link', '==', link).get(),
    ]);

    if (!approvedByName.empty || !approvedByLink.empty) {
      return NextResponse.json(
        { success: false, error: 'An API with this name or link already exists in the marketplace.' },
        { status: 409 }
      );
    }

    if (!pendingByName.empty || !pendingByLink.empty) {
      return NextResponse.json(
        { success: false, error: 'An API with this name or link is already pending review.' },
        { status: 409 }
      );
    }

    // Build the new pending API entry, including the full security report
    const newPendingEntry: Record<string, any> = {
      API: name,
      Description: description,
      Auth: authType || '',
      HTTPS: parsedUrl.protocol === 'https:',
      Cors: cors || 'unknown',
      Link: link,
      Category: category || 'General',
      userId: userId || null,
      submittedAt: new Date().toISOString(),
      isPaid: isPaid || false,
      price: isPaid ? price : 0,
      endpoint: link,
      status: 'pending',
      // Attach the security scan results
      securityReport: securityReport || null,
      securityRiskLevel: securityReport?.riskLevel || 'unknown',
    };

    // Write to 'pending_apis' collection (separate from main 'apis' collection)
    const docRef = await db.collection('pending_apis').add(newPendingEntry);

    // Compose a user-friendly response with security info
    const riskMessages: Record<string, string> = {
      low: 'Security scan completed — no significant issues found.',
      medium: 'Security scan completed — some warnings detected. Awaiting admin review.',
      high: 'Security scan completed — some issues detected. An admin will review carefully.',
      unknown: 'Security scan could not be completed. Admin will review manually.',
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Your API has been submitted for review. Our team will review it shortly.',
        securityNote: securityReport ? riskMessages[securityReport.riskLevel] : riskMessages.unknown,
        riskLevel: securityReport?.riskLevel || 'unknown',
        id: docRef.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Submit API error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
