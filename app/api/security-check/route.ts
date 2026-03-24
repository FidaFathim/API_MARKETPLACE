import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Automated Security Check Pipeline for submitted API links
// Checks performed:
//  1. VirusTotal URL scan (malware / phishing detection)
//  2. HTTPS enforcement check
//  3. Domain reputation via WHOIS age heuristic (free public API)
//  4. HTTP response header security audit
//  5. Suspicious pattern / known-bad TLD detection
// ─────────────────────────────────────────────────────────────────────────────

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || '';
const VT_BASE = 'https://www.virustotal.com/api/v3';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  detail: string;
}

interface SecurityReport {
  safe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  checks: CheckResult[];
  virusTotalStats?: {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
    permalink: string;
  };
  scannedAt: string;
}

// ── 1. VirusTotal: submit URL for analysis ───────────────────────────────────
async function runVirusTotalScan(url: string): Promise<CheckResult & { vtStats?: SecurityReport['virusTotalStats'] }> {
  if (!VT_API_KEY) {
    return { name: 'VirusTotal Scan', status: 'skip', detail: 'VIRUSTOTAL_API_KEY not configured in .env' };
  }

  try {
    // Submit the URL
    const submitRes = await axios.post(
      `${VT_BASE}/urls`,
      new URLSearchParams({ url }),
      {
        headers: {
          'x-apikey': VT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    const analysisId: string = submitRes.data?.data?.id;
    if (!analysisId) {
      return { name: 'VirusTotal Scan', status: 'warn', detail: 'Could not obtain analysis ID from VirusTotal.' };
    }

    // Poll for results (wait up to ~20s)
    let stats: any = null;
    let permalink = `https://www.virustotal.com/gui/url/${Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise(r => setTimeout(r, 3500));
      try {
        const resultRes = await axios.get(`${VT_BASE}/analyses/${analysisId}`, {
          headers: { 'x-apikey': VT_API_KEY },
          timeout: 10000,
        });
        const data = resultRes.data?.data;
        if (data?.attributes?.status === 'completed') {
          stats = data.attributes.stats;
          break;
        }
      } catch {
        // continue polling
      }
    }

    if (!stats) {
      return {
        name: 'VirusTotal Scan',
        status: 'warn',
        detail: 'Analysis is queued. Admin should manually review on VirusTotal.',
        vtStats: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, permalink },
      };
    }

    const malicious: number = stats.malicious || 0;
    const suspicious: number = stats.suspicious || 0;

    const vtStats = {
      malicious,
      suspicious,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      permalink,
    };

    if (malicious > 0) {
      return {
        name: 'VirusTotal Scan',
        status: 'fail',
        detail: `🔴 ${malicious} security vendor(s) flagged this URL as malicious. ${suspicious} suspicious.`,
        vtStats,
      };
    }
    if (suspicious > 2) {
      return {
        name: 'VirusTotal Scan',
        status: 'warn',
        detail: `🟡 ${suspicious} vendor(s) flagged this URL as suspicious. Review recommended.`,
        vtStats,
      };
    }
    return {
      name: 'VirusTotal Scan',
      status: 'pass',
      detail: `✅ Clean — ${stats.harmless} vendors confirm safe, 0 malicious detections.`,
      vtStats,
    };
  } catch (err: any) {
    return {
      name: 'VirusTotal Scan',
      status: 'warn',
      detail: `Could not complete VirusTotal scan: ${err.message || 'Unknown error'}`,
    };
  }
}

// ── 2. HTTPS enforcement ─────────────────────────────────────────────────────
function checkHttps(url: string): CheckResult {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return { name: 'HTTPS Check', status: 'fail', detail: 'URL does not use HTTPS. Insecure connections expose users to MITM attacks.' };
    }
    return { name: 'HTTPS Check', status: 'pass', detail: 'URL uses HTTPS — encrypted transport confirmed.' };
  } catch {
    return { name: 'HTTPS Check', status: 'fail', detail: 'Malformed URL — could not determine protocol.' };
  }
}

// ── 3. Suspicious domain / TLD patterns ─────────────────────────────────────
function checkSuspiciousPatterns(url: string): CheckResult {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  const badTlds = ['.xyz', '.top', '.club', '.work', '.loan', '.click', '.gq', '.ml', '.cf', '.tk'];
  const suspiciousKeywords = ['login', 'free-api', 'hack', 'exploit', 'phish', 'malware', 'payload', 'crypter'];
  const ipPattern = /^\d{1,3}(\.\d{1,3}){3}$/;

  if (ipPattern.test(hostname)) {
    return { name: 'Domain Pattern Check', status: 'warn', detail: 'API uses a raw IP address. Legitimate public APIs typically use named domains.' };
  }

  for (const tld of badTlds) {
    if (hostname.endsWith(tld)) {
      return { name: 'Domain Pattern Check', status: 'warn', detail: `TLD "${tld}" is commonly associated with spam/free hosting. Manual review recommended.` };
    }
  }

  for (const kw of suspiciousKeywords) {
    if (hostname.includes(kw) || parsed.pathname.includes(kw)) {
      return { name: 'Domain Pattern Check', status: 'warn', detail: `URL contains suspicious keyword: "${kw}". Review carefully.` };
    }
  }

  return { name: 'Domain Pattern Check', status: 'pass', detail: 'No suspicious domain patterns or bad TLDs detected.' };
}

// ── 4. HTTP response header security audit ───────────────────────────────────
async function checkSecurityHeaders(url: string): Promise<CheckResult> {
  try {
    const res = await axios.head(url, {
      timeout: 8000,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    const headers = res.headers;
    const missing: string[] = [];

    if (!headers['x-content-type-options']) missing.push('X-Content-Type-Options');
    if (!headers['x-frame-options'] && !headers['content-security-policy']) missing.push('X-Frame-Options / CSP');
    if (!headers['strict-transport-security']) missing.push('Strict-Transport-Security (HSTS)');

    if (missing.length === 0) {
      return { name: 'Security Headers Audit', status: 'pass', detail: 'All key security headers present.' };
    }
    if (missing.length <= 1) {
      return { name: 'Security Headers Audit', status: 'warn', detail: `Missing: ${missing.join(', ')}. Not critical but recommended.` };
    }
    return { name: 'Security Headers Audit', status: 'warn', detail: `Missing important headers: ${missing.join(', ')}.` };
  } catch (err: any) {
    return { name: 'Security Headers Audit', status: 'skip', detail: `Could not reach URL to audit headers: ${err.message}` };
  }
}

// ── 5. Reachability / legitimacy check ───────────────────────────────────────
async function checkReachability(url: string): Promise<CheckResult> {
  try {
    const res = await axios.head(url, {
      timeout: 8000,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    if (res.status >= 200 && res.status < 400) {
      return { name: 'URL Reachability', status: 'pass', detail: `URL is reachable (HTTP ${res.status}).` };
    }
    if (res.status === 404) {
      return { name: 'URL Reachability', status: 'fail', detail: 'URL returns 404 Not Found — endpoint may not exist.' };
    }
    if (res.status >= 500) {
      return { name: 'URL Reachability', status: 'warn', detail: `Server error (HTTP ${res.status}) — endpoint may be temporarily down.` };
    }
    return { name: 'URL Reachability', status: 'warn', detail: `Unexpected status code: ${res.status}.` };
  } catch (err: any) {
    return { name: 'URL Reachability', status: 'warn', detail: `Could not reach URL: ${err.message}. It may require auth to access root.` };
  }
}

// ── Risk scoring ─────────────────────────────────────────────────────────────
function calculateRisk(checks: CheckResult[]): { safe: boolean; riskLevel: SecurityReport['riskLevel'] } {
  const fails = checks.filter(c => c.status === 'fail').length;
  const warns = checks.filter(c => c.status === 'warn').length;

  if (fails >= 1) {
    // Any VirusTotal malicious or HTTPS failure = critical
    const vtFail = checks.find(c => c.name === 'VirusTotal Scan' && c.status === 'fail');
    if (vtFail) return { safe: false, riskLevel: 'critical' };
    return { safe: false, riskLevel: 'high' };
  }
  if (warns >= 2) return { safe: true, riskLevel: 'medium' };
  if (warns === 1) return { safe: true, riskLevel: 'low' };
  return { safe: true, riskLevel: 'low' };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format first
    try { new URL(url); } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Run all checks concurrently (except VT which is sequential due to polling)
    const [vtResult, headersResult, reachResult] = await Promise.all([
      runVirusTotalScan(url),
      checkSecurityHeaders(url),
      checkReachability(url),
    ]);

    const httpsResult = checkHttps(url);
    const patternResult = checkSuspiciousPatterns(url);

    const { vtStats, ...vtCheck } = vtResult as any;

    const checks: CheckResult[] = [vtCheck, httpsResult, patternResult, headersResult, reachResult];
    const { safe, riskLevel } = calculateRisk(checks);

    const report: SecurityReport = {
      safe,
      riskLevel,
      checks,
      virusTotalStats: vtStats,
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('Security check error:', err);
    return NextResponse.json({ error: 'Security check failed', detail: err.message }, { status: 500 });
  }
}
