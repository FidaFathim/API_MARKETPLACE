import { NextResponse } from 'next/server';
import cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract relevant information from the documentation page
    const overview = $('body').find('p').first().text().trim();
    
    const examples: string[] = [];
    $('pre code').each((_, element) => {
      examples.push($(element).text().trim());
    });

    const requirements: string[] = [];
    $('h2:contains("Requirements"), h3:contains("Requirements")')
      .next('ul')
      .find('li')
      .each((_, element) => {
        requirements.push($(element).text().trim());
      });

    return NextResponse.json({
      overview,
      examples: examples.slice(0, 3), // Limit to first 3 examples
      requirements
    });
  } catch (error) {
    console.error('Error scraping documentation:', error);
    return NextResponse.json({ error: 'Failed to scrape documentation' }, { status: 500 });
  }
}