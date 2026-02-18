'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface ApiData {
    id: string;
    API: string;
    Description: string;
    price: number;
    isPaid: boolean;
}

function CheckoutForm({ apiData }: { apiData: ApiData }) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/checkout/success?apiId=${apiData.id}`,
                },
            });

            if (error) {
                setErrorMessage(error.message || 'Payment failed');
                setLoading(false);
            }
        } catch (err) {
            setErrorMessage('An unexpected error occurred');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
                <PaymentElement />
            </div>

            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
            >
                {loading ? 'Processing...' : `Pay ₹${(apiData.price).toFixed(2)}`}
            </button>

            <p className="text-sm text-gray-500 text-center">
                Test card: 4242 4242 4242 4242 | Any future date | Any CVC
            </p>
        </form>
    );
}

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const apiId = searchParams.get('apiId');

    const [user, setUser] = useState<any>(null);
    const [apiData, setApiData] = useState<ApiData | null>(null);
    const [clientSecret, setClientSecret] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

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
        if (!apiId || !user) return;

        const fetchApiAndCreateIntent = async () => {
            try {
                setLoading(true);
                const db = getFirestore();
                const apiDoc = await getDoc(doc(db, 'apis', apiId));

                if (!apiDoc.exists()) {
                    setError('API not found');
                    return;
                }

                const data = apiDoc.data() as ApiData;
                if (!data.isPaid) {
                    setError('This API is free');
                    return;
                }

                setApiData({ ...data, id: apiDoc.id });

                // Create payment intent
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiId: apiDoc.id,
                        amount: data.price * 100, // Convert to cents
                    }),
                });

                const { clientSecret: secret, error: intentError } = await response.json();

                if (intentError) {
                    setError(intentError);
                    return;
                }

                setClientSecret(secret);
            } catch (err) {
                console.error('Checkout error:', err);
                setError('Failed to initialize checkout');
            } finally {
                setLoading(false);
            }
        };

        fetchApiAndCreateIntent();
    }, [apiId, user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-800 text-2xl mb-4">Loading...</div>
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-md">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-gray-700 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!apiData || !clientSecret) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Checkout</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        ← Back
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{apiData.API}</h2>
                    <p className="text-gray-600 mb-4">{apiData.Description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-gray-700 font-semibold">Total:</span>
                        <span className="text-3xl font-bold text-blue-600">
                            ₹{(apiData.price).toFixed(2)}
                        </span>
                    </div>
                </div>

                <Elements
                    stripe={stripePromise}
                    options={{
                        clientSecret,
                        appearance: {
                            theme: 'stripe',
                            variables: {
                                colorPrimary: '#2563eb',
                            },
                        },
                    }}
                >
                    <CheckoutForm apiData={apiData} />
                </Elements>
            </div>
        </div>
    );
}
