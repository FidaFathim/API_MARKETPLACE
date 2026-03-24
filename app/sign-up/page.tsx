'use client'
import { useState } from 'react';
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/config';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const SignUp = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);
  const router = useRouter();

  const handleSignUp = async (): Promise<void> => {
    setError('');
    try {
      if (!username.trim()) {
        setError('Please enter a username.');
        return;
      }
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (!githubUrl || !linkedinUrl) {
        setError('Please enter both GitHub and LinkedIn profile URLs.');
        return;
      }

      const res = await createUserWithEmailAndPassword(email, password);

      if (res?.user) {
        // Create Firestore user document via Admin-backed API route
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: res.user.uid,
            username: username.trim(),
            email,
            githubUrl,
            linkedinUrl,
          }),
        });
      }

      sessionStorage.setItem('user', 'true');
      setEmail('');
      setPassword('');
      setUsername('');
      setGithubUrl('');
      setLinkedinUrl('');
      router.push('/');
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(e.message || 'Sign up failed. Please try again.');
      }
    }
  };

  const handleGoogleSignUp = async (): Promise<void> => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);

      if (res?.user) {
        // Create Firestore user document if it doesn't exist (Google users get displayName as username)
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: res.user.uid,
            username: res.user.displayName || res.user.email?.split('@')[0] || 'User',
            email: res.user.email || '',
            isNewUser: true, // signal to only set if doc doesn't exist
          }),
        });
      }

      sessionStorage.setItem('user', 'true');
      router.push('/');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Google sign up failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="bg-white p-10 rounded-lg shadow-xl w-96 border border-gray-200">
        <h1 className="text-gray-800 text-2xl mb-5 font-bold">Create Account</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username (min. 3 characters)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <input
          type="password"
          placeholder="Password (min. 6 characters)"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <input
          type="url"
          placeholder="GitHub Profile URL"
          value={githubUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubUrl(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <input
          type="url"
          placeholder="LinkedIn Profile URL"
          value={linkedinUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkedinUrl(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-50 rounded outline-none text-gray-800 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <button
          onClick={handleSignUp}
          className="w-full p-3 bg-blue-600 rounded text-white hover:bg-blue-700 mb-3 font-semibold transition-colors"
        >
          Sign Up
        </button>
        <div className="text-center text-gray-600 mb-3">or</div>
        <button
          onClick={handleGoogleSignUp}
          className="w-full p-3 bg-gray-100 rounded text-gray-800 hover:bg-gray-200 flex items-center justify-center gap-2 border border-gray-300 transition-colors"
        >
          <img src="/google.png" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <div className="text-center text-gray-600 mt-4">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/sign-in')}
            className="text-blue-600 hover:text-blue-700 underline font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;