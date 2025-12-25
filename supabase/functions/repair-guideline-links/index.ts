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
    console.log('[REPAIR-LINKS] Starting guideline link repair process');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all clinical guidelines with NICE guidance URLs
    const { data: allGuidelines, error: fetchError } = await supabase
      .from('evidence')
      .select('id, title, abstract, tags, grade_assessment, doi, journal')
      .eq('study_type', 'Clinical Practice Guideline');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[REPAIR-LINKS] Found ${allGuidelines?.length || 0} guidelines to check`);

    if (!allGuidelines || allGuidelines.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No guidelines found',
          repairedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define problematic code mappings to check
    const problematicMappings: Record<string, string[]> = {
      'ng226': ['osteoarthritis', 'oa'], // Should only be OA-related
      'ng59': ['low back pain', 'sciatica', 'back pain'],
      'ng236': ['stroke', 'cerebrovascular'],
      'ng115': ['copd', 'chronic obstructive pulmonary'],
    };

    const repairs: Array<{ id: string; grade_assessment: any; reason: string; code: string }> = [];

    for (const guideline of allGuidelines) {
      const gradeAssessment = guideline.grade_assessment as any;
      const currentUrl = gradeAssessment?.url || '';
      
      // Extract NICE code from URL if present
      const codeMatch = currentUrl.match(/\/(ng\d+|cg\d+|qs\d+)$/i);
      if (!codeMatch) continue;
      
      const code = codeMatch[1].toLowerCase();
      if (!problematicMappings[code]) continue;

      const titleLower = (guideline.title || '').toLowerCase();
      const abstractLower = (guideline.abstract || '').toLowerCase();
      const tags = (guideline.tags || []).map((t: string) => t.toLowerCase());
      const allText = `${titleLower} ${abstractLower} ${tags.join(' ')}`;

      // Check if content matches expected keywords for this code
      const expectedKeywords = problematicMappings[code];
      const hasMatch = expectedKeywords.some(keyword => allText.includes(keyword));

      if (!hasMatch) {
        // This is a mismatch - content doesn't match the NICE code
        console.log(`[REPAIR-LINKS] Mismatch found: ${code} for "${guideline.title.substring(0, 50)}..."`);
        
        // Build fallback URL based on available info
        let fallbackUrl = '#';
        
        // Try to build a CKS search from title/tags
        const cleanTitle = (guideline.title || '')
          .replace(/\b(guideline|guidelines|nice|clinical|practice|recommendations?|evidence|rehabilitation|physiotherapy)\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        
        const primaryTag = tags.find(t => 
          !/(guideline|guidelines|nice|clinical|practice|evidence)/.test(t)
        );
        
        const queryParts: string[] = [];
        if (cleanTitle) queryParts.push(cleanTitle);
        if (primaryTag) queryParts.push(primaryTag);
        
        const query = queryParts.join(' ').trim();
        
        if (query) {
          fallbackUrl = `https://cks.nice.org.uk/#?q=${encodeURIComponent(query)}`;
        } else {
          // Use journal-specific fallback if available
          const journalLower = (guideline.journal || '').toLowerCase();
          if (journalLower.includes('trip')) {
            fallbackUrl = `https://www.tripdatabase.com/search?criteria=${encodeURIComponent(guideline.title || 'physiotherapy')}`;
          } else if (journalLower.includes('epistemonikos')) {
            fallbackUrl = `https://www.epistemonikos.org/en/search?q=${encodeURIComponent(guideline.title || 'physiotherapy')}&classification=systematic-review`;
          } else if (journalLower.includes('who')) {
            fallbackUrl = `https://www.who.int/publications/guidelines?keywords=${encodeURIComponent(guideline.title || 'rehabilitation')}`;
          }
        }

        repairs.push({
          id: guideline.id,
          grade_assessment: {
            ...gradeAssessment,
            url: fallbackUrl,
            repaired: true,
            original_url: currentUrl,
            repair_reason: `Content mismatch with ${code.toUpperCase()}`
          },
          reason: `Content does not match ${code.toUpperCase()} (${expectedKeywords.join(', ')})`,
          code: code
        });
      }
    }

    console.log(`[REPAIR-LINKS] Prepared ${repairs.length} repairs`);

    // Log repair summary by code
    const repairsByCode: Record<string, number> = {};
    repairs.forEach(r => {
      repairsByCode[r.code] = (repairsByCode[r.code] || 0) + 1;
    });
    console.log('[REPAIR-LINKS] Repairs by code:', repairsByCode);

    // Execute all repairs in parallel
    const updatePromises = repairs.map(repair =>
      supabase
        .from('evidence')
        .update({ grade_assessment: repair.grade_assessment })
        .eq('id', repair.id)
    );

    const results = await Promise.allSettled(updatePromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`[REPAIR-LINKS] Repaired ${successCount} guidelines, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Repaired ${successCount} mismatched guideline links`,
        repairedCount: successCount,
        failedCount: failCount,
        totalChecked: allGuidelines.length,
        repairsByCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[REPAIR-LINKS] Error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : String(err)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
