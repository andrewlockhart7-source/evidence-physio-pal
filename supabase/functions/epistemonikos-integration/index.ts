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
    console.log('[EPISTEMONIKOS] Starting Epistemonikos search');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchTerms, condition } = await req.json();
    console.log('[EPISTEMONIKOS] Search params:', { searchTerms, condition });

    const query = encodeURIComponent(searchTerms || condition || 'physiotherapy');
    const epistemUrl = `https://www.epistemonikos.org/en/search?q=${query}&classification=systematic-review`;
    
    console.log('[EPISTEMONIKOS] Creating Epistemonikos reference');
    
    const evidenceEntries = [];
    
    // Create reference entry for Epistemonikos
    const epistemEntry = {
      title: `Epistemonikos Systematic Reviews: ${searchTerms || condition}`,
      abstract: `Systematic review evidence from Epistemonikos for ${searchTerms || condition}. Epistemonikos is a collaborative database of health evidence, focusing on systematic reviews and broad syntheses of evidence.`,
      study_type: 'Clinical Practice Guideline',
      journal: 'Epistemonikos Foundation',
      evidence_level: 'A',
      publication_date: new Date().toISOString().split('T')[0],
      tags: [searchTerms, condition, 'epistemonikos', 'systematic-review'].filter(Boolean),
      grade_assessment: {
        organization: 'Epistemonikos Foundation',
        url: epistemUrl,
        condition: condition || searchTerms,
        recommendations: [
          'Review systematic reviews and meta-analyses',
          'Access evidence matrices and summaries',
          'Explore related primary studies'
        ]
      },
      condition_ids: [],
      is_active: true
    };

    evidenceEntries.push(epistemEntry);
    console.log('[EPISTEMONIKOS] Created Epistemonikos reference entry');

    // Insert into database with pre-insert check to avoid conflicts
    if (evidenceEntries.length > 0) {
      for (const entry of evidenceEntries) {
        // Check if entry with this URL already exists
        const { data: existing } = await supabase
          .from('evidence')
          .select('id')
          .eq('grade_assessment->>url', epistemUrl)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('evidence')
            .insert(entry);

          if (error) {
            console.error('[EPISTEMONIKOS] Error inserting evidence:', error);
          } else {
            console.log('[EPISTEMONIKOS] Successfully inserted entry');
          }
        } else {
          console.log('[EPISTEMONIKOS] Entry already exists, skipping');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Epistemonikos search link created for: ${searchTerms || condition}`,
        count: evidenceEntries.length,
        searchUrl: epistemUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EPISTEMONIKOS] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create Epistemonikos search reference'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
