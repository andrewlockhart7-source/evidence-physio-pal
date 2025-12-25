import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[WHO] Starting WHO Guidelines search');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchTerms, condition } = await req.json();
    console.log('[WHO] Search params:', { searchTerms, condition });

    const query = encodeURIComponent(searchTerms || condition || 'rehabilitation');
    const whoUrl = `https://www.who.int/publications/guidelines?keywords=${query}`;
    
    console.log('[WHO] Creating WHO Guidelines reference');
    
    const evidenceEntries = [];
    
    // Create reference entry for WHO Guidelines
    const whoEntry = {
      title: `WHO Guidelines: ${searchTerms || condition}`,
      abstract: `World Health Organization clinical guidelines for ${searchTerms || condition}. WHO develops evidence-based guidelines to support healthcare decision-making globally.`,
      study_type: 'Clinical Practice Guideline',
      journal: 'World Health Organization',
      evidence_level: 'A',
      publication_date: new Date().toISOString().split('T')[0],
      tags: [searchTerms, condition, 'who', 'international-guidelines'].filter(Boolean),
      grade_assessment: {
        organization: 'World Health Organization',
        url: whoUrl,
        condition: condition || searchTerms,
        recommendations: [
          'Review WHO international clinical guidelines',
          'Access evidence-based global health recommendations',
          'Explore implementation considerations'
        ]
      },
      condition_ids: [],
      is_active: true
    };

    evidenceEntries.push(whoEntry);
    console.log('[WHO] Created WHO Guidelines reference entry');

    // Insert into database with pre-insert check to avoid conflicts
    if (evidenceEntries.length > 0) {
      for (const entry of evidenceEntries) {
        // Check if entry with this URL already exists
        const { data: existing } = await supabase
          .from('evidence')
          .select('id')
          .eq('grade_assessment->>url', whoUrl)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('evidence')
            .insert(entry);

          if (error) {
            console.error('[WHO] Error inserting evidence:', error);
          } else {
            console.log('[WHO] Successfully inserted entry');
          }
        } else {
          console.log('[WHO] Entry already exists, skipping');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `WHO Guidelines search link created for: ${searchTerms || condition}`,
        count: evidenceEntries.length,
        searchUrl: whoUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WHO] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create WHO Guidelines search reference'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
