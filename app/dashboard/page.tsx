'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface UserData {
    email: string;
    earnings: number;
    purchasedAPIs: string[];
    credits: number;
}

interface ApiData {
    id: string;
    API: string;
    Description: string;
    price: number;
    isPaid: boolean;
    endpoint?: string;
}

interface Transaction {
    id: string;
    apiName: string;
    amount: number;
    buyerEmail: string;
    createdAt: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [publishedAPIs, setPublishedAPIs] = useState<ApiData[]>([]);
    const [purchasedAPIs, setPurchasedAPIs] = useState<ApiData[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/sign-in');
            } else {
                setUser(currentUser);
            }
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const db = getFirestore();

                // Fetch user data
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data() as UserData;
                    setUserData(data);

                    // Fetch purchased APIs
                    if (data.purchasedAPIs && data.purchasedAPIs.length > 0) {
                        const purchasedPromises = data.purchasedAPIs.map(apiId =>
                            getDoc(doc(db, 'apis', apiId))
                        );
                        const purchasedDocs = await Promise.all(purchasedPromises);
                        const purchased = purchasedDocs
                            .filter(d => d.exists())
                            .map(d => ({ id: d.id, ...d.data() } as ApiData));
                        setPurchasedAPIs(purchased);
                    }
                }

                // Fetch published APIs
                const publishedQuery = query(
                    collection(db, 'apis'),
                    where('userId', '==', user.uid)
                );
                const publishedSnapshot = await getDocs(publishedQuery);
                const published = publishedSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                } as ApiData));
                setPublishedAPIs(published);

                // Fetch transactions (sales of user's APIs)
                const transactionsQuery = query(
                    collection(db, 'transactions'),
                    where('sellerId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const transactionsSnapshot = await getDocs(transactionsQuery);
                const txns = transactionsSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                } as Transaction));
                setTransactions(txns);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-800 text-2xl mb-4">Loading Dashboard...</div>
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Developer Dashboard</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                                <p className="text-3xl font-bold text-green-600">
                                    ₹{((userData?.earnings || 0) / 100).toFixed(2)}
                                </p>
                            </div>
                            <div className="text-4xl">💰</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">APIs Published</p>
                                <p className="text-3xl font-bold text-blue-600">{publishedAPIs.length}</p>
                            </div>
                            <div className="text-4xl">📦</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">APIs Purchased</p>
                                <p className="text-3xl font-bold text-purple-600">{purchasedAPIs.length}</p>
                            </div>
                            <div className="text-4xl">🛒</div>
                        </div>
                    </div>
                </div>

                {/* Published APIs */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Your Published APIs</h2>
                    {publishedAPIs.length === 0 ? (
                        <p className="text-gray-600">You haven't published any APIs yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {publishedAPIs.map(api => (
                                <div key={api.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{api.API}</h3>
                                            <p className="text-sm text-gray-600">{api.Description}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            {api.isPaid ? (
                                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                                                    ₹{(api.price).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded font-medium">
                                                    FREE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Transaction History */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Sales</h2>
                    {transactions.length === 0 ? (
                        <p className="text-gray-600">No sales yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">API</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Buyer</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(txn => (
                                        <tr key={txn.id} className="border-b border-gray-100">
                                            <td className="py-3 px-4 text-sm text-gray-800">{txn.apiName}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{txn.buyerEmail}</td>
                                            <td className="py-3 px-4 text-sm font-semibold text-green-600">
                                                ₹{(txn.amount / 100).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {new Date(txn.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Purchased APIs */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Your Purchased APIs</h2>
                    {purchasedAPIs.length === 0 ? (
                        <p className="text-gray-600">You haven't purchased any APIs yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {purchasedAPIs.map(api => (
                                <div key={api.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{api.API}</h3>
                                            <p className="text-sm text-gray-600">{api.Description}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                                            ✓ Purchased
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 rounded border border-gray-200 p-3">
                                        <p className="text-xs text-gray-600 mb-1">Endpoint:</p>
                                        <code className="text-xs text-blue-600 break-all">{api.endpoint}</code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
