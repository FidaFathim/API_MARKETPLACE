// import { NextResponse } from 'next/server';
// import axios from 'axios';
// import * as cheerio from 'cheerio';

// // This function handles GET requests to /api/scrape
// export async function GET(request: Request) {
//   // Extract the URL to scrape from the request's query parameters
//   const { searchParams } = new URL(request.url);
//   const urlToScrape = searchParams.get('url');

//   if (!urlToScrape) {
//     return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
//   }

//   try {
//     // Fetch the HTML content of the target URL
//     const { data } = await axios.get(urlToScrape);
//     const $ = cheerio.load(data);

//     // --- Scraping Logic ---

//     // 1. Scrape for a general overview
//     // We'll look for the first substantial paragraph, often a good indicator of an overview.
//     const overview = $('p').first().text().trim();

//     // 2. Scrape for code examples
//     // Code examples are typically in <pre> or <code> tags.
//     const examples: string[] = [];
//     $('pre code').each((_idx, el) => {
//       const example = $(el).text().trim();
//       if (example) {
//         examples.push(example);
//       }
//     });
//      // If no 'pre code' found, try just 'pre'
//     if (examples.length === 0) {
//         $('pre').each((_idx, el) => {
//             const example = $(el).text().trim();
//             if(example) {
//                 examples.push(example);
//             }
//         });
//     }

//     // 3. Scrape for requirements or features
//     // We'll look for lists (<ul>) that come after headings like "Features" or "Requirements".
//     const requirements: string[] = [];
//     $('h2, h3').each((_idx, el) => {
//       const headingText = $(el).text().toLowerCase();
//       if (headingText.includes('requirement') || headingText.includes('feature') || headingText.includes('getting started')) {
//         $(el).next('ul').find('li').each((_liIdx, liEl) => {
//           requirements.push($(liEl).text().trim());
//         });
//       }
//     });

//     // 4. Determine if it's a REST API
//     // We'll do a simple keyword search in the body text.
//     const bodyText = $('body').text().toLowerCase();
//     const isRestApi = /rest|http|get|post|put|delete|json/.test(bodyText);


//     // Return the scraped data as JSON
//     return NextResponse.json({
//       overview: overview || "No overview found.",
//       examples,
//       requirements,
//       isRestApi
//     });

//   } catch (error) {
//     console.error('Error during scraping:', error);
//     return NextResponse.json({ error: `Failed to scrape URL: ${urlToScrape}` }, { status: 500 });
//   }
// }









import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlToScrape = searchParams.get('url');

  if (!urlToScrape) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Add headers to avoid being blocked
    const { data } = await axios.get(urlToScrape, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000, // 10 second timeout
    });
    
    const $ = cheerio.load(data);

    // Remove script and style tags for cleaner text
    $('script, style, nav, footer, header').remove();

    // 1. Scrape for overview - try multiple selectors
    let overview = '';
    const overviewSelectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      '.description',
      '.overview',
      'p',
      '.content p'
    ];

    for (const selector of overviewSelectors) {
      if (selector.startsWith('meta')) {
        overview = $(selector).attr('content')?.trim() || '';
      } else {
        const text = $(selector).first().text().trim();
        if (text.length > 50) { // Only use substantial paragraphs
          overview = text;
        }
      }
      if (overview) break;
    }

    // 2. Scrape for code examples
    const examples: string[] = [];
    
    // Try different code block patterns
    $('pre code, pre, code.language-*, .code-block').each((_idx, el) => {
      const example = $(el).text().trim();
      if (example && example.length > 10 && example.length < 2000) {
        // Avoid duplicates and filter out very short/long examples
        if (!examples.includes(example)) {
          examples.push(example);
        }
      }
    });

    // Limit to first 5 examples to avoid huge responses
    const limitedExamples = examples.slice(0, 5);

    // 3. Scrape for requirements or features
    const requirements: string[] = [];
    
    $('h1, h2, h3, h4').each((_idx, el) => {
      const headingText = $(el).text().toLowerCase();
      if (
        headingText.includes('requirement') || 
        headingText.includes('feature') || 
        headingText.includes('getting started') ||
        headingText.includes('prerequisite') ||
        headingText.includes('installation') ||
        headingText.includes('quick start')
      ) {
        // Look for lists after the heading
        const $nextElement = $(el).next();
        
        if ($nextElement.is('ul') || $nextElement.is('ol')) {
          $nextElement.find('li').each((_liIdx, liEl) => {
            const text = $(liEl).text().trim();
            if (text && !requirements.includes(text)) {
              requirements.push(text);
            }
          });
        }
        
        // Also check for lists within a few siblings
        $(el).nextAll().slice(0, 3).find('li').each((_liIdx, liEl) => {
          const text = $(liEl).text().trim();
          if (text && !requirements.includes(text)) {
            requirements.push(text);
          }
        });
      }
    });

    // 4. Determine if it's a REST API (improved detection)
    const bodyText = $('body').text().toLowerCase();
    const titleText = $('title').text().toLowerCase();
    const headingText = $('h1').text().toLowerCase();
    
    const restKeywords = ['rest api', 'restful', 'http api', 'api endpoint', 'get request', 'post request'];
    const hasRestKeyword = restKeywords.some(keyword => 
      bodyText.includes(keyword) || titleText.includes(keyword) || headingText.includes(keyword)
    );
    
    const hasHttpMethods = /\b(GET|POST|PUT|DELETE|PATCH)\b/.test($('body').text());
    const isRestApi = hasRestKeyword || hasHttpMethods;

    return NextResponse.json({
      overview: overview || "No overview found. Please visit the official documentation for details.",
      examples: limitedExamples,
      requirements: requirements.slice(0, 10), // Limit requirements too
      isRestApi
    });

  } catch (error) {
    console.error('Error during scraping:', error);
    
    // More informative error messages
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json({ 
          error: 'Request timeout - the website took too long to respond',
          overview: 'Unable to fetch documentation. Please visit the official link.',
          examples: [],
          requirements: [],
          isRestApi: false
        }, { status: 200 });
      }
      if (error.response?.status === 403 || error.response?.status === 401) {
        return NextResponse.json({ 
          error: 'Access denied - the website blocked the scraping request',
          overview: 'Unable to fetch documentation. Please visit the official link.',
          examples: [],
          requirements: [],
          isRestApi: false
        }, { status: 200 });
      }
    }
    
    return NextResponse.json({ 
      error: `Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      overview: 'Unable to fetch documentation. Please visit the official link.',
      examples: [],
      requirements: [],
      isRestApi: false
    }, { status: 200 });
  }
}