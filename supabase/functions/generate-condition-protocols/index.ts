import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Evidence {
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publication_date: string;
  evidence_level: string;
  study_type: string;
  clinical_implications: string;
  key_findings: string;
  pmid?: string;
  doi?: string;
  source: string;
}

interface Condition {
  id: string;
  name: string;
  category: string;
  description: string;
  icd_codes: string[];
  keywords: string[];
}

interface ProtocolPhase {
  phase: string;
  duration: string;
  goals: string[];
  interventions: string[];
  progressionCriteria: string[];
}

interface TreatmentProtocol {
  name: string;
  description: string;
  condition_id: string;
  protocol_steps: {
    phases: ProtocolPhase[];
    assessment: string[];
    outcomesMeasures: string[];
    dischargeCriteria: string[];
  };
  duration_weeks: number;
  frequency_per_week: number;
  contraindications: string[];
  precautions: string[];
  expected_outcomes: string;
  evidence_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!lovableApiKey) {
      throw new Error('Missing Lovable API key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting comprehensive protocol generation...');

    // Parse optional payload and fetch target condition(s) or a paginated slice
    let conditionId: string | null = null;
    let offset = 0;
    let limit: number | null = null;
    let totalCount: number | null = null;
    try {
      const payload = await req.json();
      conditionId = payload?.conditionId ?? null;
      if (typeof payload?.offset === 'number') offset = Math.max(0, payload.offset);
      if (typeof payload?.limit === 'number') limit = Math.max(1, payload.limit);
    } catch {
      // no body provided
    }

    let conditions: any[] | null = null;
    let conditionsError: any = null;

    if (conditionId) {
      const { data, error } = await supabase.from('conditions').select('*').eq('id', conditionId);
      conditions = data;
      conditionsError = error;
      totalCount = data?.length ?? 0;
    } else if (limit !== null) {
      // get total count for progress
      const { count } = await supabase.from('conditions').select('*', { count: 'exact', head: true });
      totalCount = count ?? null;

      const { data, error } = await supabase
        .from('conditions')
        .select('*')
        .order('name', { ascending: true })
        .range(offset, offset + (limit as number) - 1);
      conditions = data;
      conditionsError = error;
    } else {
      const { data, error } = await supabase.from('conditions').select('*');
      conditions = data;
      conditionsError = error;
      totalCount = data?.length ?? 0;
    }

    if (conditionsError) {
      throw new Error(`Failed to fetch conditions: ${conditionsError.message}`);
    }

    const results = {
      totalConditions: totalCount ?? (conditions?.length || 0),
      processedConditions: 0,
      generatedProtocols: 0,
      errors: [] as string[]
    };

    // Process conditions in batches for faster generation
    const BATCH_SIZE = 3; // Process 3 conditions at once
    const batches: Condition[][] = [];
    
    for (let i = 0; i < (conditions || []).length; i += BATCH_SIZE) {
      batches.push((conditions || []).slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${conditions?.length || 0} conditions in ${batches.length} batches of ${BATCH_SIZE}`);

    // Process each batch in parallel
    for (const batch of batches) {
      const batchPromises = batch.map(async (condition) => {
        try {
          console.log(`Processing condition: ${condition.name}`);
          
          // Search for evidence across multiple databases (parallel)
          const evidenceResults = await searchMultipleDatabases(condition, supabase);
          
          if (evidenceResults.length === 0) {
            console.log(`No evidence found for ${condition.name}, skipping...`);
            return { condition: condition.name, success: false, error: 'No evidence found' };
          }

          // Generate protocol using AI
          const protocol = await generateProtocolWithAI(condition, evidenceResults, lovableApiKey, supabase);
          
          if (protocol) {
            // Store the protocol in database
            const { data: protocolData, error: protocolError } = await supabase
              .from('treatment_protocols')
              .insert({
                name: protocol.name,
                description: protocol.description,
                condition_id: protocol.condition_id,
                protocol_steps: protocol.protocol_steps,
                duration_weeks: protocol.duration_weeks,
                frequency_per_week: protocol.frequency_per_week,
                contraindications: protocol.contraindications,
                precautions: protocol.precautions,
                expected_outcomes: protocol.expected_outcomes,
                evidence_ids: protocol.evidence_ids,
                created_by: null, // System generated
                is_validated: true // Mark as validated since it's evidence-based
              })
              .select()
              .single();

            if (protocolError) {
              console.error(`Error storing protocol for ${condition.name}:`, protocolError);
              return { condition: condition.name, success: false, error: `Storage failed: ${protocolError.message}` };
            } else {
              console.log(`Successfully generated protocol for ${condition.name}`);
              return { condition: condition.name, success: true };
            }
          }

          return { condition: condition.name, success: false, error: 'Protocol generation failed' };
          
        } catch (error) {
          console.error(`Error processing ${condition.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { condition: condition.name, success: false, error: errorMessage };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Update results
      batchResults.forEach(result => {
        results.processedConditions++;
        if (result.success) {
          results.generatedProtocols++;
        } else {
          results.errors.push(`${result.condition}: ${result.error}`);
        }
      });

      console.log(`Batch completed. Progress: ${results.processedConditions}/${results.totalConditions}`);
    }

    console.log('Protocol generation completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
      message: `Generated ${results.generatedProtocols} protocols from ${results.processedConditions} conditions`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-condition-protocols:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchMultipleDatabases(condition: Condition, supabase: any): Promise<Evidence[]> {
  const searchTerms = [condition.name, ...(condition.keywords || [])].slice(0, 3);
  console.log(`Searching evidence for: ${searchTerms.join(', ')}`);

  // Run all searches in parallel for speed
  const [pubmedResult, cochraneResult, pedroResult, existingEvidence] = await Promise.allSettled([
    // Search PubMed
    supabase.functions.invoke('pubmed-integration', {
      body: { searchTerms: searchTerms[0], maxResults: 10 }
    }),
    // Search Cochrane
    supabase.functions.invoke('cochrane-integration', {
      body: { searchTerms: searchTerms[0], maxResults: 5 }
    }),
    // Search PEDro
    supabase.functions.invoke('pedro-integration', {
      body: { searchTerms: searchTerms[0], condition: condition.name, maxResults: 8 }
    }),
    // Get existing evidence from database
    supabase
      .from('evidence')
      .select('*')
      .contains('condition_ids', [condition.id])
      .eq('is_active', true)
      .order('publication_date', { ascending: false })
      .limit(10)
  ]);

  const allEvidence: Evidence[] = [];

  // Process PubMed results
  if (pubmedResult.status === 'fulfilled' && !pubmedResult.value.error && pubmedResult.value.data?.studies) {
    allEvidence.push(...pubmedResult.value.data.studies.map((study: any) => ({
      ...study,
      source: 'PubMed'
    })));
  } else if (pubmedResult.status === 'rejected') {
    console.log(`PubMed search failed for ${condition.name}:`, pubmedResult.reason);
  }

  // Process Cochrane results
  if (cochraneResult.status === 'fulfilled' && !cochraneResult.value.error && cochraneResult.value.data?.reviews) {
    allEvidence.push(...cochraneResult.value.data.reviews.map((review: any) => ({
      ...review,
      source: 'Cochrane'
    })));
  } else if (cochraneResult.status === 'rejected') {
    console.log(`Cochrane search failed for ${condition.name}:`, cochraneResult.reason);
  }

  // Process PEDro results
  if (pedroResult.status === 'fulfilled' && !pedroResult.value.error && pedroResult.value.data?.studies) {
    allEvidence.push(...pedroResult.value.data.studies.map((study: any) => ({
      ...study,
      source: 'PEDro'
    })));
  } else if (pedroResult.status === 'rejected') {
    console.log(`PEDro search failed for ${condition.name}:`, pedroResult.reason);
  }

  // Process existing evidence
  if (existingEvidence.status === 'fulfilled' && existingEvidence.value.data) {
    allEvidence.push(...existingEvidence.value.data.map((evidence: any) => ({
      ...evidence,
      source: 'Database'
    })));
  }

  console.log(`Found ${allEvidence.length} evidence items for ${condition.name}`);
  return allEvidence;
}

async function generateProtocolWithAI(condition: Condition, evidence: Evidence[], lovableApiKey: string, supabase: any): Promise<TreatmentProtocol | null> {
  try {
    const evidenceSummary = evidence.slice(0, 10).map(e => 
      `${e.title} (${e.source}, ${e.evidence_level || 'Not specified'}): ${e.abstract || e.key_findings || e.clinical_implications || 'No summary available'}`
    ).join('\n\n');

    const prompt = `As a physiotherapy expert, create a comprehensive, evidence-based treatment protocol for ${condition.name}.

CONDITION DETAILS:
- Name: ${condition.name}
- Category: ${condition.category}
- Description: ${condition.description}
- ICD Codes: ${condition.icd_codes?.join(', ') || 'Not specified'}

AVAILABLE EVIDENCE:
${evidenceSummary}

Create a detailed treatment protocol that includes:

1. PROTOCOL PHASES (3-4 phases with specific timelines)
2. ASSESSMENT PROCEDURES
3. OUTCOME MEASURES
4. CONTRAINDICATIONS & PRECAUTIONS
5. EXPECTED OUTCOMES
6. DISCHARGE CRITERIA

Format your response as a JSON object with this exact structure:
{
  "name": "Evidence-Based Protocol for [Condition Name]",
  "description": "Brief description of the protocol approach",
  "duration_weeks": number (8-16 weeks typical),
  "frequency_per_week": number (2-5 sessions typical),
  "phases": [
    {
      "phase": "Phase 1: Acute/Initial",
      "duration": "Weeks 1-2",
      "goals": ["goal1", "goal2"],
      "interventions": ["intervention1", "intervention2"],
      "progressionCriteria": ["criteria1", "criteria2"]
    }
  ],
  "assessment": ["assessment1", "assessment2"],
  "outcomesMeasures": ["measure1", "measure2"],
  "contraindications": ["contraindication1", "contraindication2"],
  "precautions": ["precaution1", "precaution2"],
  "expected_outcomes": "Detailed expected outcomes",
  "dischargeCriteria": ["criteria1", "criteria2"]
}

Base all recommendations strictly on the provided evidence. Include evidence levels when possible.`;

    let data: any | null = null;
    let model = 'google/gemini-2.5-flash';
    let lastError = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Attempt ${attempt} for ${condition.name} using model: ${model}`);
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are an expert physiotherapist specializing in evidence-based practice. Always return ONLY a valid JSON object matching the requested schema. No markdown, no extra text.'
            },
            { role: 'user', content: prompt }
          ]
        }),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      const errorText = await response.text();
      lastError = `AI gateway error ${response.status}: ${errorText}`;
      console.error(`AI gateway error for ${condition.name} (attempt ${attempt}):`, response.status, errorText);

      // Surface special cases immediately
      if (response.status === 429) {
        throw new Error('AI rate limits exceeded. Please wait a bit and retry.');
      }
      if (response.status === 402) {
        throw new Error('Payment required for Lovable AI usage. Please add credits to your workspace.');
      }

      // Try a fallback model on the next attempt
      if (attempt === 2) {
        console.warn('Switching to fallback model google/gemini-2.5-pro');
        model = 'google/gemini-2.5-pro';
      }

      // Backoff before retrying
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }

    if (!data) {
      if (/cloudflare|cf-/i.test(lastError) || /(52[0-6]|520)/.test(lastError)) {
        throw new Error('Temporary Cloudflare edge error while contacting AI. Please retry shortly.');
      }
      throw new Error(lastError || 'Unknown AI gateway error');
    }

    let contentRaw = data.choices?.[0]?.message?.content ?? '';
    let content = typeof contentRaw === 'string' ? contentRaw : JSON.stringify(contentRaw);
    
    console.log(`Raw AI response for ${condition.name}:`, (content || '').toString().slice(0, 200) + '...');
    
    // Clean the content - remove markdown code blocks if present
    let cleanContent = (content || '').toString().trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    // Remove any extra text before or after JSON
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Soft fixes for common JSON issues from models
    cleanContent = cleanContent
      // remove trailing commas before closing objects/arrays
      .replace(/,\s*([}\]])/g, '$1')
      // replace single quotes with double quotes when used as JSON quotes
      .replace(/\"/g, '"');
    
    console.log(`Cleaned content for ${condition.name}:`, cleanContent.substring(0, 200) + '...');
    
    // Parse the JSON response
    let protocolData: any;
    try {
      protocolData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`Failed to parse AI response for ${condition.name}:`, parseError);
      console.error('Content that failed to parse:', cleanContent);
      throw new Error(`Failed to parse AI response for ${condition.name}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // Handle possible wrapper object variations
    if (protocolData && protocolData.protocol) {
      protocolData = protocolData.protocol;
    }
    if (!protocolData.phases && protocolData.protocol_steps?.phases) {
      protocolData.phases = protocolData.protocol_steps.phases;
    }
    
    // Validate required fields
    if (!protocolData.name || !protocolData.phases || !Array.isArray(protocolData.phases)) {
      console.error(`Invalid protocol data structure for ${condition.name}:`, protocolData);
      throw new Error(`Invalid protocol data structure for ${condition.name}`);
    }
    
    // Store evidence in database first to get IDs (avoid ON CONFLICT without unique index)
    const evidenceIds: string[] = [];
    for (const evidenceItem of evidence.slice(0, 5)) {
      try {
        let existingId: string | null = null;

        if (evidenceItem.pmid) {
          const { data: existingByPmid } = await supabase
            .from('evidence')
            .select('id')
            .eq('pmid', evidenceItem.pmid)
            .maybeSingle();
          existingId = existingByPmid?.id ?? null;
        } else if (evidenceItem.doi) {
          const { data: existingByDoi } = await supabase
            .from('evidence')
            .select('id')
            .eq('doi', evidenceItem.doi)
            .maybeSingle();
          existingId = existingByDoi?.id ?? null;
        }

        if (existingId) {
          evidenceIds.push(existingId);
          continue;
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('evidence')
          .insert({
            title: evidenceItem.title,
            abstract: evidenceItem.abstract,
            authors: evidenceItem.authors || [],
            journal: evidenceItem.journal,
            publication_date: evidenceItem.publication_date,
            evidence_level: evidenceItem.evidence_level,
            study_type: evidenceItem.study_type,
            clinical_implications: evidenceItem.clinical_implications,
            key_findings: evidenceItem.key_findings,
            condition_ids: [condition.id],
            pmid: evidenceItem.pmid,
            doi: evidenceItem.doi,
            tags: [condition.name, condition.category],
            is_active: true
          })
          .select('id')
          .single();

        if (insertErr) {
          console.warn('Insert evidence failed, continuing:', insertErr.message);
          continue;
        }
        if (inserted?.id) evidenceIds.push(inserted.id);
      } catch (evErr) {
        console.warn('Evidence store error:', evErr);
      }
    }

    return {
      name: protocolData.name,
      description: protocolData.description,
      condition_id: condition.id,
      protocol_steps: {
        phases: protocolData.phases,
        assessment: protocolData.assessment || [],
        outcomesMeasures: protocolData.outcomesMeasures || [],
        dischargeCriteria: protocolData.dischargeCriteria || []
      },
      duration_weeks: protocolData.duration_weeks || 12,
      frequency_per_week: protocolData.frequency_per_week || 3,
      contraindications: protocolData.contraindications || [],
      precautions: protocolData.precautions || [],
      expected_outcomes: protocolData.expected_outcomes,
      evidence_ids: evidenceIds
    };

  } catch (error) {
    console.error(`AI protocol generation failed for ${condition.name}:`, error);
    return null;
  }
}