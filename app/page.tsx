'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';

// --- Interfaces for Type Safety ---
interface ApiEntry {
  API: string;
  Description: string;
  Link: string;
  Category: string;
  Auth: string;
  Cors: string;
  HTTPS: boolean;
}

interface ScrapedData {
  overview?: string;
  examples?: string[];
  requirements?: string[];
  isRestApi?: boolean;
  error?: string;
}

interface ApiDetails extends ApiEntry {
  scraped: ScrapedData;
}

interface ApiCardProps {
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
  category: string;
  link: string;
  auth: string;
  onClick?: () => void;
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'filter';
  isActive?: boolean;
  className?: string;
}

// --- Helper Function ---
const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// --- Reusable UI Components ---

const Button = ({ children, onClick, variant = 'primary', isActive = false, className = '' }: ButtonProps) => {
  const getStyles = () => {
    if (variant === 'filter') {
      return {
        backgroundColor: isActive ? '#4F46E5' : '#374151',
        color: '#FFFFFF',
        border: isActive ? '2px solid #6366F1' : '2px solid transparent',
      };
    }
    if (variant === 'secondary') {
      return {
        backgroundColor: '#374151',
        color: '#FFFFFF',
        border: '1px solid #4B5563',
      };
    }
    return {
      backgroundColor: '#4F46E5',
      color: '#FFFFFF',
      border: 'none',
    };
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 ${className}`}
      style={getStyles()}
    >
      {children}
    </button>
  );
};

const ApiCard = ({ title, description, tags, featured, category, link, auth, onClick }: ApiCardProps) => (
  <div
    onClick={onClick}
    className={`rounded-lg shadow-lg p-6 h-full flex flex-col transition hover:shadow-xl cursor-pointer`}
    style={{
      backgroundColor: '#1F2937',
      border: featured ? '2px solid #4F46E5' : '1px solid #374151',
      transform: featured ? 'scale(1.02)' : 'scale(1)',
    }}
  >
    <h3 className={`${featured ? 'text-xl' : 'text-lg'} font-semibold mb-2 text-white`}>
      {title}
    </h3>
    <p className={`mb-3 flex-grow ${featured ? 'text-base' : 'text-sm'} text-gray-300`}>
      {description}
    </p>
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.filter(tag => tag).map((tag) => (
        <span
          key={tag}
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: '#374151',
            color: '#D1D5DB'
          }}
        >
          {tag}
        </span>
      ))}
    </div>
    <div className="mt-4 flex justify-between items-center">
      <span
        className="text-xs font-medium px-3 py-1 rounded"
        style={{
          backgroundColor: '#4F46E5',
          color: '#FFFFFF'
        }}
      >
        {category}
      </span>
      <a
        href={link}
        onClick={(e) => e.stopPropagation()}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm hover:underline"
        style={{ color: '#818CF8' }}
      >
        View Docs
      </a>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
  </div>
);

const InfoMessage = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="text-xl text-gray-300">{message}</div>
  </div>
);

// --- Featured APIs Constant ---
const FEATURED_APIS = [
  {
    API: "HaveIBeenPwned",
    Description: "Passwords which have previously been exposed in data breaches",
    Category: "Security",
    Link: "https://haveibeenpwned.com/API/v3#PwnedPasswords",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["security", "breaches", "passwords"]
  },
  {
    API: "VirusTotal",
    Description: "Analyze suspicious files, URLs, IP addresses, and domains to detect malware and cyber threats",
    Category: "Security",
    Link: "https://developers.virustotal.com/reference",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["security", "malware", "threat-detection"]
  },
  {
    API: "Bitly",
    Description: "URL shortening and link management platform with detailed analytics",
    Category: "URL Shortener",
    Link: "https://dev.bitly.com/",
    Auth: "OAuth",
    Cors: "yes",
    tags: ["url", "analytics", "links"]
  },
  {
    API: "QR code",
    Description: "Create an easy to read QR code and URL shortener",
    Auth: "",
    HTTPS: true,
    Cors: "yes",
    Link: "https://www.qrtag.net/api/",
    Category: "Development",
    tags: ["qr", "generator", "scanning"]
  },
  {
    API: "Shodan",
    Description: "Search engine for Internet-connected devices and cyber security intelligence",
    Category: "Security",
    Link: "https://developer.shodan.io/api",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["security", "devices", "scanning"]
  },
  {
    API: "Abstract Email Validation",
    Description: "Verify email address validity and detect disposable email providers",
    Category: "Validation",
    Link: "https://www.abstractapi.com/email-verification-validation-api",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["email", "validation", "verification"]
  },
];

// --- Landing Page Component ---
function LandingPage({ onApiSelect }: { onApiSelect: (apiId: string) => void }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ApiEntry[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadApis = async () => {
      try {
        const response = await fetch('/apis.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.entries) {
          setApis(data.entries);
          const uniqueCategories = [...new Set(data.entries.map((api: ApiEntry) => api.Category))] as string[];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error loading APIs:', error);
        setApis([]);
      } finally {
        setLoading(false);
      }
    };
    loadApis();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim()) {
      const filtered = apis
        .filter(api => {
          const searchLower = value.toLowerCase();
          return (
            api.API.toLowerCase().includes(searchLower) ||
            api.Description.toLowerCase().includes(searchLower) ||
            api.Category.toLowerCase().includes(searchLower)
          );
        })
        .slice(0, 8);

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (api: ApiEntry) => {
    setSearchQuery('');
    setShowSuggestions(false);
    onApiSelect(slugify(api.API));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      if (!selectedTags.includes(trimmedQuery)) {
        setSelectedTags(prev => [...prev, trimmedQuery]);
      }
      setSearchQuery('');
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const filteredApis = apis.filter(api => {
    if (selectedTags.length === 0) {
      return true;
    }

    return selectedTags.some(tag => {
      const tagLower = tag.toLowerCase();
      return (
        api.API.toLowerCase().includes(tagLower) ||
        api.Description.toLowerCase().includes(tagLower) ||
        api.Category.toLowerCase().includes(tagLower)
      );
    });
  });

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 9);

  const featureCards = [
    {
      title: "Discover APIs",
      description: "Browse through hundreds of APIs across multiple categories. Find the perfect API for your project with our comprehensive search and filtering system.",
      image: "/slide1.png"
    },
    {
      title: "Test & Integrate",
      description: "Test APIs directly in our playground, view detailed documentation, and integrate seamlessly into your applications with code examples and guides.",
      image: "slide2.png"
    },
    {
      title: "Secure & Reliable",
      description: "Access secure APIs with proper authentication, CORS support, and HTTPS encryption. All APIs are verified and regularly updated for reliability.",
      image: "slide3.png"
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
              {/* <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" /> */}
            </div>
            <span className="text-2xl font-bold text-gray-800">API Store</span>
          </div>
          <div className="flex items-center gap-4">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button
                  onClick={() => router.push('/submit-api')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Submit API
                </button>
                <button
                  onClick={async () => {
                    try {
                      await auth.signOut();
                      router.push('/');
                    } catch (error) {
                      console.error('Logout error:', error);
                    }
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-red-600 text-red-600 font-semibold hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => router.push('/sign-in')}
                  className="px-4 py-2 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push('/sign-in')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="space-y-6">
            <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold">
              API Store - Where APIs Meet Developers
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 leading-tight">
              Develop, test, manage and consume APIs{' '}
              <span className="text-orange-500">securely and effortlessly.</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              API Store empowers developers with everything they need to build, share, and integrate APIs, from sandbox testing to real-time analytics.
            </p>
            <div className="flex items-center gap-6 pt-4">
              <a
                href="#apis"
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 border-b-2 border-blue-600 pb-1 transition-colors"
              >
                Explore →
              </a>
              <a
                href="#apis"
                className="text-lg font-semibold text-orange-500 hover:text-orange-600 border-b-2 border-orange-500 pb-1 transition-colors"
              >
                Get Started →
              </a>
            </div>
          </div>

          {/* Right Side - Illustration Placeholder */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-orange-100 rounded-2xl p-8 shadow-xl">
              <div className="aspect-square bg-white rounded-xl flex items-center justify-center border-4 border-blue-600">
                <div className="text-center">
                  <div className="text-6xl mb-4">💻</div>
                  <div className="text-2xl font-bold text-gray-800">&lt;API&gt;</div>
                  <button
                    onClick={() => router.push('/submit-api')}
                    className="mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold inline-block transition-colors"
                  >
                    SUBMIT API
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 bg-white/50">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold mb-4">
            What Makes Us Reliable
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800">
            Reliable APIs That Power Everyone , From Startups to Enterprises
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {featureCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100"
            >
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* APIs Section */}
      <section id="apis" className="max-w-7xl mx-auto px-6 py-16 bg-white">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Explore Our API Collection
          </h2>
          <p className="text-xl text-gray-600">
            Discover and integrate powerful APIs for your next project
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col gap-6 items-center">
          <div className="w-full max-w-lg relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search APIs... (Press Enter to add as filter)"
                className="w-full px-4 py-3 rounded-lg text-lg bg-gray-50 text-gray-800 placeholder-gray-500 border border-gray-300 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchQuery.trim() && suggestions.length > 0 && setShowSuggestions(true)}
              />
              
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl overflow-hidden z-50 bg-white border border-gray-200"
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {suggestions.map((api) => (
                    <div
                      key={api.API}
                      className="px-4 py-3 cursor-pointer transition-colors border-b border-gray-200 hover:bg-gray-50"
                      onClick={() => handleSuggestionClick(api)}
                    >
                      <div className="font-semibold text-gray-800">
                        {api.API}
                      </div>
                      <div className="text-sm text-gray-600">
                        {api.Description.length > 80 
                          ? api.Description.substring(0, 80) + '...' 
                          : api.Description}
                      </div>
                      <div className="text-xs mt-1">
                        <span
                          className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white"
                        >
                          {api.Category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-blue-600 text-white"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:opacity-75 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-full max-w-4xl">
            <div className="flex flex-wrap gap-2 justify-center">
              {displayedCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleTagToggle(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedTags.includes(category)
                      ? 'bg-blue-600 text-white border-2 border-blue-700'
                      : 'bg-gray-200 text-gray-700 border-2 border-transparent hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
              {categories.length > 9 && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 border-2 border-transparent hover:bg-gray-300 transition-all"
                >
                  {showAllCategories ? 'Show Less' : '...'}
                </button>
              )}
            </div>
          </div>
          {!loading && (
            <div className="w-full text-center mt-4">
              <p className="text-lg font-semibold text-gray-700">
                {filteredApis.length} {filteredApis.length === 1 ? 'API' : 'APIs'} found
              </p>
            </div>
          )}
        </div>

        {/* API Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredApis.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              No APIs found matching your filters. Try different search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApis.map((api) => (
              <div
                key={api.API}
                onClick={() => onApiSelect(slugify(api.API))}
                className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col transition hover:shadow-xl cursor-pointer border border-gray-200"
              >
                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                  {api.API}
                </h3>
                <p className="mb-3 flex-grow text-sm text-gray-600">
                  {api.Description}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[api.Auth, `CORS: ${api.Cors}`, api.HTTPS ? 'HTTPS' : 'HTTP'].filter(tag => tag).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span
                    className="text-xs font-medium px-3 py-1 rounded bg-blue-600 text-white"
                  >
                    {api.Category}
                  </span>
                  <a
                    href={api.Link}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline text-blue-600"
                  >
                    View Docs
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; 2024 API Store. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

// --- Page Components ---

function ApiDetailsPage({ apiId, onBackToHome }: { apiId: string; onBackToHome: () => void }) {
  const [apiDetails, setApiDetails] = useState<ApiDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiId) return;

    const fetchApiDetails = async () => {
      setLoading(true);
      setScrapingError(null);
      try {
        const response = await fetch('/apis.json');
        const data = await response.json();
        const api = data.entries.find(
          (entry: ApiEntry) => slugify(entry.API) === apiId
        );

        if (api) {
          try {
            const docResponse = await fetch(`/api/scrape?url=${encodeURIComponent(api.Link)}`);
            const scrapedData: ScrapedData = await docResponse.json();
            
            if (scrapedData.error) {
              setScrapingError(scrapedData.error);
            }
            
            setApiDetails({ ...api, scraped: scrapedData });
          } catch (scrapeError) {
            console.error('Scraping failed:', scrapeError);
            setScrapingError('Unable to fetch additional details');
            setApiDetails({ 
              ...api, 
              scraped: { 
                overview: 'Unable to fetch documentation. Please visit the official link.',
                examples: [],
                requirements: [],
                isRestApi: false
              } 
            });
          }
        } else {
          setApiDetails(null);
        }
      } catch (error) {
        console.error('Error fetching API details:', error);
        setApiDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchApiDetails();
  }, [apiId]);

  const handlePlaygroundTest = async (password: string) => {
    setPlaygroundLoading(true);
    setPlaygroundError(null);
    setPlaygroundResult(null);

    try {
      const response = await fetch('/api/haveibeenpwned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      setPlaygroundResult(data);
    } catch (error) {
      console.error('Playground test error:', error);
      setPlaygroundError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setPlaygroundLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!apiDetails) return <InfoMessage message="API not found" />;

  return (
    <main className="min-h-screen py-12 px-4 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBackToHome}
            className="text-lg hover:underline mb-6 block text-indigo-400"
          >
            ← Back to All APIs
          </button>
          <h1 className="text-5xl font-bold mb-4 text-white">
            {apiDetails.API}
          </h1>
          <p className="text-xl mb-4 text-gray-300">
            {apiDetails.Description}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-indigo-600 text-white">{apiDetails.Category}</span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-200">Auth: {apiDetails.Auth || 'None'}</span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-200">CORS: {apiDetails.Cors}</span>
            {apiDetails.HTTPS && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white">HTTPS</span>
            )}
            {apiDetails.scraped.isRestApi && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">REST API</span>
            )}
          </div>
        </div>

        {scrapingError && (
          <div className="mb-6 p-4 rounded-lg bg-red-900 text-white">
            <p className="text-sm">⚠️ {scrapingError}</p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-indigo-600 text-indigo-400">Documentation & Overview</h2>
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <a href={apiDetails.Link} target="_blank" rel="noopener noreferrer" className="text-lg hover:underline font-semibold text-indigo-400">
              View Official Documentation →
            </a>
            {apiDetails.scraped.overview && (
              <div className="mt-4 text-gray-300">
                <h3 className="font-semibold mb-2 text-white">Overview</h3>
                <p className="leading-relaxed">{apiDetails.scraped.overview}</p>
              </div>
            )}
          </div>
        </section>

        {apiDetails.scraped.examples && apiDetails.scraped.examples.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-indigo-600 text-indigo-400">Example Usage</h2>
            <div className="bg-gray-950 rounded-lg p-4 shadow-lg">
              {apiDetails.scraped.examples.map((example, index) => (
                <pre key={index} className="mb-4 p-4 rounded bg-gray-900 overflow-x-auto text-sm text-gray-300">
                  <code>{example}</code>
                </pre>
              ))}
            </div>
          </section>
        )}

        {apiDetails.scraped.requirements && apiDetails.scraped.requirements.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-indigo-600 text-indigo-400">Requirements / Features</h2>
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {apiDetails.scraped.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Have I Been Pwned Playground */}
        {apiDetails.API === 'HaveIBeenPwned' && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-indigo-600 text-indigo-400">API Playground</h2>
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Test Password Security</h3>
                <p className="text-gray-300 mb-4">
                  Enter a password to check if it has been exposed in data breaches. Your password is never sent in full - only a partial hash is used for the check.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password to test:
                    </label>
                    <input
                      type="password"
                      id="passwordInput"
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter password to test"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        const passwordInput = document.getElementById('passwordInput') as HTMLInputElement;
                        if (passwordInput.value.trim()) {
                          handlePlaygroundTest(passwordInput.value.trim());
                        }
                      }}
                      disabled={playgroundLoading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {playgroundLoading ? 'Testing...' : 'Test Password'}
                    </button>
                  </div>
                </div>
              </div>

              {playgroundError && (
                <div className="mb-4 p-4 rounded-lg bg-red-900 text-white">
                  <p className="text-sm">❌ {playgroundError}</p>
                </div>
              )}

              {playgroundResult && (
                <div className={`p-4 rounded-lg ${playgroundResult.status === 'safe' ? 'bg-green-900' : 'bg-red-900'} text-white`}>
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">
                      {playgroundResult.status === 'safe' ? '✅' : '⚠️'}
                    </span>
                    <span className="font-semibold">
                      {playgroundResult.status === 'safe' ? 'Safe' : 'Compromised'}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{playgroundResult.message}</p>
                  {playgroundResult.breachCount && (
                    <p className="text-sm">
                      Found in {playgroundResult.breachCount} data breach{playgroundResult.breachCount !== 1 ? 'es' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiId = searchParams.get('api');

  const handleApiSelect = (selectedApiId: string) => {
    router.push(`/?api=${selectedApiId}`);
    window.scrollTo(0, 0);
  };

  const handleBackToHome = () => {
    router.push('/');
    window.scrollTo(0, 0);
  };

  if (apiId) {
    return <ApiDetailsPage apiId={apiId} onBackToHome={handleBackToHome} />;
  }

  return <LandingPage onApiSelect={handleApiSelect} />;
}