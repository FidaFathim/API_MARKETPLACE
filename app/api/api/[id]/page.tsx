'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import cheerio from 'cheerio';

interface ApiDetails {
  title: string;
  description: string;
  documentation: string;
  endpoints: string[];
  auth: string;
  cors: string;
  category: string;
  scraped: {
    overview?: string;
    examples?: string[];
    requirements?: string[];
  }
}

export default function ApiDetailsPage() {
  const params = useParams();
  const [apiDetails, setApiDetails] = useState<ApiDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApiDetails = async () => {
      try {
        // Fetch API details from your JSON file
        const response = await fetch('/apis.json');
        const data = await response.json();
        const api = data.entries.find((entry: any) => 
          entry.API.toLowerCase().replace(/\s+/g, '-') === params.id
        );

        if (api) {
          // Fetch and scrape documentation page
          const docResponse = await fetch(`/api/scrape?url=${encodeURIComponent(api.Link)}`);
          const scrapedData = await docResponse.json();

          setApiDetails({
            title: api.API,
            description: api.Description,
            documentation: api.Link,
            endpoints: [],
            auth: api.Auth,
            cors: api.Cors,
            category: api.Category,
            scraped: scrapedData
          });
        }
      } catch (error) {
        console.error('Error fetching API details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchApiDetails();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: '#FFFFEA' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" 
             style={{ borderColor: '#00CECB' }}></div>
      </div>
    );
  }

  if (!apiDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: '#FFFFEA' }}>
        <div className="text-xl" style={{ color: '#FF5E5B' }}>API not found</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4" style={{ backgroundColor: '#FFFFEA' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FF5E5B' }}>
            {apiDetails.title}
          </h1>
          <p className="text-lg mb-4" style={{ color: '#171717' }}>
            {apiDetails.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded text-sm" 
                  style={{ backgroundColor: '#00CECB', color: '#FFFFEA' }}>
              {apiDetails.category}
            </span>
            <span className="px-3 py-1 rounded text-sm" 
                  style={{ backgroundColor: '#FFED66', color: '#171717' }}>
              Auth: {apiDetails.auth || 'None'}
            </span>
            <span className="px-3 py-1 rounded text-sm" 
                  style={{ backgroundColor: '#D8D8D8', color: '#171717' }}>
              CORS: {apiDetails.cors}
            </span>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#00CECB' }}>
            Documentation
          </h2>
          <div className="bg-white rounded-lg p-6 shadow-md" 
               style={{ backgroundColor: '#FFFFEA', borderColor: '#D8D8D8' }}>
            <a href={apiDetails.documentation} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="text-lg hover:underline" 
               style={{ color: '#00CECB' }}>
              View Official Documentation →
            </a>
            {apiDetails.scraped.overview && (
              <div className="mt-4" style={{ color: '#171717' }}>
                <h3 className="font-semibold mb-2">Overview</h3>
                <p>{apiDetails.scraped.overview}</p>
              </div>
            )}
          </div>
        </section>

        {apiDetails.scraped.examples && apiDetails.scraped.examples.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#00CECB' }}>
              Example Usage
            </h2>
            <div className="bg-white rounded-lg p-6 shadow-md" 
                 style={{ backgroundColor: '#FFFFEA', borderColor: '#D8D8D8' }}>
              {apiDetails.scraped.examples.map((example, index) => (
                <pre key={index} className="mb-4 p-4 rounded bg-gray-100 overflow-x-auto">
                  <code>{example}</code>
                </pre>
              ))}
            </div>
          </section>
        )}

        {apiDetails.scraped.requirements && apiDetails.scraped.requirements.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#00CECB' }}>
              Requirements
            </h2>
            <div className="bg-white rounded-lg p-6 shadow-md" 
                 style={{ backgroundColor: '#FFFFEA', borderColor: '#D8D8D8' }}>
              <ul className="list-disc list-inside" style={{ color: '#171717' }}>
                {apiDetails.scraped.requirements.map((req, index) => (
                  <li key={index} className="mb-2">{req}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}