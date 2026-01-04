import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle Preflight for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, style } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    // 2. Call Gemini AI
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image description for: ${prompt} in ${style} style` }] }]
      })
    })

    const result = await response.json()
    
    // Note: Gemini 1.5 generates text descriptions. 
    // Usually, you'd send this to an image model like Imagen or Midjourney.
    // For now, we return a successful response to confirm the "bridge" is working.
    return new Response(
      JSON.stringify({ imageUrl: "https://placehold.co/600x400?text=AI+Bridge+Working" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})