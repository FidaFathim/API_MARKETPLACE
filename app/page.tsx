'use client';

import { useState, useEffect } from 'react';

interface ApiData {
  API: string;
  Description: string;
  Category: string;
  Link: string;
  Auth: string;
  HTTPS: boolean;
  Cors: string;
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
    className={`rounded-lg shadow-md p-8 mb-6 bg-white border transition hover:shadow-lg`}
    style={{ 
      minWidth: featured ? 300 : 260, 
      maxWidth: featured ? 400 : 340,
      backgroundColor: '#FFFFEA',
      borderColor: featured ? '#00CECB' : '#D8D8D8',
      transform: featured ? 'scale(1.05)' : 'scale(1)'
    }}
  >
    <h3 className={`${featured ? 'text-2xl' : 'text-xl'} font-semibold mb-2`} 
        style={{ color: '#171717' }}>
      {title}
    </h3>
    <p className={`mb-3 ${featured ? 'text-base' : 'text-sm'}`} 
       style={{ color: '#171717' }}>
      {description}
    </p>
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.map((tag) => (
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
    <div className="mt-3 flex justify-between items-center">
      <span 
        className="text-xs font-medium px-2 py-1 rounded"
        style={{ 
          backgroundColor: '#00CECB',
          color: '#FFFFEA'
        }}
      >
        {category}
      </span>
      {auth && (
        <span 
          className="text-xs px-2 py-1 rounded"
          style={{ 
            backgroundColor: '#FF5E5B',
            color: '#FFFFEA'
          }}
        >
          {auth}
        </span>
      )}
    </div>
    <a 
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 text-sm block hover:underline"
      style={{ color: '#00CECB' }}
    >
      View Documentation →
    </a>
  </div>
);

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [apis, setApis] = useState<ApiData[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  
  const handleSignIn = () => {
    // In a real Next.js app with router: router.push('/sign-in')
    // For production use:
    window.location.href = '/sign-in';
  };
  
  useEffect(() => {
    const loadApis = async () => {
      try {
        // Update path to load from public folder
        const response = await fetch('/apis.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.entries) {
          setApis(data.entries);
          const uniqueCategories = ['All', ...new Set(data.entries.map((api: ApiData) => api.Category))] as string[];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error loading APIs:', error);
        setApis([]);
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

  const featuredApis = filteredApis.slice(0, 3); // First 3 APIs as featured
  const generalApis = filteredApis.slice(3); // Rest of the APIs

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#FFFFEA' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button onClick={handleSignIn} className="px-6">
            Sign In
          </Button>
        </div>

        <header className="mb-12 text-center">
          <h1 className="text-6xl font-bold mb-4" style={{ color: '#FF5E5B' }}>API STORE</h1>
          <p className="text-xl" style={{ color: '#171717' }}>
            Discover, explore, and integrate powerful APIs for your next project.
          </p>
        </header>
        
        <div className="mb-8 flex flex-col gap-6 items-center">
          <input
            type="text"
            placeholder="Search APIs..."
            className="w-full max-w-lg px-4 py-2 rounded-lg"
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

        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#00CECB' }}>
            Featured APIs
          </h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {featuredApis.map((api) => (
              <ApiCard
                key={api.API}
                title={api.API}
                description={api.Description}
                tags={[api.Auth, api.Cors, api.HTTPS ? 'HTTPS' : 'HTTP']}
                category={api.Category}
                link={api.Link}
                auth={api.Auth}
                featured
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#00CECB' }}>
            All APIs
          </h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {generalApis.map((api) => (
              <ApiCard
                key={api.API}
                title={api.API}
                description={api.Description}
                tags={[api.Auth, api.Cors, api.HTTPS ? 'HTTPS' : 'HTTP']}
                category={api.Category}
                link={api.Link}
                auth={api.Auth}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}