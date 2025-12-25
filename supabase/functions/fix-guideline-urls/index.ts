import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[FIX-URLS] Starting URL fix process');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Strict mapping of keywords to correct URLs - only apply when there's a clear match
    const urlMappings = [
      {
        keywords: ['low back pain and sciatica', 'sciatica', 'lumbar radiculopathy'],
        url: 'https://www.nice.org.uk/guidance/ng59',
        doi: 'ng59',
        title: 'Low back pain and sciatica in over 16s: assessment and management'
      },
      {
        keywords: ['stroke', 'cerebrovascular'],
        url: 'https://www.nice.org.uk/guidance/ng236',
        doi: 'ng236',
        title: 'Stroke rehabilitation in adults'
      },
      {
        keywords: ['copd', 'chronic obstructive pulmonary', 'emphysema'],
        url: 'https://www.nice.org.uk/guidance/ng115',
        doi: 'ng115',
        title: 'Chronic obstructive pulmonary disease in over 16s: diagnosis and management'
      },
      {
        keywords: ['osteoarthritis in over 16s', 'osteoarthritis: diagnosis and management'],
        url: 'https://www.nice.org.uk/guidance/ng226',
        doi: 'ng226',
        title: 'Osteoarthritis in over 16s: diagnosis and management'
      },
      {
        keywords: ['physical activity', 'exercise'],
        url: 'https://www.nice.org.uk/guidance/ph44',
        doi: 'ph44',
        title: 'Physical activity: brief advice for adults in primary care'
      },
      {
        keywords: ['rheumatoid arthritis', 'rheumatoid', 'ra'],
        url: 'https://www.nice.org.uk/guidance/ng100',
        doi: 'ng100',
        title: 'Rheumatoid arthritis in adults: management'
      },
      {
        keywords: ['psoriatic arthritis', 'psoriatic', 'psa'],
        url: 'https://www.nice.org.uk/guidance/ng220',
        doi: 'ng220',
        title: 'Psoriatic arthritis'
      },
      {
        keywords: ['ankylosing spondylitis', 'axial spondyloarthritis', 'as'],
        url: 'https://www.nice.org.uk/guidance/ng65',
        doi: 'ng65',
        title: 'Spondyloarthritis in over 16s: diagnosis and management'
      },
      {
        keywords: ['juvenile idiopathic arthritis', 'jia'],
        url: 'https://www.nice.org.uk/guidance/ng18',
        doi: 'ng18',
        title: 'Juvenile idiopathic arthritis'
      },
      {
        keywords: ['gout'],
        url: 'https://www.nice.org.uk/guidance/ng219',
        doi: 'ng219',
        title: 'Gout: diagnosis and management'
      },
      {
        keywords: ['shoulder pain'],
        url: 'https://www.nice.org.uk/guidance/cg59',
        doi: 'cg59',
        title: 'Shoulder problems: management'
      },
      {
        keywords: ['neck pain', 'cervical'],
        url: 'https://www.nice.org.uk/guidance/ng59',
        doi: 'ng59',
        title: 'Low back pain and sciatica in over 16s: assessment and management'
      },
      {
        keywords: ['hip fracture'],
        url: 'https://www.nice.org.uk/guidance/cg124',
        doi: 'cg124',
        title: 'Hip fracture: management'
      },
      {
        keywords: ['knee replacement', 'joint replacement'],
        url: 'https://www.nice.org.uk/guidance/cg157',
        doi: 'cg157',
        title: 'Osteoarthritis: care and management'
      },
      {
        keywords: ['fractures', 'non-complex fractures'],
        url: 'https://www.nice.org.uk/guidance/ng38',
        doi: 'ng38',
        title: 'Fractures (non-complex): assessment and management'
      },
      {
        keywords: ['falls', 'fall prevention', 'balance'],
        url: 'https://www.nice.org.uk/guidance/cg161',
        doi: 'cg161',
        title: 'Falls in older people: assessing risk and prevention'
      },
      {
        keywords: ['fibromyalgia'],
        url: 'https://www.nice.org.uk/guidance/cg193',
        doi: 'cg193',
        title: 'Chronic pain (primary): assessment and management'
      },
      {
        keywords: ['chronic pain', 'pain management'],
        url: 'https://www.nice.org.uk/guidance/ng193',
        doi: 'ng193',
        title: 'Chronic pain (primary): assessment and management'
      },
      {
        keywords: ['multiple sclerosis', 'ms'],
        url: 'https://www.nice.org.uk/guidance/ng220',
        doi: 'ng220',
        title: 'Multiple sclerosis in adults: management'
      },
      {
        keywords: ['spinal injury', 'spinal cord'],
        url: 'https://www.nice.org.uk/guidance/ng41',
        doi: 'ng41',
        title: 'Spinal injury: assessment and initial management'
      },
      {
        keywords: ['parkinson', 'parkinsons'],
        url: 'https://www.nice.org.uk/guidance/ng71',
        doi: 'ng71',
        title: "Parkinson's disease in adults"
      },
      {
        keywords: ['systemic lupus erythematosus', 'lupus', 'sle'],
        url: 'https://www.nice.org.uk/guidance/ng95',
        doi: 'ng95',
        title: 'Lupus'
      },
      {
        keywords: ['polymyalgia rheumatica', 'giant cell arteritis', 'pmr'],
        url: 'https://www.nice.org.uk/guidance/ng108',
        doi: 'ng108',
        title: 'Polymyalgia rheumatica and giant cell arteritis: diagnosis and management'
      },
      {
        keywords: ['vasculitis'],
        url: 'https://www.nice.org.uk/guidance/ng77',
        doi: 'ng77',
        title: 'Vasculitis'
      }
    ];

    // Fetch all clinical guidelines in one query
    const { data: allGuidelines, error: fetchError } = await supabase
      .from('evidence')
      .select('id, title, abstract, tags, grade_assessment, doi')
      .eq('study_type', 'Clinical Practice Guideline');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[FIX-URLS] Found ${allGuidelines?.length || 0} guidelines to process`);

    if (!allGuidelines || allGuidelines.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No guidelines found to update',
          updatedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Match guidelines to URLs and prepare batch updates
    const updates: Array<{ id: string; grade_assessment: any; doi: string }> = [];

    for (const guideline of allGuidelines) {
      const titleLower = (guideline.title || '').toLowerCase();
      const abstractLower = (guideline.abstract || '').toLowerCase();
      const tags = (guideline.tags || []).map((t: string) => t.toLowerCase());
      const allText = `${titleLower} ${abstractLower} ${tags.join(' ')}`;

      // Find matching URL mapping - require strong match
      for (const mapping of urlMappings) {
        // Require at least one exact phrase match for precision
        const hasStrongMatch = mapping.keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          // For multi-word keywords, require the full phrase
          if (keywordLower.includes(' ')) {
            return allText.includes(keywordLower);
          }
          // For single words, require word boundaries
          const regex = new RegExp(`\\b${keywordLower}\\b`, 'i');
          return regex.test(allText);
        });

        if (hasStrongMatch) {
          const updatedGradeAssessment = {
            ...(guideline.grade_assessment || {}),
            url: mapping.url,
            title: mapping.title,
            auto_matched: true
          };

          updates.push({
            id: guideline.id,
            grade_assessment: updatedGradeAssessment,
            doi: mapping.doi
          });
          console.log(`[FIX-URLS] Matched: "${guideline.title.substring(0, 40)}..." -> ${mapping.doi}`);
          break; // Found a match, move to next guideline
        }
      }
    }

    console.log(`[FIX-URLS] Prepared ${updates.length} updates`);

    // Execute all updates in parallel for speed
    const updatePromises = updates.map(update =>
      supabase
        .from('evidence')
        .update({ 
          grade_assessment: update.grade_assessment,
          doi: update.doi
        })
        .eq('id', update.id)
    );

    const results = await Promise.allSettled(updatePromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`[FIX-URLS] Updated ${successCount} guidelines successfully, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fixed ${successCount} guideline URLs`,
        updatedCount: successCount,
        failedCount: failCount,
        totalProcessed: allGuidelines.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[FIX-URLS] Error:', err);
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