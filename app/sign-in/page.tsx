'use client'
import { useState } from 'react';
import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/config';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [signInWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);
  const router = useRouter();

  const handleSignIn = async (): Promise<void> => {
    try {
      const res: UserCredential | undefined = await signInWithEmailAndPassword(email, password);
      console.log({ res });
      sessionStorage.setItem('user', 'true');
      setEmail('');
      setPassword('');
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      const res: UserCredential = await signInWithPopup(auth, provider);
      console.log({ res });

      if (res?.user) {
        // Create Firestore user document if it doesn't exist
        const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');
        const { app } = await import('@/app/firebase/config');
        const db = getFirestore(app);

        const userDocRef = doc(db, 'users', res.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email: res.user.email || '',
            credits: 0,
            purchasedAPIs: [],
            earnings: 0,
            createdAt: new Date().toISOString(),
          });
        }
      }

      sessionStorage.setItem('user', 'true');
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="bg-white p-10 rounded-lg shadow-xl w-96 border border-gray-200">
        <h1 className="text-gray-800 text-2xl mb-5 font-bold">Sign In</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <button
          onClick={handleSignIn}
          className="w-full p-3 bg-blue-600 rounded text-white hover:bg-blue-700 mb-3 font-semibold transition-colors"
        >
          Sign In
        </button>
        <div className="text-center text-gray-600 mb-3">or</div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full p-3 bg-gray-100 rounded text-gray-800 hover:bg-gray-200 flex items-center justify-center gap-2 border border-gray-300 transition-colors"
        >
          <img src="/google.png" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <div className="text-center text-gray-600 mt-4">
          New user?{' '}
          <button
            onClick={() => router.push('/sign-up')}
            className="text-blue-600 hover:text-blue-700 underline font-medium"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;