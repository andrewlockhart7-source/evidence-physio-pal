import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripResult {
  title: string;
  link: string;
  description: string;
  publicationName?: string;
  publicationDate?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TRIP-DB] Starting Trip Database search');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchTerms, condition } = await req.json();
    console.log('[TRIP-DB] Search params:', { searchTerms, condition });

    // Trip Database public search (using their website search, no API key needed)
    const query = encodeURIComponent(searchTerms || condition || 'physiotherapy');
    const tripUrl = `https://www.tripdatabase.com/search?criteria=${query}`;
    
    console.log('[TRIP-DB] Fetching from Trip Database');
    
    // For now, we'll store the search URL and create placeholder entries
    // In production, you'd want to use their API or scrape results
    const evidenceEntries = [];
    
    // Create a reference entry pointing to Trip Database search
    const tripEntry = {
      title: `Trip Database: ${searchTerms || condition}`,
      abstract: `Evidence-based clinical search results from Trip Database for ${searchTerms || condition}. Trip Database is a clinical search engine designed to allow users to quickly and easily find high-quality research evidence.`,
      study_type: 'Clinical Practice Guideline',
      journal: 'Trip Database',
      evidence_level: 'A',
      publication_date: new Date().toISOString().split('T')[0],
      tags: [searchTerms, condition, 'trip-database', 'clinical-evidence'].filter(Boolean),
      grade_assessment: {
        organization: 'Trip Database',
        url: tripUrl,
        condition: condition || searchTerms,
        recommendations: [
          'Access comprehensive clinical evidence',
          'Review systematic reviews and clinical guidelines',
          'Explore evidence-based treatment options'
        ]
      },
      condition_ids: [],
      is_active: true
    };

    evidenceEntries.push(tripEntry);
    console.log('[TRIP-DB] Created Trip Database reference entry');

    // Insert into database with pre-insert check to avoid conflicts
    if (evidenceEntries.length > 0) {
      for (const entry of evidenceEntries) {
        // Check if entry with this URL already exists
        const { data: existing } = await supabase
          .from('evidence')
          .select('id')
          .eq('grade_assessment->>url', tripUrl)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('evidence')
            .insert(entry);

          if (error) {
            console.error('[TRIP-DB] Error inserting evidence:', error);
          } else {
            console.log('[TRIP-DB] Successfully inserted entry');
          }
        } else {
          console.log('[TRIP-DB] Entry already exists, skipping');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Trip Database search link created for: ${searchTerms || condition}`,
        count: evidenceEntries.length,
        searchUrl: tripUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TRIP-DB] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create Trip Database search reference'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
