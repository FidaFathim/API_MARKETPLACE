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
        backgroundColor: isActive ? '#00CECB' : '#FFED66',
        color: isActive ? '#FFFFEA' : '#171717',
      };
    }
    if (variant === 'secondary') {
      return {
        backgroundColor: '#FFED66',
        color: '#171717',
      };
    }
    return {
      backgroundColor: '#00CECB',
      color: '#FFFFEA',
    };
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 ${className}`}
      style={getStyles()}
    >
      {children}
    </button>
  );
};

const ApiCard = ({ title, description, tags, featured, category, link, auth }: ApiCardProps) => (
  <div
    className={`rounded-lg shadow-md p-6 h-full flex flex-col bg-white border transition hover:shadow-lg`}
    style={{
      backgroundColor: '#FFFFEA',
      borderColor: featured ? '#00CECB' : '#D8D8D8',
      transform: featured ? 'scale(1.02)' : 'scale(1)',
      borderWidth: featured ? '2px' : '1px'
    }}
  >
    <h3 className={`${featured ? 'text-xl' : 'text-lg'} font-semibold mb-2`}
      style={{ color: '#171717' }}>
      {title}
    </h3>
    <p className={`mb-3 flex-grow ${featured ? 'text-base' : 'text-sm'}`}
      style={{ color: '#171717' }}>
      {description}
    </p>
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.filter(tag => tag).map((tag) => (
        <span
          key={tag}
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: '#FFED66',
            color: '#171717'
          }}
        >
          {tag}
        </span>
      ))}
    </div>
    <div className="mt-4 flex justify-between items-center">
      <span
        className="text-xs font-medium px-2 py-1 rounded"
        style={{
          backgroundColor: '#00CECB',
          color: '#FFFFEA'
        }}
      >
        {category}
      </span>
      <a
        href={link}
        onClick={(e) => e.stopPropagation()}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm block hover:underline"
        style={{ color: '#00CECB' }}
      >
        View Docs
      </a>
    </div>
  </div>
);


const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFEA' }}>
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#00CECB' }}></div>
  </div>
);

const InfoMessage = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFEA' }}>
    <div className="text-xl" style={{ color: '#FF5E5B' }}>{message}</div>
  </div>
);

// --- Page Components ---

function ApiListPage({ onApiSelect }: { onApiSelect: (apiId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [apis, setApis] = useState<ApiEntry[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const scrollContainer = useRef<HTMLDivElement | null>(null);

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
          const uniqueCategories = ['All', ...new Set(data.entries.map((api: ApiEntry) => api.Category))] as string[];
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

  const filteredApis = apis.filter(api => {
    const matchesSearch =
      api.API.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.Category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || api.Category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredApis = filteredApis.slice(0, 3);
  const generalApis = filteredApis.slice(3);

  if (loading) return <LoadingSpinner />;

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#FFFFEA' }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-6xl font-bold mb-4" style={{ color: '#FF5E5B' }}>API STORE</h1>
          <p className="text-xl" style={{ color: '#171717' }}>
            Discover, explore, and integrate powerful APIs for your next project.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-6 items-center">
          <input
            type="text"
            placeholder="Search APIs by name, description, or category..."
            className="w-full max-w-lg px-4 py-3 rounded-lg text-lg"
            style={{
              backgroundColor: '#FFFFEA',
              border: '2px solid #00CECB',
              color: '#171717'
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant="filter"
                isActive={selectedCategory === category}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured APIs Section */}
        <section className="mb-14 relative px-4">
          <h2 className="text-3xl font-semibold mb-8" style={{ color: '#00CECB' }}>
            Featured APIs
          </h2>
          
          <div className="relative">
            <button 
              className="absolute left-0 top-1/2 z-10 transform -translate-y-1/2 rounded-full p-3 shadow-lg"
              onClick={() => {
                const container = scrollContainer.current;
                if (container) {
                  container.scrollBy({ left: -400, behavior: 'smooth' });
                }
              }}
              style={{ backgroundColor: '#FFED66' }}
            >
              ←
            </button>
            
            <button 
              className="absolute right-0 top-1/2 z-10 transform -translate-y-1/2 rounded-full p-3 shadow-lg"
              onClick={() => {
                const container = scrollContainer.current;
                if (container) {
                  container.scrollBy({ left: 400, behavior: 'smooth' });
                }
              }}
              style={{ backgroundColor: '#FFED66' }}
            >
              →
            </button>

            <div 
              ref={scrollContainer}
              className="featured-apis-container flex overflow-x-auto gap-8 pb-6 snap-x snap-mandatory"
            >
              {FEATURED_APIS.map((api) => (
                <div
                  key={api.API}
                  className="flex-none snap-center api-card-featured"
                  onClick={() => onApiSelect(slugify(api.API))}
                >
                  <div 
                    className="p-6 rounded-xl shadow-md h-full border-2 transition-all duration-300 hover:shadow-xl" 
                    style={{ 
                      backgroundColor: '#FFFFEA',
                      borderColor: '#00CECB',
                      minWidth: '340px',  // Reduced from 380px
                      minHeight: '280px', // Reduced from 300px
                    }}>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#171717' }}>
                      {api.API}
                    </h3>
                    <p className="text-base mb-4" style={{ color: '#171717' }}>
                      {api.Description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {api.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ backgroundColor: '#FFED66', color: '#171717' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span
                        className="px-3 py-1 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: '#00CECB', color: '#FFFFEA' }}
                      >
                        {api.Category}
                      </span>
                      <span
                        className="px-3 py-1 rounded-lg text-sm"
                        style={{ backgroundColor: '#FF5E5B', color: '#FFFFEA' }}
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
          <h2 className="text-3xl font-semibold mb-6 text-center" style={{ color: '#00CECB' }}>
            All APIs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generalApis.map((api) => (
              <a key={api.API} href={`#/${slugify(api.API)}`} className="block transform hover:-translate-y-1 transition-transform">
                <ApiCard
                  title={api.API}
                  description={api.Description}
                  tags={[api.Auth, `CORS: ${api.Cors}`, api.HTTPS ? 'HTTPS' : 'HTTP']}
                  category={api.Category}
                  link={api.Link}
                  auth={api.Auth}
                />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Renders the details page for a single, selected API.
 */
