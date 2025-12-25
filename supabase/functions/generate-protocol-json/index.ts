import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { condition } = await req.json();
    if (!condition?.name) {
      return new Response(
        JSON.stringify({ error: 'Missing condition data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');

    const messages = [
      {
        role: 'system',
        content:
          'You are Dr. PhysioAI, an expert physiotherapy assistant. Respond by calling the provided function with a complete, evidence-aware protocol. Never return free text when a function is available.',
      },
      {
        role: 'user',
        content:
          `Create a detailed evidence-based treatment protocol for ${condition.name}.\n\nReturn a structured object with:\n- name (<=100 chars)\n- description (2-3 paragraphs)\n- protocol_steps: array of steps with title and description\n- duration_weeks (number)\n- frequency_per_week (number)\n- contraindications (array of strings)\n- precautions (array of strings)\n- expected_outcomes (paragraph)`,
      },
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'build_protocol',
          description: 'Return a structured treatment protocol for a condition',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', maxLength: 100 },
              description: { type: 'string' },
              protocol_steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['title', 'description'],
                  additionalProperties: true,
                },
              },
              duration_weeks: { type: 'number' },
              frequency_per_week: { type: 'number' },
              contraindications: { type: 'array', items: { type: 'string' } },
              precautions: { type: 'array', items: { type: 'string' } },
              expected_outcomes: { type: 'string' },
            },
            required: [
              'name',
              'description',
              'protocol_steps',
              'duration_weeks',
              'frequency_per_week',
              'contraindications',
              'precautions',
              'expected_outcomes',
            ],
            additionalProperties: false,
          },
        },
      },
    ];

    const body = {
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: { type: 'function', function: { name: 'build_protocol' } },
    };

    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, txt);

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'OpenAI rate limit exceeded. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (aiResp.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key. Please check your configuration.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ error: 'OpenAI API error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResp.json();
    let protocol: any | null = null;

    const toolCalls = data?.choices?.[0]?.message?.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls[0]?.function?.arguments) {
      try {
        protocol = JSON.parse(toolCalls[0].function.arguments);
      } catch (e) {
        console.error('Failed to parse tool arguments:', e);
      }
    }

    if (!protocol) {
      const content = data?.choices?.[0]?.message?.content;
      console.warn('No tool_calls found; attempting content JSON parse');
      if (typeof content === 'string') {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try { protocol = JSON.parse(match[0]); } catch (_) { /* ignore */ }
        }
      }
    }

    if (!protocol) {
      return new Response(
        JSON.stringify({ error: 'AI did not return a structured protocol' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ protocol }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-protocol-json error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});