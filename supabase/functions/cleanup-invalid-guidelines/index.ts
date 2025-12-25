import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvidenceItem {
  id: string;
  title: string;
  journal: string | null;
  doi: string | null;
  tags: string[] | null;
  grade_assessment: any;
}

// Check if URL is a NICE search URL (not a specific guideline page)
function isNiceSearchUrl(url: string): boolean {
  return /nice\.org\.uk\/search/i.test(url);
}

// Check if URL points to a specific NICE guidance page
function isNiceGuidanceUrl(url: string): boolean {
  const niceGuidanceRegex = /nice\.org\.uk\/guidance\/[a-z]{1,3}\d+/i;
  try {
    const u = new URL(url);
    return niceGuidanceRegex.test(u.hostname + u.pathname);
  } catch {
    return niceGuidanceRegex.test(url);
  }
}

// Check if this is a NICE guideline based on metadata
function isNiceGuideline(item: EvidenceItem): boolean {
  const journalLower = (item.journal || '').toLowerCase();
  const titleLower = (item.title || '').toLowerCase();
  const tagsLower = ((item.tags || []) as string[]).map(t => t.toLowerCase());
  
  return journalLower.includes('nice') || 
         titleLower.includes('nice') || 
         tagsLower.some(t => t.includes('nice'));
}

// Check if the guideline has a valid, specific URL
function hasValidUrl(item: EvidenceItem): boolean {
  const gaUrl = item.grade_assessment?.url;
  
  if (!gaUrl || gaUrl === '#') return false;
  if (isNiceSearchUrl(gaUrl)) return false;
  
  // For NICE guidelines, require a specific guidance page URL
  if (isNiceGuideline(item)) {
    return isNiceGuidanceUrl(gaUrl);
  }
  
  // For non-NICE guidelines, any valid URL is acceptable
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching guidelines to check for invalid entries...');

    // Fetch all clinical practice guidelines
    const { data: guidelines, error: fetchError } = await supabase
      .from('evidence')
      .select('id, title, journal, doi, tags, grade_assessment, is_active')
      .eq('study_type', 'Clinical Practice Guideline');

    if (fetchError) {
      console.error('Error fetching guidelines:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${guidelines?.length || 0} guidelines to check`);

    const invalidIds: string[] = [];
    const validCount = { total: 0, nice: 0, other: 0 };
    const invalidCount = { total: 0, nice: 0, other: 0 };

    for (const guideline of guidelines || []) {
      const isNice = isNiceGuideline(guideline);
      const isValid = hasValidUrl(guideline);

      if (!isValid && guideline.is_active) {
        invalidIds.push(guideline.id);
        invalidCount.total++;
        if (isNice) invalidCount.nice++;
        else invalidCount.other++;
        
        console.log(`Invalid guideline found: "${guideline.title}" (${isNice ? 'NICE' : 'Other'})`);
      } else if (isValid) {
        validCount.total++;
        if (isNice) validCount.nice++;
        else validCount.other++;
      }
    }

    console.log(`Valid guidelines: ${validCount.total} (NICE: ${validCount.nice}, Other: ${validCount.other})`);
    console.log(`Invalid guidelines: ${invalidCount.total} (NICE: ${invalidCount.nice}, Other: ${invalidCount.other})`);

    // Deactivate invalid guidelines
    if (invalidIds.length > 0) {
      const { error: updateError } = await supabase
        .from('evidence')
        .update({ is_active: false })
        .in('id', invalidIds);

      if (updateError) {
        console.error('Error deactivating invalid guidelines:', updateError);
        throw updateError;
      }

      console.log(`Successfully deactivated ${invalidIds.length} invalid guidelines`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete: ${invalidIds.length} invalid guidelines deactivated`,
        deactivated: invalidIds.length,
        validGuidelines: validCount,
        invalidGuidelines: invalidCount,
        details: {
          totalChecked: guidelines?.length || 0,
          deactivatedIds: invalidIds
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in cleanup-invalid-guidelines:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
