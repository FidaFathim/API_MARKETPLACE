
interface ApiCardProps {
  title: string;
  summary: string;
  tags: string[];
  featured?: boolean;
}

const ApiCard = ({ title, summary, tags, featured }: ApiCardProps) => (
  <div
    className={`rounded-lg shadow-md p-6 mb-6 bg-white border ${featured ? 'border-blue-500' : 'border-gray-200'} transition hover:shadow-lg`}
    style={{ minWidth: 260, maxWidth: 340 }}
  >
    <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-600 mb-3 text-sm">{summary}</p>
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.map((tag) => (
        <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
          {tag}
        </span>
      ))}
    </div>
  </div>
);

const featuredApis = [
  {
    title: "Weather API",
    summary: "Get real-time weather data for any location worldwide. Easy integration and fast response.",
    tags: ["weather", "data", "location"],
  },
  {
    title: "Currency Exchange API",
    summary: "Access up-to-date currency exchange rates and historical data for 150+ currencies.",
    tags: ["finance", "currency", "exchange"],
  },
];

const generalApis = [
  {
    title: "News Aggregator API",
    summary: "Fetch the latest news headlines from multiple sources, filter by topic or region.",
    tags: ["news", "media", "aggregator"],
  },
  {
    title: "Recipe API",
    summary: "Discover thousands of recipes with nutritional info and cooking instructions.",
    tags: ["food", "recipes", "nutrition"],
  },
  {
    title: "Books Info API",
    summary: "Retrieve book details, reviews, and ratings from a global database.",
    tags: ["books", "reviews", "library"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-blue-700 mb-2">API STORE</h1>
          <p className="text-lg text-gray-600">Discover, explore, and integrate powerful APIs for your next project.</p>
        </header>

        <section className="mb-14">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Featured APIs</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {featuredApis.map((api) => (
              <ApiCard key={api.title} {...api} featured />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">All APIs</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {generalApis.map((api) => (
              <ApiCard key={api.title} {...api} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
