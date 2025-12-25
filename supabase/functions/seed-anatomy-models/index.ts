// Seed demo 3D anatomy models into Supabase Storage (anatomy-models bucket)
// Public CORS and simple JSON API
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface SeedRequest {
  regions?: string[]; // e.g., ["head"]
}

// Demo sources (public GLB models)
const DEMO_MODELS: Record<string, string> = {
  // Map region -> public GLB URL
  head: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb',
  skull: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Skull/glTF-Binary/Skull.glb',
};

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function uploadModelFromUrl(supabase: any, path: string, sourceUrl: string) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed fetching ${sourceUrl}: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const contentType = 'model/gltf-binary';
  // Upsert to ensure idempotency
  const { error } = await supabase.storage
    .from('anatomy-models')
    .upload(path, new Uint8Array(arrayBuf), { contentType, upsert: true });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    const body = (await req.json().catch(() => ({}))) as SeedRequest;
    const regions = body.regions && body.regions.length > 0 ? body.regions : ['head'];

    const results: Record<string, string> = {};

    for (const region of regions) {
      const key = region.toLowerCase();
      const source = DEMO_MODELS[key];
      if (!source) {
        results[key] = 'skipped: no demo source available';
        continue;
      }
      const path = `${key}.glb`;
      await uploadModelFromUrl(supabase, path, source);
      results[key] = 'uploaded';
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'content-type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      headers: { 'content-type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});