import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load service account key
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin SDK with service account
// This bypasses security rules and is meant for server-side operations
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateData() {
    try {
        console.log('🚀 Starting migration from apis.json to Firestore...\n');

        // Read the JSON file
        const jsonPath = path.join(process.cwd(), 'data', 'apis.json');
        const fileContent = fs.readFileSync(jsonPath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (!data.entries || !Array.isArray(data.entries)) {
            console.error('❌ Invalid JSON structure. Expected { entries: [] }');
            return;
        }

        console.log(`📊 Found ${data.entries.length} APIs to migrate\n`);

        // Migrate each API
        let successCount = 0;
        let errorCount = 0;

        for (const api of data.entries) {
            try {
                // Add default pricing fields for existing APIs
                const apiData = {
                    ...api,
                    isPaid: false,
                    price: 0,
                    endpoint: api.Link || null,
                    createdAt: api.submittedAt || new Date().toISOString(),
                };

                // Add to Firestore using Admin SDK
                const docRef = await db.collection('apis').add(apiData);
                console.log(`✅ Migrated: ${api.API} (ID: ${docRef.id})`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to migrate ${api.API}:`, error);
                errorCount++;
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   ✅ Successfully migrated: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log(`   📊 Total: ${data.entries.length}`);
        console.log('\n✨ Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateData()
    .then(() => {
        console.log('\n👍 You can now safely use Firestore for your APIs!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
