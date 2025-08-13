
'use client';

import { useState } from 'react';

interface ApiCardProps {
  title: string;
  summary: string;
  tags: string[];
  featured?: boolean;
  category: string;
}

type Category = 'All' | 'Weather' | 'Finance' | 'Media' | 'Food' | 'Books';

const ApiCard = ({ title, summary, tags, featured, category }: ApiCardProps) => (
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
    <h3 className={`${featured ? 'text-2xl' : 'text-xl'} font-semibold mb-2`} style={{ color: '#171717' }}>{title}</h3>
    <p className={`mb-3 ${featured ? 'text-base' : 'text-sm'}`} style={{ color: '#171717' }}>{summary}</p>
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
    <div className="mt-3">
      <span 
        className="text-xs font-medium px-2 py-1 rounded"
        style={{ 
          backgroundColor: '#00CECB',
          color: '#FFFFEA'
        }}
      >
        {category}
      </span>
    </div>
  </div>
);

const featuredApis = [
  {
    title: "Weather API",
    summary: "Get real-time weather data for any location worldwide. Easy integration and fast response.",
    tags: ["weather", "data", "location"],
    category: "Weather"
  },
  {
    title: "Currency Exchange API",
    summary: "Access up-to-date currency exchange rates and historical data for 150+ currencies.",
    tags: ["finance", "currency", "exchange"],
    category: "Finance"
  },
];

const generalApis = [
  {
    title: "News Aggregator API",
    summary: "Fetch the latest news headlines from multiple sources, filter by topic or region.",
    tags: ["news", "media", "aggregator"],
    category: "Media"
  },
  {
    title: "Recipe API",
    summary: "Discover thousands of recipes with nutritional info and cooking instructions.",
    tags: ["food", "recipes", "nutrition"],
    category: "Food"
  },
  {
    title: "Books Info API",
    summary: "Retrieve book details, reviews, and ratings from a global database.",
    tags: ["books", "reviews", "library"],
    category: "Books"
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  
  const categories: Category[] = ['All', 'Weather', 'Finance', 'Media', 'Food', 'Books'];
  
  const filteredFeaturedApis = featuredApis.filter(api => {
    const matchesSearch = 
      api.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || api.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredGeneralApis = generalApis.filter(api => {
    const matchesSearch = 
      api.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || api.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#FFFFEA' }}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-6xl font-bold mb-4" style={{ color: '#FF5E5B' }}>API STORE</h1>
          <p className="text-xl" style={{ color: '#171717' }}>Discover, explore, and integrate powerful APIs for your next project.</p>
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
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: selectedCategory === category ? '#00CECB' : '#FFED66',
                  color: selectedCategory === category ? '#FFFFEA' : '#171717',
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#00CECB' }}>Featured APIs</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {filteredFeaturedApis.map((api) => (
              <ApiCard key={api.title} {...api} featured />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#00CECB' }}>All APIs</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {filteredGeneralApis.map((api) => (
              <ApiCard key={api.title} {...api} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
