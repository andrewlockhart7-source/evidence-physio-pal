// Utility to build robust external links for evidence items
// Handles DOI codes, full DOI URLs, Cochrane reviews, PubMed IDs, and guideline URLs

export interface EvidenceLike {
  title?: string | null;
  journal?: string | null;
  doi?: string | null;
  pmid?: string | null;
  tags?: string[] | null;
  grade_assessment?: { url?: string | null } | null;
}

// Normalize a DOI value into its canonical identifier (no scheme/prefix, no punctuation)
function normalizeDoi(input: string): string {
  let s = (input || '').trim();
  if (!s) return '';

  const lower = s.toLowerCase();

  // Strip common prefixes (e.g., "doi:", "DOI ")
  if (lower.startsWith('doi:')) {
    s = s.slice(4).trimStart();
  } else if (lower.startsWith('doi ')) {
    s = s.slice(4).trimStart();
  }

  // If it's a doi.org URL, extract the path part
  const lowerS = s.toLowerCase();
  if (lowerS.startsWith('http://') || lowerS.startsWith('https://')) {
    try {
      const u = new URL(s);
      if (u.hostname.toLowerCase().endsWith('doi.org')) {
        s = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
      }
    } catch {
      // Not a valid URL; continue with best-effort cleanup
    }
  }

  // Remove trailing punctuation commonly found in copied citations
  while (
    s.endsWith('.') ||
    s.endsWith(',') ||
    s.endsWith(';') ||
    s.endsWith(')') ||
    s.endsWith(']')
  ) {
    s = s.slice(0, -1);
  }

  // Remove internal spaces
  s = s.split(' ').join('');

  return s;
}

// Ensure doi.org URL is canonical (https://doi.org/<normalized-doi>)
function toDoiUrl(input: string): string {
  const n = normalizeDoi(input);
  return n ? `https://doi.org/${n}` : '';
}

// Detect NICE guidance item pages like /guidance/ng59, /guidance/cg177, /guidance/qs123
// or Clinical Knowledge Summaries pages like /topics/...
const niceGuidanceRegex = /nice\.org\.uk\/guidance\/[a-z]{1,3}\d+/i;
const cksSummaryRegex = /cks\.nice\.org\.uk\/topics\//i;
function isNiceGuidanceUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const urlString = u.hostname + u.pathname;
    return niceGuidanceRegex.test(urlString) || cksSummaryRegex.test(urlString);
  } catch {
    return niceGuidanceRegex.test(url) || cksSummaryRegex.test(url);
  }
}

// Detect if a URL is a search results page (not a specific document)
function isSearchUrl(url: string): boolean {
  if (!url || url === '#') return true;
  
  const searchPatterns = [
    /\/search\?/i,           // Generic search
    /\/\?q=/i,               // Query parameter
    /\?criteria=/i,          // TRIP criteria
    /\?keywords=/i,          // WHO keywords
    /\?term=/i,              // PubMed term
    /\?searchText=/i,        // Cochrane searchText
    /#\?q=/i,                // CKS hash query
  ];
  
  return searchPatterns.some(pattern => pattern.test(url));
}

