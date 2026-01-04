'use client'
import { useState } from 'react';
import { useCreateUserWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/config';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const SignUp = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);
  const router = useRouter();

  const handleSignUp = async (): Promise<void> => {
    try {
      // Validate URLs
      if (!githubUrl || !linkedinUrl) {
        alert('Please enter both GitHub and LinkedIn profile URLs');
        return;
      }
      
      const res = await createUserWithEmailAndPassword(email, password);
      console.log({ res });
      
      // Store user profile data
      const userProfile = {
        email,
        githubUrl,
        linkedinUrl,
        uid: res?.user?.uid,
      };
      sessionStorage.setItem('user', 'true');
      sessionStorage.setItem('userProfile', JSON.stringify(userProfile));
      
      setEmail('');
      setPassword('');
      setGithubUrl('');
      setLinkedinUrl('');
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleSignUp = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
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
        <h1 className="text-white text-2xl mb-5">Create an Account</h1>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
        />
        <input 
          type="url" 
          placeholder="GitHub Profile URL" 
          value={githubUrl} 
          onChange={(e) => setGithubUrl(e.target.value)} 
          className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
        />
        <input 
          type="url" 
          placeholder="LinkedIn Profile URL" 
          value={linkedinUrl} 
          onChange={(e) => setLinkedinUrl(e.target.value)} 
          className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
        />
        <button 
          onClick={handleSignUp}
          className="w-full p-3 bg-indigo-600 rounded text-white hover:bg-indigo-500 mb-3"
        >
          Create Account
        </button>
        <div className="text-center text-white mb-3">or</div>
        <button 
          onClick={handleGoogleSignUp}
          className="w-full p-3 bg-gray-700 rounded text-white hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <img src="/google.png" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default SignUp;