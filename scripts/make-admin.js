const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function setAdmin(uid) {
    try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log(`Successfully set admin claim for user UID: ${uid}`);
        process.exit(0);
    } catch (err) {
        console.error(`Error setting admin claim:`, err);
        process.exit(1);
    }
}

// Pass the UID as a command line argument: node scripts/make-admin.js "YOUR_UID"
const uid = process.argv[2] || 'PASTE_USER_UID_HERE';
setAdmin(uid);