function ApiDetailsPage({ apiId, onBackToHome }: { apiId: string; onBackToHome: () => void }) {
  const [apiDetails, setApiDetails] = useState<ApiDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiId) return;

    const fetchApiDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch('/apis.json');
        const data = await response.json();
        const api = data.entries.find(
          (entry: ApiEntry) => slugify(entry.API) === apiId
        );

        if (api) {
          const docResponse = await fetch(`/api/scrape?url=${encodeURIComponent(api.Link)}`);
          if (!docResponse.ok) {
            throw new Error(`Scraping failed with status: ${docResponse.status}`);
          }
          const scrapedData: ScrapedData = await docResponse.json();
          setApiDetails({ ...api, scraped: scrapedData });
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
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#FFFFEA' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBackToHome}
            className="text-lg hover:underline mb-6 block"
            style={{ color: '#00CECB' }}
          >
            &larr; Back to All APIs
          </button>
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#FF5E5B' }}>
            {apiDetails.API}
          </h1>
          <p className="text-xl mb-4 text-gray-800">
            {apiDetails.Description}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#00CECB', color: '#FFFFEA' }}>{apiDetails.Category}</span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FFED66', color: '#171717' }}>Auth: {apiDetails.Auth || 'None'}</span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#D8D8D8', color: '#171717' }}>CORS: {apiDetails.Cors}</span>
            {apiDetails.scraped.isRestApi && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-200 text-green-800">REST API</span>
            )}
          </div>
        </div>

        {/* Rest of the content unchanged */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2" style={{ color: '#00CECB', borderColor: '#00CECB' }}>Documentation & Overview</h2>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <a href={apiDetails.Link} target="_blank" rel="noopener noreferrer" className="text-lg hover:underline font-semibold" style={{ color: '#FF5E5B' }}>
              View Official Documentation &rarr;
            </a>
            {apiDetails.scraped.overview && (
              <div className="mt-4 text-gray-700">
                <h3 className="font-semibold mb-2 text-gray-800">Scraped Overview</h3>
                <p className="leading-relaxed">{apiDetails.scraped.overview}</p>
              </div>
            )}
          </div>
        </section>

        {apiDetails.scraped.examples && apiDetails.scraped.examples.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2" style={{ color: '#00CECB', borderColor: '#00CECB' }}>Example Usage</h2>
            <div className="bg-gray-800 rounded-lg p-4 shadow-md text-white">
              {apiDetails.scraped.examples.map((example, index) => (
                <pre key={index} className="mb-4 p-4 rounded bg-gray-900 overflow-x-auto text-sm">
                  <code>{example}</code>
                </pre>
              ))}
            </div>
          </section>
        )}

        {apiDetails.scraped.requirements && apiDetails.scraped.requirements.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b-2 pb-2" style={{ color: '#00CECB', borderColor: '#00CECB' }}>Requirements / Features</h2>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
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

/**
 * The main component that decides which page to show.
 */
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

// Add this constant after your interfaces
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