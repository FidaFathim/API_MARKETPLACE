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
  isPaid: boolean;
  price: number;
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
  const [submitting, setSubmitting] = useState(false);
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [securityResult, setSecurityResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'submission' | 'testing'>('submission');
  const [submitted, setSubmitted] = useState(false);

  const [apiForm, setApiForm] = useState<ApiSubmission>({
    name: '',
    description: '',
    link: '',
    category: 'General',
    auth: 'none',
    https: true,
    cors: 'yes',
    method: 'GET',
    isPaid: false,
    price: 50.00,
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
    if (!validateApiForm()) return;

    setErrorMessage('');
    setSecurityResult(null);
    setSubmitting(true);
    setScanPhase('scanning');

    try {
      const userId = auth.currentUser?.uid;
      const token = await auth.currentUser?.getIdToken().catch(() => null);

      const payload = {
        name: apiForm.name,
        description: apiForm.description,
        link: apiForm.link,
        category: apiForm.category,
        auth: apiForm.auth,
        https: apiForm.https,
        cors: apiForm.cors,
        userId: userId || null,
        isPaid: apiForm.isPaid,
        price: apiForm.isPaid ? apiForm.price : 0,
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setScanPhase('done');

      if (!res.ok) {
        // Show security report even on block (422)
        if (data?.securityReport) setSecurityResult(data.securityReport);
        setErrorMessage(data?.error || 'Submission failed');
        return;
      }

      if (data?.securityReport) setSecurityResult(data.securityReport);

      setSubmitted(true);
      setApiForm({
        name: '', description: '', link: '', category: 'General',
        auth: 'none', https: true, cors: 'yes', method: 'GET',
        isPaid: false, price: 50.00,
      });
    } catch (err) {
      setScanPhase('idle');
      console.error('Submit error', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit API');
    } finally {
      setSubmitting(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-800 text-2xl mb-4">Loading...</div>
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <img src="/APILogo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-gray-900">API Store</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('submission')}
            className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'submission'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Submit API
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'testing'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Test API
          </button>
        </div>

        {/* Error and Success Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Submission Tab */}
        {activeTab === 'submission' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Submit Your API</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* API Name */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">API Name</label>
                <input
                  type="text"
                  value={apiForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., OpenWeather API"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Category</label>
                <select
                  value={apiForm.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500"
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
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <textarea
                  value={apiForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your API..."
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  rows={4}
                />
              </div>

              {/* API Link */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">API Link</label>
                <input
                  type="url"
                  value={apiForm.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Authentication */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Authentication</label>
                <select
                  value={apiForm.auth}
                  onChange={(e) => handleInputChange('auth', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500"
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
                    className="w-5 h-5 bg-gray-50 border border-gray-300 rounded focus:outline-none"
                  />
                  <span className="text-gray-700 font-semibold">HTTPS Support</span>
                </label>
              </div>

              {/* CORS */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">CORS Support</label>
                <select
                  value={apiForm.cors}
                  onChange={(e) => handleInputChange('cors', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              {/* Paid API Toggle */}
              <div className="md:col-span-2 border-t border-gray-200 pt-6">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={apiForm.isPaid}
                    onChange={(e) => handleInputChange('isPaid', e.target.checked)}
                    className="w-5 h-5 bg-gray-50 border border-gray-300 rounded focus:outline-none"
                  />
                  <span className="text-gray-700 font-semibold text-lg">Make this a Paid API</span>
                </label>

                {/* Price Input - Shows when isPaid is true */}
                {apiForm.isPaid && (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Price (Rs)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">₹</span>
                      <input
                        type="number"
                        min="50"
                        step="1"
                        value={apiForm.price}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 50)}
                        placeholder="50.00"
                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Minimum price: ₹ 50.00</p>
                  </div>
                )}
              </div>
            </div>

            {/* Scanning Overlay */}
            {scanPhase === 'scanning' && (
              <div className="w-full p-8 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xl font-bold text-indigo-800">Running Security Checks...</span>
                </div>
                <div className="space-y-2 text-sm text-indigo-700 text-left max-w-sm mx-auto">
                  {['🔍 Submitting URL to VirusTotal...', '🔒 Checking HTTPS enforcement...', '🌐 Auditing domain patterns...', '📋 Scanning response headers...', '🔗 Verifying URL reachability...'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-indigo-500 mt-4">This may take 20–30 seconds for VirusTotal analysis</p>
              </div>
            )}

            {/* Security Report Panel */}
            {scanPhase === 'done' && securityResult && !submitted && (
              <div className={`w-full p-5 rounded-lg border mb-4 ${
                securityResult.riskLevel === 'critical' ? 'bg-red-50 border-red-300' :
                securityResult.riskLevel === 'high' ? 'bg-orange-50 border-orange-300' :
                securityResult.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    🛡️ Security Scan Report
                  </h4>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                    securityResult.riskLevel === 'critical' ? 'bg-red-600 text-white' :
                    securityResult.riskLevel === 'high' ? 'bg-orange-500 text-white' :
                    securityResult.riskLevel === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {securityResult.riskLevel} risk
                  </span>
                </div>
                <div className="space-y-2">
                  {securityResult.checks?.map((check: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 ${
                        check.status === 'pass' ? 'text-green-600' :
                        check.status === 'fail' ? 'text-red-600' :
                        check.status === 'warn' ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        {check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'warn' ? '⚠️' : '⏭️'}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{check.name}: </span>
                        <span className="text-gray-600">{check.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {securityResult.virusTotalStats?.permalink && (
                  <a
                    href={securityResult.virusTotalStats.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs text-indigo-600 hover:underline"
                  >
                    View full VirusTotal report ↗
                  </a>
                )}
              </div>
            )}

            {/* Submit Button / Success Card */}
            {scanPhase !== 'scanning' && (
              submitted ? (
                <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-xl font-bold text-blue-800 mb-2">API Submitted for Review!</h3>
                  <p className="text-blue-700">
                    Your API has been submitted and is pending admin approval.
                    You will be notified once it goes live on the marketplace.
                  </p>
                  {securityResult && (
                    <p className={`mt-2 text-sm font-medium ${
                      securityResult.riskLevel === 'low' ? 'text-green-600' : 'text-yellow-700'
                    }`}>
                      Security scan: {securityResult.riskLevel?.toUpperCase()} risk
                    </p>
                  )}
                  <button
                    onClick={() => { setSubmitted(false); setScanPhase('idle'); setSecurityResult(null); }}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                  >
                    Submit Another API
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmitApi}
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Running Security Checks...
                    </>
                  ) : '🔍 Submit API for Review'}
                </button>
              )
            )}
          </div>
        )}


        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Test Your API</h2>

            <div className="space-y-6 mb-8">
              {/* Endpoint */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Endpoint URL</label>
                <input
                  type="url"
                  value={apiForm.endpoint || ''}
                  onChange={(e) => handleInputChange('endpoint', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* HTTP Method */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">HTTP Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => handleInputChange('method', method)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${apiForm.method === method
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Headers */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Headers</label>
                <div className="space-y-2 mb-3">
                  {Object.entries(apiForm.headers || {}).map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Header name"
                        defaultValue={Object.keys(apiForm.headers || {})[index]}
                        onChange={(e) => handleHeaderChange(index, e.target.value, Object.values(apiForm.headers || {})[index])}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Header value"
                        defaultValue={Object.values(apiForm.headers || {})[index]}
                        onChange={(e) => handleHeaderChange(index, Object.keys(apiForm.headers || {})[index], e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition"
                >
                  + Add Header
                </button>
              </div>

              {/* Request Body */}
              {apiForm.method !== 'GET' && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Request Body (JSON)</label>
                  <textarea
                    value={apiForm.body || ''}
                    onChange={(e) => handleInputChange('body', e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono resize-none"
                    rows={4}
                  />
                </div>
              )}
            </div>

            {/* Test Button */}
            <button
              onClick={handleTestApi}
              disabled={loading.testing}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
            >
              {loading.testing ? 'Testing...' : 'Send Request'}
            </button>

            {/* Test Result */}
            {testResult && (
              <div className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Response</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-600 text-sm">Status Code</p>
                    <p className={`text-2xl font-bold ${testResult.status >= 200 && testResult.status < 300 ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status Text</p>
                    <p className="text-gray-800 font-semibold">{testResult.statusText}</p>
                  </div>
                </div>

                {testResult.error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <strong>Error:</strong> {testResult.error}
                  </div>
                )}

                {testResult.data !== null && (
                  <div>
                    <p className="text-gray-600 text-sm mb-2">Response Body</p>
                    <pre className="bg-gray-900 border border-gray-300 rounded-lg p-4 text-green-400 overflow-x-auto max-h-64">
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
