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
    const {
      searchTerms = 'physiotherapy physical therapy',
      sources = ['pubmed', 'cochrane', 'pedro', 'guidelines'],
      maxResults = 20,
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[evidence-sync] Start for terms="${searchTerms}" sources=${sources.join(',')}`);

    const results: {
      success: boolean;
      sources_processed: Array<{
        source: string;
        success: boolean;
        message: string;
        count: number;
      }>;
      total_articles: number;
      errors: Array<{
        source: string;
        error: string;
        message: string;
      }>;
    } = {
      success: true,
      sources_processed: [],
      total_articles: 0,
      errors: [],
    };

    // Ensure we don't exceed CF/edge timeouts: cap per-source work and run sequentially
    const perSourceMax = Math.max(3, Math.min(10, Math.floor(maxResults / Math.max(sources.length, 1)) || 5));
    const perSourceTimeoutMs = 20000; // 20s per source

    async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
      let timeoutId: number | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms) as unknown as number;
      });
      try {
        return await Promise.race([promise, timeout]);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    }

    for (const source of sources) {
      try {
        console.log(`[evidence-sync] Processing ${source} (max=${perSourceMax})`);

        const { data, error } = await withTimeout(
          supabase.functions.invoke(`${source}-integration`, {
            body: {
              searchTerms,
              maxResults: perSourceMax,
              condition: 'musculoskeletal',
            },
          }),
          perSourceTimeoutMs,
          `${source}-integration`
        );

        if (error) {
          console.warn(`[evidence-sync] ${source} returned error`, error?.message || error);
          results.errors.push({
            source,
            error: error.message || 'Invocation error',
            message: 'Function invocation failed',
          });
          continue;
        }

        const count =
          (data?.articles?.length as number | undefined) ||
          (data?.reviews?.length as number | undefined) ||
          (data?.studies?.length as number | undefined) ||
          (data?.guidelines?.length as number | undefined) ||
          0;

        results.sources_processed.push({
          source,
          success: true,
          message: data?.message || 'Completed',
          count,
        });
        results.total_articles += count;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[evidence-sync] ${source} failed: ${msg}`);
        results.errors.push({ source, error: msg, message: 'Function call failed' });
      }
    }

    console.log(
      `[evidence-sync] Completed: total=${results.total_articles} ok=${results.sources_processed.length} err=${results.errors.length}`
    );

    return new Response(
      JSON.stringify({
        ...results,
        message: `Evidence sync completed. Processed ${results.total_articles} items from ${results.sources_processed.length} sources.`,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[evidence-sync] Top-level failure:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, message: 'Evidence sync failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});