// Build a stable NICE search query from tags or a cleaned title
function buildNiceQuery(e: EvidenceLike): string {
  const tags = (e.tags || []) as string[];
  const stopWords = /\b(guideline|guidelines|nice|clinical|practice|recommendations?|evidence|rehabilitation|physiotherapy)\b/gi;

  // Prefer a specific condition tag if available
  const primaryTag = tags.find(t => !stopWords.test(t));

  // Clean the title without quotes
  const cleanedTitle = (e.title || '')
    .replace(stopWords, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const parts: string[] = [];
  if (cleanedTitle) parts.push(cleanedTitle);
  if (primaryTag) parts.push(primaryTag);

  return parts.join(' ').trim();
}

// Multi-source evidence link resolver - returns all available sources with priority ranking
export interface EvidenceSource {
  label: string;
  url: string;
  priority: number;
  source: 'NICE' | 'CKS' | 'DOI' | 'PubMed' | 'Cochrane' | 'WHO' | 'TRIP' | 'Epistemonikos' | 'PubMed-Search';
}

export function getEvidenceSourceLinks(e: EvidenceLike): EvidenceSource[] {
  if (!e) return [];
  
  const sources: EvidenceSource[] = [];
  const gaUrl = (e.grade_assessment?.url || '').trim();
  const doiRaw = (e.doi || '').trim();
  const doiNorm = normalizeDoi(doiRaw);
  const journalLower = (e.journal || '').toLowerCase();
  
  // 1) Specific NICE guidance URL (highest priority for NICE items)
  if (gaUrl && isNiceGuidanceUrl(gaUrl)) {
    const code = gaUrl.match(/\/(ng\d+|cg\d+|qs\d+|ph\d+)/i)?.[1]?.toUpperCase();
    sources.push({
      label: code ? `NICE ${code}` : 'NICE Guidance',
      url: gaUrl,
      priority: 1,
      source: 'NICE'
    });
  }
  
  // 2) CKS topic page
  if (gaUrl && cksSummaryRegex.test(gaUrl)) {
    sources.push({
      label: 'NICE CKS Topic',
      url: gaUrl,
      priority: 2,
      source: 'CKS'
    });
  }
  
  // 3) DOI resolution
  if (doiNorm && doiNorm.startsWith('10.')) {
    if (doiNorm.includes('14651858') || journalLower.includes('cochrane')) {
      // Cochrane - prefer library search
      const q = encodeURIComponent(e.title || doiNorm);
      sources.push({
        label: 'Cochrane Library',
        url: `https://www.cochranelibrary.com/search?searchText=${q}`,
        priority: 3,
        source: 'Cochrane'
      });
    } else if (journalLower.includes('bmj')) {
      sources.push({
        label: 'BMJ',
        url: `https://bmjopenquality.bmj.com/content/${doiNorm.replace('10.1136/', '')}`,
        priority: 3,
        source: 'DOI'
      });
    } else if (journalLower.includes('physical therapy')) {
      sources.push({
        label: 'OUP Physical Therapy',
        url: `https://academic.oup.com/ptj/article-lookup/doi/${doiNorm}`,
        priority: 3,
        source: 'DOI'
      });
    } else {
      sources.push({
        label: 'DOI Link',
        url: `https://doi.org/${doiNorm}`,
        priority: 3,
        source: 'DOI'
      });
    }
  }
  
  // 4) PubMed ID
  if (e.pmid) {
    sources.push({
      label: 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/${e.pmid}`,
      priority: 4,
      source: 'PubMed'
    });
  }
  
// 5) External database links from grade_assessment
  // ONLY include if it's a specific page, not a search URL
  if (gaUrl && gaUrl !== '#' && !isSearchUrl(gaUrl)) {
    if (/tripdatabase\.com\/doc\//i.test(gaUrl)) {
      // Specific TRIP document
      sources.push({
        label: 'TRIP Database',
        url: gaUrl,
        priority: 5,
        source: 'TRIP'
      });
    } else if (/epistemonikos\.org\/documents\//i.test(gaUrl)) {
      // Specific Epistemonikos document
      sources.push({
        label: 'Epistemonikos',
        url: gaUrl,
        priority: 5,
        source: 'Epistemonikos'
      });
    } else if (/who\.int\/publications\/[^?]+$/i.test(gaUrl)) {
      // Specific WHO publication (not search)
      sources.push({
        label: 'WHO Guidelines',
        url: gaUrl,
        priority: 5,
        source: 'WHO'
      });
    } else if (!/(cks\.)?nice\.org\.uk/i.test(gaUrl)) {
      // Other valid URLs that aren't search pages
      sources.push({
        label: 'External Link',
        url: gaUrl,
        priority: 6,
        source: 'DOI'
      });
    }
  }
  
  // 6) As a fallback, prefer NICE site search for NICE items; otherwise PubMed
  if (sources.length === 0) {
    const isNice = ((e.journal || '').toLowerCase().includes('nice')) 
      || ((e.title || '').toLowerCase().includes('nice'))
      || ((e.tags || []) as string[]).some(t => (t || '').toLowerCase().includes('nice'));

    const niceQuery = buildNiceQuery(e);

    if (isNice && niceQuery && niceQuery.length > 3) {
      sources.push({
        label: 'NICE Search',
        url: `https://www.nice.org.uk/search?q=${encodeURIComponent(niceQuery)}`,
        priority: 8,
        source: 'NICE'
      });
    } else if (e.title) {
      const cleanTitle = (e.title || '')
        .replace(/\b(guideline|guidelines|clinical|practice|recommendations?|evidence)\b/gi, '')
        .replace(/[^a-zA-Z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanTitle.length > 5 && cleanTitle.length < 100) {
        sources.push({
          label: 'TRIP Database',
          url: `https://www.tripdatabase.com/search?criteria=${encodeURIComponent(cleanTitle)}`,
          priority: 8,
          source: 'TRIP'
        });
      }
    }
  }
  
  // 7) CKS search only as last resort if NO other sources found
  if (sources.length === 0) {
    const q = buildNiceQuery(e);
    if (q && q.length > 5) {
      sources.push({
        label: 'CKS Search',
        url: `https://cks.nice.org.uk/#?q=${encodeURIComponent(q)}`,
        priority: 9,
        source: 'CKS'
      });
    }
  }
  
  // Sort by priority (lower number = higher priority)
  return sources.sort((a, b) => a.priority - b.priority);
}

// Get the best single link (top priority from multi-source)
export function getExternalEvidenceLink(e: EvidenceLike): string | null {
  const sources = getEvidenceSourceLinks(e);
  return sources.length > 0 ? sources[0].url : null;
}
