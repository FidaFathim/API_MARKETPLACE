'use client';

import { useState, FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Create user with Firebase
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      // Redirect to homepage after successful signup
      router.push('/');
    } catch (err) {
      if (err instanceof Error) {
        // Handle specific Firebase errors
        if (err.message.includes('email-already-in-use')) {
          setError('This email is already registered');
        } else if (err.message.includes('invalid-email')) {
          setError('Please enter a valid email address');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred during sign up');
      }
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center py-12 px-4" 
          style={{ backgroundColor: '#FFFFEA' }}>
      <div className="max-w-lg w-full">
        <div className="rounded-lg shadow-md p-8" 
             style={{ backgroundColor: '#FFFFEA' }}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" 
                style={{ color: '#00CECB' }}>
              Create an Account
            </h1>
            <p className="text-sm" 
               style={{ color: '#171717' }}>
              Join the API marketplace community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" 
                     className="block text-sm font-medium mb-2" 
                     style={{ color: '#171717' }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-2 rounded-lg border transition"
                style={{ 
                  backgroundColor: '#FFFFEA',
                  borderColor: '#D8D8D8',
                  color: '#171717'
                }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" 
                     className="block text-sm font-medium mb-2" 
                     style={{ color: '#171717' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                className="w-full px-4 py-2 rounded-lg border transition"
                style={{ 
                  backgroundColor: '#FFFFEA',
                  borderColor: '#D8D8D8',
                  color: '#171717'
                }}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" 
                     className="block text-sm font-medium mb-2" 
                     style={{ color: '#171717' }}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                required
                className="w-full px-4 py-2 rounded-lg border transition"
                style={{ 
                  backgroundColor: '#FFFFEA',
                  borderColor: '#D8D8D8',
                  color: '#171717'
                }}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#FF5E5B' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: loading ? '#D8D8D8' : '#00CECB',
                color: '#FFFFEA',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm" 
             style={{ color: '#171717' }}>
            Already have an account?{' '}
            <Link href="/sign-in" 
                  className="font-medium transition-all hover:underline"
                  style={{ color: '#00CECB' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
