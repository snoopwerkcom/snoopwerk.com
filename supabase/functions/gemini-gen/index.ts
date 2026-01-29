import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ✅ RATE LIMITING
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(customerId: string | null): boolean {
  const key = customerId || 'anonymous';
  const now = Date.now();
  const limit = customerId ? 100 : 20; // 100/hour for paid, 20/hour for free
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  const userData = rateLimitMap.get(key);
  
  if (!userData || now > userData.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userData.count >= limit) {
    return false;
  }
  
  userData.count++;
  return true;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CREDIT_COSTS = {
  'generate': 20,
  'edit': 20,
  'remove-bg': 10,
  'upscale': 10,
  'text': 0,
  'analyze': 0,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, imageBase64, style, action, context, customerId } = await req.json()
    
    console.log(`📝 Action: ${action}, Customer: ${customerId || 'free'}`)
    
    // ✅ RATE LIMIT CHECK
    if (!checkRateLimit(customerId)) {
      console.log(`⚠️ Rate limit exceeded for ${customerId || 'anonymous'}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in an hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const stabilityKey = Deno.env.get('STABILITY_API_KEY')
    
    let creditsRemaining: number | undefined;
    
    // ✅ CRITICAL: Deduct credits for PAID users BEFORE processing
    if (customerId) {
      const creditsNeeded = CREDIT_COSTS[action] || 0;
      
      if (creditsNeeded > 0) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        console.log(`💰 Checking credits for customer ${customerId}`);

        // Get current credits
        const { data: customer, error: fetchError } = await supabaseClient
          .from('customers')
          .select('credits_remaining')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (fetchError) {
          console.error('❌ Error fetching customer:', fetchError);
          throw new Error('Failed to fetch customer credits');
        }

        if (!customer) {
          console.error('❌ Customer not found:', customerId);
          throw new Error('Customer not found');
        }

        console.log(`Current credits: ${customer.credits_remaining}, needed: ${creditsNeeded}`);

        // Check if enough credits
        if (customer.credits_remaining < creditsNeeded) {
          return new Response(
            JSON.stringify({
              error: 'insufficient_credits',
              credits_needed: creditsNeeded,
              credits_available: customer.credits_remaining
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deduct credits
        const newCredits = customer.credits_remaining - creditsNeeded;
        
        const { data: updatedCustomer, error: updateError } = await supabaseClient
          .from('customers')
          .update({ credits_remaining: newCredits })
          .eq('stripe_customer_id', customerId)
          .select('credits_remaining')
          .single();

        if (updateError) {
          console.error('❌ Error updating credits:', updateError);
          throw new Error('Failed to update credits');
        }

        creditsRemaining = updatedCustomer.credits_remaining;
        console.log(`✅ Credits deducted: ${customer.credits_remaining} → ${creditsRemaining}`);
      } else {
        // Action costs 0 credits, just return current balance
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: customer } = await supabaseClient
          .from('customers')
          .select('credits_remaining')
          .eq('stripe_customer_id', customerId)
          .single();
        
        creditsRemaining = customer?.credits_remaining;
      }
    }
    
    // TEXT/ANALYZE ACTIONS (using Gemini)
    if (action === 'text' || action === 'analyze') {
      if (!geminiKey) {
        throw new Error('GEMINI_API_KEY not set');
      }
      
      console.log('🧠 Processing text with Gemini')
      
      const textPrompt = prompt || context || "Analyze this content.";
      const parts: any[] = [{ text: textPrompt }];
      
      if (imageBase64) {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inline_data: { mime_type: "image/png", data: cleanBase64 }
        });
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      
      console.log('✅ Text generated')
      
      return new Response(
        JSON.stringify({ text, summary: text, credits: creditsRemaining }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // IMAGE GENERATION
    if (action === 'generate') {
      if (!stabilityKey) {
        throw new Error('STABILITY_API_KEY not set');
      }
      
      console.log('🎨 Generating image with Stability AI')
      
      const aspectRatio = style === '16:9' ? '16:9' : (style === '9:16' ? '9:16' : '1:1');
      
      const formData = new FormData();
      formData.append('prompt', prompt || 'a beautiful image');
      formData.append('aspect_ratio', aspectRatio);
      formData.append('output_format', 'png');
      
      console.log('Sending request to Stability AI...')
      
      const response = await fetch(
        'https://api.stability.ai/v2beta/stable-image/generate/ultra',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stabilityKey}`,
            'Accept': 'image/*'
          },
          body: formData
        }
      );

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stability AI error:', errorText.substring(0, 300));
        
        if (response.status === 401) {
          throw new Error('Stability AI API key is invalid');
        } else if (response.status === 402 || response.status === 403) {
          throw new Error('Insufficient Stability AI credits');
        } else if (response.status === 400) {
          throw new Error(`Stability AI rejected request: ${errorText.substring(0, 100)}`);
        }
        
        throw new Error(`Stability AI error: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();
      
      // Convert to base64 in chunks
      const bytes = new Uint8Array(imageBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      
      console.log('✅ Image generated successfully')

      return new Response(
        JSON.stringify({
          imageUrl: `data:image/png;base64,${base64}`,
          credits: creditsRemaining
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // EDIT IMAGE - Smart Edit with Gemini Analysis (FREE) + Optional Regeneration
    if (action === 'edit') {
      if (!imageBase64) {
        throw new Error('No image provided');
      }
      
      console.log('✏️ Magic Edit - Using Gemini for analysis');
      console.log('Edit prompt:', prompt || 'enhance this image');
      
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      
      // ✅ USE GEMINI TO ANALYZE IMAGE AND CREATE ENHANCED PROMPT (FREE!)
      if (!geminiKey) {
        throw new Error('GEMINI_API_KEY not set');
      }
      
      try {
        console.log('🧠 Analyzing image with Gemini (FREE)...');
        
        const analysisPrompt = `
          You are an expert image editor and prompt engineer. 
          
          Current image description: Analyze what you see in this image.
          User's edit request: "${prompt || 'enhance and improve this image'}"
          
          Create a detailed, specific prompt for an AI image generator that will produce an edited version of this image.
          The prompt should:
          1. Describe the main subject and composition
          2. Apply the user's requested edits
          3. Specify style, lighting, colors, and mood
          4. Be under 200 words
          
          Output ONLY the image generation prompt, nothing else. No explanations, no markdown, just the prompt.
        `;
        
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: analysisPrompt },
                  { inline_data: { mime_type: "image/png", data: cleanBase64 } }
                ]
              }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
            })
          }
        );

        if (!geminiResponse.ok) {
          throw new Error(`Gemini analysis failed: ${geminiResponse.status}`);
        }

        const geminiResult = await geminiResponse.json();
        const enhancedPrompt = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
        
        console.log('✅ Gemini analysis complete (FREE)');
        console.log('Enhanced prompt:', enhancedPrompt.substring(0, 100) + '...');
        
        // ✅ NOW USE STABILITY AI TO GENERATE THE EDITED IMAGE
        if (!stabilityKey) {
          throw new Error('STABILITY_API_KEY not set');
        }
        
        console.log('🎨 Generating edited image with Stability AI...');
        
        const formData = new FormData();
        formData.append('prompt', enhancedPrompt.trim());
        formData.append('output_format', 'png');
        formData.append('aspect_ratio', '1:1'); // You could detect this from original image
        
        const stabilityResponse = await fetch(
          'https://api.stability.ai/v2beta/stable-image/generate/ultra',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stabilityKey}`,
              'Accept': 'image/*'
            },
            body: formData
          }
        );

        console.log('Stability AI response status:', stabilityResponse.status);

        if (!stabilityResponse.ok) {
          const errorText = await stabilityResponse.text();
          console.error('Stability AI error:', errorText.substring(0, 500));
          throw new Error(`Failed to generate edited image: ${stabilityResponse.status}`);
        }

        const editImageBuffer = await stabilityResponse.arrayBuffer();
        console.log('Received edited image, size:', editImageBuffer.byteLength, 'bytes');
        
        // Convert to base64 in chunks
        const editBytes = new Uint8Array(editImageBuffer);
        let editBinary = '';
        const editChunkSize = 8192;
        for (let i = 0; i < editBytes.length; i += editChunkSize) {
          const chunk = editBytes.subarray(i, Math.min(i + editChunkSize, editBytes.length));
          editBinary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(editBinary);
        
        console.log('✅ Magic edit complete using Gemini analysis + Stability AI generation');

        return new Response(
          JSON.stringify({
            imageUrl: `data:image/png;base64,${base64}`,
            credits: creditsRemaining,
            method: 'gemini_analysis_stability_generation'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
        
      } catch (error: any) {
        console.error('❌ Magic edit error:', error.message);
        throw error;
      }
    }
    
    // REMOVE BACKGROUND
    if (action === 'remove-bg') {
      const removeBgKey = Deno.env.get('REMOVEBG_API_KEY');
      if (!removeBgKey || !imageBase64) {
        throw new Error('Missing requirements for background removal');
      }

      console.log('✂️ Removing background')

      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const binaryString = atob(cleanBase64);
      const bgInputBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bgInputBytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bgInputBytes], { type: "image/png" });

      const form = new FormData();
      form.append("image_file", blob, "image.png");
      form.append("size", "auto");

      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": removeBgKey },
        body: form,
      });

      if (!res.ok) {
        throw new Error(`remove.bg failed: ${res.status}`);
      }

      const bgBuffer = await res.arrayBuffer();
      
      // Convert to base64 in chunks
      const bgBytes = new Uint8Array(bgBuffer);
      let bgBinary = '';
      const bgChunkSize = 8192;
      for (let i = 0; i < bgBytes.length; i += bgChunkSize) {
        const chunk = bgBytes.subarray(i, Math.min(i + bgChunkSize, bgBytes.length));
        bgBinary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(bgBinary);

      console.log('✅ Background removed')

      return new Response(
        JSON.stringify({
          imageUrl: `data:image/png;base64,${base64}`,
          credits: creditsRemaining
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // UPSCALE
    if (action === 'upscale') {
      if (!stabilityKey || !imageBase64) {
        throw new Error('Missing requirements for upscaling');
      }
      
      console.log('💎 Upscaling image')
      
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const binaryString = atob(cleanBase64);
      const upscaleInputBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        upscaleInputBytes[i] = binaryString.charCodeAt(i);
      }
      const imageBlob = new Blob([upscaleInputBytes], { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.png');
      formData.append('prompt', 'high resolution, sharp details, 4k quality');
      formData.append('output_format', 'png');
      
      const response = await fetch(
        'https://api.stability.ai/v2beta/stable-image/upscale/conservative',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stabilityKey}`,
            'Accept': 'image/*'
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Stability AI upscale error: ${response.status}`);
      }

      const upscaleImageBuffer = await response.arrayBuffer();
      
      // Convert to base64 in chunks
      const upscaleBytes = new Uint8Array(upscaleImageBuffer);
      let upscaleBinary = '';
      const upscaleChunkSize = 8192;
      for (let i = 0; i < upscaleBytes.length; i += upscaleChunkSize) {
        const chunk = upscaleBytes.subarray(i, Math.min(i + upscaleChunkSize, upscaleBytes.length));
        upscaleBinary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(upscaleBinary);
      
      console.log('✅ Image upscaled')

      return new Response(
        JSON.stringify({
          imageUrl: `data:image/png;base64,${base64}`,
          credits: creditsRemaining
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    throw new Error(`Unsupported action: ${action}`);

  } catch (error: any) {
    // ✅ ENHANCED ERROR MONITORING
    console.error('💥 Error:', {
      message: error.message,
      action: action,
      customerId: customerId || 'anonymous',
      timestamp: new Date().toISOString(),
      stack: error.stack?.substring(0, 500)
    });
    
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})