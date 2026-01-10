import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ⚠️ TESTING MODE - Set to false when ready for production
const TESTING_MODE = true

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const CREDIT_COSTS = {
  'generate': 6,
  'edit': 4,
  'remove-bg': 3,
  'upscale': 5,
  'text': 1,
  'analyze': 2,
  'download': 1
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, imageBase64, style, action, context, imageUrl, videoUrl } = await req.json()
    
    // ONLY check credits if NOT in testing mode
    if (!TESTING_MODE) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const creditsNeeded = CREDIT_COSTS[action] || 1
      const { data: deductResult, error: deductError } = await supabase
        .rpc('deduct_credits', {
          p_user_id: user.id,
          p_action: action,
          p_credits_needed: creditsNeeded,
          p_metadata: { action, prompt: prompt?.substring(0, 100), timestamp: new Date().toISOString() }
        })

      if (deductError || !deductResult?.success) {
        return new Response(
          JSON.stringify({
            error: 'insufficient_credits',
            credits_needed: creditsNeeded,
            credits_available: deductResult?.credits_available || 0
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    // ========================================
    // TEXT-ONLY ACTIONS (analysis, text generation)
    // ========================================
    
    if (action === 'text' || action === 'analyze') {
      const textPrompt = prompt || context || "Analyze this content.";
      
      // Call TEXT API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: textPrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        }
      );

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        throw new Error("AI did not return text. It might have been blocked.");
      }

      return new Response(
        JSON.stringify({ 
          text: textContent,
          summary: textContent,
          credits_remaining: TESTING_MODE ? 999 : undefined
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 200 
        }
      );
    }

    // ========================================
    // IMAGE GENERATION ACTIONS
    // ========================================
    
    let finalPrompt = prompt || "";
    
    if (action === 'upscale') {
      finalPrompt = "Upscale and enhance this image. Improve clarity, textures, and sharpness while keeping it realistic.";
    } else if (action === 'remove-bg') {
      finalPrompt = "Remove the background completely and make it transparent or solid white.";
    } else if (action === 'edit') {
      finalPrompt = `Edit this image: ${prompt}`;
    } else if (action === 'generate' && !imageBase64) {
      finalPrompt = `Create a high-quality image of: ${prompt}. Style: ${style || 'photorealistic'}`;
    }

    // Call IMAGE API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`, 
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: finalPrompt },
              ...(imageBase64 ? [{ inlineData: { mimeType: "image/png", data: imageBase64 } }] : [])
            ]
          }],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        })
      }
    );

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }

    const generatedPart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    
    if (!generatedPart) {
      throw new Error("AI did not return an image. It might have been blocked by safety filters.");
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: `data:${generatedPart.inlineData.mimeType};base64,${generatedPart.inlineData.data}`,
        credits_remaining: TESTING_MODE ? 999 : undefined
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});