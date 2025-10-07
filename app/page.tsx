'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
    API: "VirusTotal",
    Description: "Analyze suspicious files, URLs, IP addresses, and domains to detect malware and cyber threats",
    Category: "Security",
    Link: "https://developers.virustotal.com/reference",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["security", "malware", "threat-detection"]
  },
  {
    API: "OpenAI",
    Description: "Create AI models and integrate machine learning capabilities into your applications",
    Category: "AI/ML",
    Link: "https://platform.openai.com/docs/api-reference",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["ai", "machine-learning", "nlp"]
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
    API: "Abstract Geolocation",
    Description: "Locate and identify website visitors by IP address with detailed geographical data",
    Category: "Geolocation",
    Link: "https://www.abstractapi.com/ip-geolocation-api",
    Auth: "apiKey",
    Cors: "yes",
    tags: ["ip", "location", "geo"]
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

// --- Page Components ---

function ApiListPage({ onApiSelect }: { onApiSelect: (apiId: string) => void }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ApiEntry[]>([]);
  const scrollContainer = useRef<HTMLDivElement | null>(null);
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

    return selectedTags.every(tag => {
      const tagLower = tag.toLowerCase();
      return (
        api.API.toLowerCase().includes(tagLower) ||
        api.Description.toLowerCase().includes(tagLower) ||
        api.Category.toLowerCase().includes(tagLower)
      );
    });
  });

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 9);

  if (loading) return <LoadingSpinner />;

  return (
    <main className="min-h-screen py-12 px-4 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center relative">
          <div className="absolute top-0 right-0">
            <Button onClick={() => router.push('/sign-in')} variant="primary">
              Sign In
            </Button>
          </div>
          <h1 className="text-6xl font-bold mb-4 text-white tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            API STORE
          </h1>
          <p className="text-xl text-gray-300">
            Discover, explore, and integrate powerful APIs for your next project.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-6 items-center">
          <div className="w-full max-w-lg relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search APIs... (Press Enter to add as filter)"
                className="w-full px-4 py-3 rounded-lg text-lg bg-gray-800 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-600"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchQuery.trim() && suggestions.length > 0 && setShowSuggestions(true)}
              />
              
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl overflow-hidden z-50 bg-gray-800"
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #374151'
                  }}
                >
                  {suggestions.map((api) => (
                    <div
                      key={api.API}
                      className="px-4 py-3 cursor-pointer transition-colors border-b border-gray-700 hover:bg-gray-700"
                      onClick={() => handleSuggestionClick(api)}
                    >
                      <div className="font-semibold text-white">
                        {api.API}
                      </div>
                      <div className="text-sm text-gray-400">
                        {api.Description.length > 80 
                          ? api.Description.substring(0, 80) + '...' 
                          : api.Description}
                      </div>
                      <div className="text-xs mt-1">
                        <span
                          className="inline-block px-2 py-0.5 rounded bg-indigo-600 text-white"
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
                      className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 bg-indigo-600 text-white"
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
                <Button
                  key={category}
                  onClick={() => handleTagToggle(category)}
                  variant="filter"
                  isActive={selectedTags.includes(category)}
                >
                  {category}
                </Button>
              ))}
              {categories.length > 9 && (
                <Button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  variant="filter"
                  isActive={false}
                >
                  {showAllCategories ? 'Show Less' : '...'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <section className="mb-14 relative px-4">
          <h2 className="text-3xl font-semibold mb-8 text-indigo-400">
            Featured APIs
          </h2>
          
          <div className="relative">
            <button 
              className="absolute left-0 top-1/2 z-10 transform -translate-y-1/2 rounded-full p-3 shadow-lg bg-gray-700 text-white hover:bg-gray-600"
              onClick={() => {
                const container = scrollContainer.current;
                if (container) {
                  container.scrollBy({ left: -400, behavior: 'smooth' });
                }
              }}
            >
              ←
            </button>
            
            <button 
              className="absolute right-0 top-1/2 z-10 transform -translate-y-1/2 rounded-full p-3 shadow-lg bg-gray-700 text-white hover:bg-gray-600"
              onClick={() => {
                const container = scrollContainer.current;
                if (container) {
                  container.scrollBy({ left: 400, behavior: 'smooth' });
                }
              }}
            >
              →
            </button>

            <div 
              ref={scrollContainer}
              className="flex overflow-x-auto gap-8 pb-6 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'thin' }}
            >
              {FEATURED_APIS.map((api) => (
                <div
                  key={api.API}
                  className="flex-none snap-center"
                  onClick={() => onApiSelect(slugify(api.API))}
                >
                  <div 
                    className="p-6 rounded-xl shadow-lg h-full border-2 transition-all duration-300 hover:shadow-xl cursor-pointer bg-gray-800 border-indigo-600" 
                    style={{ 
                      minWidth: '340px',
                      minHeight: '280px',
                    }}>
                    <h3 className="text-2xl font-bold mb-3 text-white">
                      {api.API}
                    </h3>
                    <p className="text-base mb-4 text-gray-300">
                      {api.Description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {api.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span
                        className="px-3 py-1 rounded-lg text-sm font-medium bg-indigo-600 text-white"
                      >
                        {api.Category}
                      </span>
                      <span
                        className="px-3 py-1 rounded-lg text-sm bg-gray-700 text-gray-200"
                      >
                        {api.Auth}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-semibold mb-6 text-center text-indigo-400">
            All APIs {filteredApis.length > 0 && `(${filteredApis.length})`}
          </h2>
          {filteredApis.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-300">
                No APIs found matching your filters. Try different search terms.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApis.map((api) => (
                <ApiCard
                  key={api.API}
                  title={api.API}
                  description={api.Description}
                  tags={[api.Auth, `CORS: ${api.Cors}`, api.HTTPS ? 'HTTPS' : 'HTTP']}
                  category={api.Category}
                  link={api.Link}
                  auth={api.Auth}
                  onClick={() => onApiSelect(slugify(api.API))}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ApiDetailsPage({ apiId, onBackToHome }: { apiId: string; onBackToHome: () => void }) {
  const [apiDetails, setApiDetails] = useState<ApiDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

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
          <section>
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

  return <ApiListPage onApiSelect={handleApiSelect} />;
}