import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_Firebase_apiKey,
    authDomain: process.env.NEXT_PUBLIC_Firebase_authDomain,
    projectId: process.env.NEXT_PUBLIC_Firebase_projectId,
    storageBucket: process.env.NEXT_PUBLIC_Firebase_storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_Firebase_messagingSenderId,
    appId: process.env.NEXT_PUBLIC_Firebase_appId,
    measurementId: process.env.NEXT_PUBLIC_Firebase_measurementId,
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };