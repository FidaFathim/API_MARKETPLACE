'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';

interface ApiEntry {
  API: string;
  Description: string;
  Link: string;
  Category: string;
  Auth: string;
  Cors: string;
  HTTPS: boolean;
  userId?: string;
  submittedAt?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  githubLink?: string;
  displayName?: string;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittedApis, setSubmittedApis] = useState<ApiEntry[]>([]);
  const [githubLink, setGithubLink] = useState('');
  const [editingGithub, setEditingGithub] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'submitted' | 'wishlist' | 'cart' | 'orders'>('submitted');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [wishlistApis, setWishlistApis] = useState<ApiEntry[]>([]);
  const [cartApis, setCartApis] = useState<ApiEntry[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User'
        });
        fetchUserProfile(currentUser.uid);
        fetchUserApis(currentUser.uid);
        loadUserDashboardData();
      } else {
        router.push('/sign-in');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.githubLink) {
          setGithubLink(data.githubLink);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserApis = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/apis?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubmittedApis(data.apis || []);
      }
    } catch (error) {
      console.error('Error fetching user APIs:', error);
    }
  };

  const loadUserDashboardData = async () => {
    try {
      // Load APIs
      const apisResponse = await fetch('/apis.json');
      if (apisResponse.ok) {
        const apisData = await apisResponse.json();
        setApis(apisData.entries || []);
      }

      // Load wishlist from localStorage
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        const wishlistArray = JSON.parse(savedWishlist);
        setWishlist(wishlistArray);
      }

      // Load cart from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const cartArray = JSON.parse(savedCart);
        setCart(cartArray);
      }

      // Load orders from localStorage
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        const ordersArray = JSON.parse(savedOrders);
        setOrders(ordersArray);
      } else {
        // Sample orders
        const sampleOrders = [
          {
            id: 'ORD-001',
            date: '2024-01-15',
            total: 29.97,
            items: ['Cat Facts API', 'Dog Pics API', 'Weather API'],
            status: 'completed'
          }
        ];
        setOrders(sampleOrders);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    // Filter APIs that are in wishlist
    if (apis.length > 0 && wishlist.length > 0) {
      const filtered = apis.filter(api => wishlist.includes(api.API.toLowerCase().replace(/\s+/g, '-')));
      setWishlistApis(filtered);
    } else {
      setWishlistApis([]);
    }

    // Filter APIs that are in cart
    if (apis.length > 0 && cart.length > 0) {
      const filtered = apis.filter(api => cart.includes(api.API.toLowerCase().replace(/\s+/g, '-')));
      setCartApis(filtered);
    } else {
      setCartApis([]);
    }
  }, [apis, wishlist, cart]);

  const handleRemoveFromWishlist = (apiId: string) => {
    const newWishlist = wishlist.filter(id => id !== apiId);
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  const handleRemoveFromCart = (apiId: string) => {
    const newCart = cart.filter(id => id !== apiId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const saveGithubLink = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          githubLink: githubLink.trim()
        }),
      });

      if (response.ok) {
        setEditingGithub(false);
      }
    } catch (error) {
      console.error('Error saving GitHub link:', error);
    } finally {
      setSaving(false);
    }
  };

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Profile Dashboard</h1>
          </div>
          <button
            onClick={() => router.push('/submit-api')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
          >
            Submit API
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* User Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8 shadow-lg">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{user.displayName || 'User'}</h2>
              <p className="text-gray-600 mb-4">{user.email}</p>

              {/* GitHub Link Section */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-700 font-semibold">GitHub:</span>
                  {editingGithub ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="url"
                        value={githubLink}
                        onChange={(e) => setGithubLink(e.target.value)}
                        placeholder="https://github.com/username"
                        className="flex-1 px-3 py-1 bg-gray-50 border border-gray-300 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={saveGithubLink}
                        disabled={saving}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm transition"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingGithub(false);
                          fetchUserProfile(user.uid);
                        }}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {githubLink ? (
                        <a
                          href={githubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {githubLink.replace('https://github.com/', '')}
                        </a>
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                      <button
                        onClick={() => setEditingGithub(true)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm transition"
                      >
                        {githubLink ? 'Edit' : 'Add'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="px-3 py-1 bg-gray-100 rounded text-gray-700">
                  {submittedApis.length} API{submittedApis.length !== 1 ? 's' : ''} Submitted
                </div>
                <div className="px-3 py-1 bg-gray-100 rounded text-gray-700">
                  Member since {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 mb-8 shadow-lg">
          <div className="flex gap-1">
            {[
              { id: 'submitted' as const, label: 'Submitted APIs', icon: '📤' },
              { id: 'wishlist' as const, label: 'Wishlist', icon: '❤️', count: wishlist.length },
              { id: 'cart' as const, label: 'Cart', icon: '🛒', count: cart.length },
              { id: 'orders' as const, label: 'My Orders', icon: '📦', count: orders.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 bg-opacity-20 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'submitted' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Your Submitted APIs</h3>
            {submittedApis.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">You haven't submitted any APIs yet</div>
                <button
                  onClick={() => router.push('/submit-api')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  Submit Your First API
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {submittedApis.map((api) => (
                  <div
                    key={api.API}
                    className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-800">{api.API}</h4>
                      <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                        Owner
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{api.Description}</p>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        {api.Category}
                      </span>
                      <a
                        href={api.Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                      >
                        View Docs →
                      </a>
                    </div>
                    {api.submittedAt && (
                      <div className="mt-3 text-xs text-gray-500">
                        Submitted {new Date(api.submittedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Your Wishlist</h3>
            {wishlistApis.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">Your wishlist is empty</div>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  Explore APIs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistApis.map((api) => {
                  const apiId = api.API.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <div
                      key={api.API}
                      className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-800">{api.API}</h4>
                        <button
                          onClick={() => handleRemoveFromWishlist(apiId)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{api.Description}</p>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          {api.Category}
                        </span>
                        <a
                          href={api.Link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                        >
                          View Docs →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Your Cart</h3>
            {cartApis.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">Your cart is empty</div>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  Explore APIs
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {cartApis.map((api) => {
                    const apiId = api.API.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <div
                        key={api.API}
                        className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-blue-400 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-lg font-semibold text-gray-800">{api.API}</h4>
                          <button
                            onClick={() => handleRemoveFromCart(apiId)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{api.Description}</p>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                            {api.Category}
                          </span>
                          <a
                            href={api.Link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                          >
                            View Docs →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-gray-800">Total:</span>
                    <span className="text-lg font-semibold text-gray-800">₹{(cartApis.length * 9.99).toFixed(2)}</span>
                  </div>
                  <button className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold">
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-6">My Orders</h3>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">You haven't placed any orders yet</div>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  Explore APIs
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-6 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{order.id}</h4>
                        <p className="text-gray-600 text-sm">
                          {new Date(order.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                          {order.status}
                        </span>
                        <span className="text-lg font-semibold text-gray-800">
                          ₹{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Items:</h5>
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
