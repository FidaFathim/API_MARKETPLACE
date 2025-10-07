import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

// This function handles GET requests to /api/scrape
export async function GET(request: Request) {
  // Extract the URL to scrape from the request's query parameters
  const { searchParams } = new URL(request.url);
  const urlToScrape = searchParams.get('url');

  if (!urlToScrape) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Fetch the HTML content of the target URL
    const { data } = await axios.get(urlToScrape);
    const $ = cheerio.load(data);

    // --- Scraping Logic ---

    // 1. Scrape for a general overview
    // We'll look for the first substantial paragraph, often a good indicator of an overview.
    const overview = $('p').first().text().trim();

    // 2. Scrape for code examples
    // Code examples are typically in <pre> or <code> tags.
    const examples: string[] = [];
    $('pre code').each((_idx, el) => {
      const example = $(el).text().trim();
      if (example) {
        examples.push(example);
      }
    });
     // If no 'pre code' found, try just 'pre'
    if (examples.length === 0) {
        $('pre').each((_idx, el) => {
            const example = $(el).text().trim();
            if(example) {
                examples.push(example);
            }
        });
    }

    // 3. Scrape for requirements or features
    // We'll look for lists (<ul>) that come after headings like "Features" or "Requirements".
    const requirements: string[] = [];
    $('h2, h3').each((_idx, el) => {
      const headingText = $(el).text().toLowerCase();
      if (headingText.includes('requirement') || headingText.includes('feature') || headingText.includes('getting started')) {
        $(el).next('ul').find('li').each((_liIdx, liEl) => {
          requirements.push($(liEl).text().trim());
        });
      }
    });

    // 4. Determine if it's a REST API
    // We'll do a simple keyword search in the body text.
    const bodyText = $('body').text().toLowerCase();
    const isRestApi = /rest|http|get|post|put|delete|json/.test(bodyText);


    // Return the scraped data as JSON
    return NextResponse.json({
      overview: overview || "No overview found.",
      examples,
      requirements,
      isRestApi
    });

  } catch (error) {
    console.error('Error during scraping:', error);
    return NextResponse.json({ error: `Failed to scrape URL: ${urlToScrape}` }, { status: 500 });
  }
}
