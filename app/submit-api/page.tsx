'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';

interface ApiSubmission {
  name: string;
  description: string;
  link: string;
  category: string;
  auth: string;
  https: boolean;
  cors: string;
  endpoint?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

interface TestResult {
  status: number;
  statusText: string;
  data: any;
  error?: string;
}

interface LoadingState {
  authenticating: boolean;
  testing: boolean;
}

const SubmitApiPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<LoadingState>({ authenticating: true, testing: false });
  const [activeTab, setActiveTab] = useState<'submission' | 'testing'>('submission');
  
  const [apiForm, setApiForm] = useState<ApiSubmission>({
    name: '',
    description: '',
    link: '',
    category: 'General',
    auth: 'none',
    https: true,
    cors: 'yes',
    method: 'GET',
  });

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Authentication Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(prev => ({ ...prev, authenticating: false }));
      } else {
        // Redirect to sign in if not authenticated
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (field: keyof ApiSubmission, value: any) => {
    setApiForm(prev => ({
      ...prev,
      [field]: value,
    }));
    setErrorMessage('');
  };

  const handleHeaderChange = (index: number, key: string, value: string) => {
    const headers = { ...(apiForm.headers || {}) };
    if (key === '' && value === '') {
      delete headers[Object.keys(headers)[index]];
    } else if (index < Object.keys(headers).length) {
      const oldKey = Object.keys(headers)[index];
      delete headers[oldKey];
      headers[key] = value;
    } else {
      headers[key] = value;
    }
    handleInputChange('headers', headers);
  };

  const validateApiForm = (): boolean => {
    if (!apiForm.name.trim()) {
      setErrorMessage('API name is required');
      return false;
    }
    if (!apiForm.description.trim()) {
      setErrorMessage('API description is required');
      return false;
    }
    if (!apiForm.link.trim()) {
      setErrorMessage('API link is required');
      return false;
    }
    try {
      new URL(apiForm.link);
    } catch {
      setErrorMessage('Invalid API link URL');
      return false;
    }
    return true;
  };

  const handleTestApi = async () => {
    if (!apiForm.endpoint) {
      setErrorMessage('Please provide an endpoint to test');
      return;
    }

    setLoading(prev => ({ ...prev, testing: true }));
    setErrorMessage('');
    setTestResult(null);

    try {
      // Build headers
      const headers: Record<string, string> = {
        ...(apiForm.headers || {}),
      };
      
      // Only add Content-Type for non-GET requests with body
      if (apiForm.method !== 'GET' && apiForm.body) {
        headers['Content-Type'] = 'application/json';
      }

      // Parse body if it's a string (JSON)
      let parsedBody: any = null;
      if (apiForm.method !== 'GET' && apiForm.body) {
        try {
          parsedBody = JSON.parse(apiForm.body);
        } catch {
          parsedBody = apiForm.body;
        }
      }

      // Use proxy API route to bypass CORS (server-side request)
      const proxyResponse = await fetch('/api/test-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: apiForm.endpoint,
          method: apiForm.method,
          headers: headers,
          body: parsedBody,
        }),
      });

      const proxyData = await proxyResponse.json();

      if (!proxyResponse.ok) {
        setErrorMessage(proxyData.error || 'Proxy request failed');
        setTestResult(null);
        return;
      }

      setTestResult({
        status: proxyData.status,
        statusText: proxyData.statusText,
        data: proxyData.data,
      });

      if (proxyData.ok) {
        setErrorMessage('');
      } else {
        setErrorMessage(`Request failed with status ${proxyData.status}: ${proxyData.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(`Error: ${errorMessage}`);
      setTestResult(null);
    } finally {
      setLoading(prev => ({ ...prev, testing: false }));
    }
  };

  const handleSubmitApi = async () => {
    if (!validateApiForm()) {
      return;
    }

    setErrorMessage('');
    try {
      // Get user ID from Firebase Auth (client-side)
      const userId = auth.currentUser?.uid;
      
      // Token is optional now - can be used for future server-side verification
      const token = await auth.currentUser?.getIdToken().catch(() => null);

      const payload = {
        name: apiForm.name,
        description: apiForm.description,
        link: apiForm.link,
        category: apiForm.category,
        auth: apiForm.auth,
        https: apiForm.https,
        cors: apiForm.cors,
        userId: userId || null, // Include user ID in payload
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }), // Optional token
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data?.error || 'Submission failed');
        return;
      }

      setSuccessMessage(
        data.message || `API "${data.api?.API || apiForm.name}" added successfully to the marketplace! (Total: ${data.totalCount || 'N/A'} APIs)`
      );
      setTimeout(() => {
        setSuccessMessage('');
        setApiForm({
          name: '',
          description: '',
          link: '',
          category: 'General',
          auth: 'none',
          https: true,
          cors: 'yes',
          method: 'GET',
        });
      }, 3000);
    } catch (err) {
      console.error('Submit error', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit API');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/sign-in');
    } catch (error) {
      setErrorMessage('Failed to logout');
    }
  };

  if (loading.authenticating) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Loading...</div>
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Submit API</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome, {user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
            >
              Back to Home
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('submission')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'submission'
                ? 'text-indigo-500 border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Submit API
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === 'testing'
                ? 'text-indigo-500 border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Test API
          </button>
        </div>

        {/* Error and Success Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300">
            {successMessage}
          </div>
        )}

        {/* Submission Tab */}
        {activeTab === 'submission' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Submit Your API</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* API Name */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">API Name</label>
                <input
                  type="text"
                  value={apiForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., OpenWeather API"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Category</label>
                <select
                  value={apiForm.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option>General</option>
                  <option>Animals</option>
                  <option>Weather</option>
                  <option>Finance</option>
                  <option>News</option>
                  <option>Health</option>
                  <option>Sports</option>
                  <option>Music</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-gray-300 font-semibold mb-2">Description</label>
                <textarea
                  value={apiForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your API..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                  rows={4}
                />
              </div>

              {/* API Link */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">API Link</label>
                <input
                  type="url"
                  value={apiForm.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Authentication */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Authentication</label>
                <select
                  value={apiForm.auth}
                  onChange={(e) => handleInputChange('auth', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="none">None</option>
                  <option value="apiKey">API Key</option>
                  <option value="oauth">OAuth</option>
                  <option value="basicAuth">Basic Auth</option>
                  <option value="bearer">Bearer Token</option>
                </select>
              </div>

              {/* HTTPS */}
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={apiForm.https}
                    onChange={(e) => handleInputChange('https', e.target.checked)}
                    className="w-5 h-5 bg-gray-700 border border-gray-600 rounded focus:outline-none"
                  />
                  <span className="text-gray-300 font-semibold">HTTPS Support</span>
                </label>
              </div>

              {/* CORS */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">CORS Support</label>
                <select
                  value={apiForm.cors}
                  onChange={(e) => handleInputChange('cors', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitApi}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition"
            >
              Submit API
            </button>
          </div>
        )}

        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Test Your API</h2>

            <div className="space-y-6 mb-8">
              {/* Endpoint */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Endpoint URL</label>
                <input
                  type="url"
                  value={apiForm.endpoint || ''}
                  onChange={(e) => handleInputChange('endpoint', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* HTTP Method */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">HTTP Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => handleInputChange('method', method)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        apiForm.method === method
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Headers */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Headers</label>
                <div className="space-y-2 mb-3">
                  {Object.entries(apiForm.headers || {}).map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Header name"
                        defaultValue={Object.keys(apiForm.headers || {})[index]}
                        onChange={(e) => handleHeaderChange(index, e.target.value, Object.values(apiForm.headers || {})[index])}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Header value"
                        defaultValue={Object.values(apiForm.headers || {})[index]}
                        onChange={(e) => handleHeaderChange(index, Object.keys(apiForm.headers || {})[index], e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const headers = { ...(apiForm.headers || {}) };
                    headers[`Header${Object.keys(headers).length + 1}`] = '';
                    handleInputChange('headers', headers);
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition"
                >
                  + Add Header
                </button>
              </div>

              {/* Request Body */}
              {apiForm.method !== 'GET' && (
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">Request Body (JSON)</label>
                  <textarea
                    value={apiForm.body || ''}
                    onChange={(e) => handleInputChange('body', e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                    rows={4}
                  />
                </div>
              )}
            </div>

            {/* Test Button */}
            <button
              onClick={handleTestApi}
              disabled={loading.testing}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded-lg transition"
            >
              {loading.testing ? 'Testing...' : 'Send Request'}
            </button>

            {/* Test Result */}
            {testResult && (
              <div className="mt-8 bg-gray-700 rounded-lg border border-gray-600 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Response</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-400 text-sm">Status Code</p>
                    <p className={`text-2xl font-bold ${testResult.status >= 200 && testResult.status < 300 ? 'text-green-400' : 'text-red-400'}`}>
                      {testResult.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Status Text</p>
                    <p className="text-white font-semibold">{testResult.statusText}</p>
                  </div>
                </div>

                {testResult.error && (
                  <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    <strong>Error:</strong> {testResult.error}
                  </div>
                )}

                {testResult.data !== null && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Response Body</p>
                    <pre className="bg-gray-900 border border-gray-600 rounded-lg p-4 text-green-400 overflow-x-auto max-h-64">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitApiPage;
