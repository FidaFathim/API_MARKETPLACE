'use client';

import { useState, useEffect } from 'react';
import { getPendingAPIs, approveAPI, deleteAPI } from './actions';

interface PendingAPI {
    id: string;
    API: string;
    Description: string;
    Category: string;
    Link: string;
    submittedAt?: string;
    userId?: string;
    submitterUsername?: string;
    isPaid?: boolean;
    price?: number;
    securityRiskLevel?: string;
    securityReport?: {
        checks?: { name: string; status: string; detail: string }[];
        virusTotalStats?: { malicious: number; suspicious: number; harmless: number; permalink: string };
        riskLevel?: string;
    };
}

export default function AdminDashboard() {
    const [apis, setApis] = useState<PendingAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAPIs();
    }, []);

    async function loadAPIs() {
        setLoading(true);
        setError('');
        try {
            const pending: any = await getPendingAPIs();
            setApis(pending);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load pending APIs. You might not have the correct permissions.');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id: string) {
        if (!confirm('Are you sure you want to approve this API for the marketplace?')) return;
        try {
            await approveAPI(id);
            await loadAPIs();
        } catch (e) {
            alert('Failed to approve API');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Reject and permanently delete this API?')) return;
        try {
            await deleteAPI(id);
            await loadAPIs();
        } catch (e) {
            alert('Failed to delete API');
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Pending API Submissions</h1>
                <button
                    onClick={loadAPIs}
                    className="text-sm px-4 py-2 bg-gray-200 hover:bg-gray-300 transition text-gray-800 rounded font-semibold"
                >
                    ↻ Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            ) : apis.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                    <div className="text-4xl mb-4">🎉</div>
                    <h2 className="text-xl font-semibold text-gray-700">All caught up!</h2>
                    <p className="text-gray-500 mt-2">There are no pending API submissions to review.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {apis.map((api) => (
                        <div key={api.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                    <h3 className="text-xl font-bold text-gray-900">{api.API}</h3>
                                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full uppercase tracking-wider">
                                        Pending Review
                                    </span>
                                </div>

                                <p className="text-gray-600">{api.Description}</p>

                                <div className="flex flex-wrap gap-4 text-sm mt-4">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-500">Category:</span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">{api.Category}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-500">Pricing:</span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                            {api.isPaid ? `₹${api.price} (Paid)` : 'Free'}
                                        </span>
                                    </div>
                                    {api.submittedAt && (
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <span className="font-semibold">Submitted:</span>
                                            {new Date(api.submittedAt).toLocaleDateString()}
                                        </div>
                                    )}
                                    {api.submitterUsername && (
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-gray-500">Submitted by:</span>
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">@{api.submitterUsername}</span>
                                        </div>
                                    )}
                                    {api.securityRiskLevel && (
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-gray-500">Security:</span>
                                            <span className={`px-2 py-1 rounded font-bold text-xs uppercase ${
                                                api.securityRiskLevel === 'critical' ? 'bg-red-600 text-white' :
                                                api.securityRiskLevel === 'high' ? 'bg-orange-500 text-white' :
                                                api.securityRiskLevel === 'medium' ? 'bg-yellow-400 text-white' :
                                                api.securityRiskLevel === 'low' ? 'bg-green-600 text-white' :
                                                'bg-gray-200 text-gray-600'
                                              }`}>
                                                {api.securityRiskLevel} risk
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2">
                                    <a href={api.Link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1">
                                        External Docs ↗
                                    </a>
                                </div>

                                {/* Security Scan Details */}
                                {api.securityReport?.checks && (
                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-800">
                                            🛡️ View Security Scan Details ({api.securityReport.checks.filter(c => c.status === 'fail').length} fails, {api.securityReport.checks.filter(c => c.status === 'warn').length} warnings)
                                        </summary>
                                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-200">
                                            {api.securityReport.checks.map((check, i) => (
                                                <div key={i} className="flex items-start gap-1.5 text-xs">
                                                    <span className="flex-shrink-0 mt-0.5">
                                                        {check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'warn' ? '⚠️' : '⏭️'}
                                                    </span>
                                                    <div>
                                                        <span className="font-semibold text-gray-700">{check.name}: </span>
                                                        <span className="text-gray-500">{check.detail}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {api.securityReport.virusTotalStats?.permalink && (
                                                <a href={api.securityReport.virusTotalStats.permalink} target="_blank" rel="noopener noreferrer"
                                                    className="inline-block text-xs text-indigo-600 hover:underline mt-1">
                                                    Full VirusTotal Report ↗
                                                </a>
                                            )}
                                        </div>
                                    </details>
                                )}
                            </div>

                            <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                <button
                                    onClick={() => handleApprove(api.id)}
                                    className="flex-1 md:flex-none px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                                >
                                    ✓ Approve
                                </button>
                                <button
                                    onClick={() => handleDelete(api.id)}
                                    className="flex-1 md:flex-none px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition"
                                >
                                    ✗ Reject/Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
