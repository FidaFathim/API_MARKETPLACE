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
      sessionStorage.setItem('user', 'true');
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-10 rounded-lg shadow-xl w-96">
        <h1 className="text-white text-2xl mb-5">Sign In</h1>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
          className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
          className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
        />
        <button 
          onClick={handleSignIn}
          className="w-full p-3 bg-indigo-600 rounded text-white hover:bg-indigo-500 mb-3"
        >
          Sign In
        </button>
        <div className="text-center text-white mb-3">or</div>
        <button 
          onClick={handleGoogleSignIn}
          className="w-full p-3 bg-gray-700 rounded text-white hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <img src="/google.png" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <div className="text-center text-white mt-4">
          New user?{' '}
          <button
            onClick={() => router.push('/sign-up')}
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;