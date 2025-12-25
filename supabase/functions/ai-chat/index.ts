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
    const { messages, context, specialty, useStream } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build specialty-specific system prompt
    const specialtyPrompts: Record<string, string> = {
      physiotherapy: "You are Dr. PhysioAI, an expert physiotherapy AI assistant. Provide evidence-based clinical guidance for general physiotherapy practice.",
      musculoskeletal: "You are Dr. PhysioAI, specialized in musculoskeletal physiotherapy. Focus on MSK assessment, diagnosis, and treatment planning with current evidence.",
      neurological: "You are Dr. PhysioAI, specialized in neurological rehabilitation. Provide guidance on neuro assessment, treatment strategies, and evidence-based interventions.",
      cardiopulmonary: "You are Dr. PhysioAI, specialized in cardiopulmonary physiotherapy. Focus on cardiovascular and respiratory rehabilitation.",
      sports: "You are Dr. PhysioAI, specialized in sports physiotherapy. Provide guidance on sports injury assessment, rehabilitation, and performance optimization.",
      research: "You are Dr. PhysioAI, an expert in physiotherapy research and evidence interpretation. Help analyze and apply research findings to clinical practice."
    };

    const systemPrompt = `${specialtyPrompts[specialty] || specialtyPrompts.physiotherapy}

Key guidelines:
- Provide evidence-based recommendations citing recent research when relevant
- Use clear, professional language appropriate for healthcare practitioners
- Consider patient safety and contraindications
- Suggest appropriate assessment and outcome measures
- Recommend evidence-based interventions
- Include patient education points when relevant
${context ? `\n\nAdditional context: ${context}` : ''}

Remember: Always emphasize the importance of clinical reasoning and individualized patient care.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log('Calling Lovable AI with specialty:', specialty, 'streaming:', useStream);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: useStream || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to your Lovable workspace." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    // If streaming, return the stream directly
    if (useStream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming response
    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response.";

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
