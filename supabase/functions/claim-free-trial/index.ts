// supabase/functions/claim-free-trial/index.ts
// SIMPLE ERROR MESSAGES VERSION

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FREE_CREDITS = 100

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, deviceId, userAgent } = await req.json()

    if (!userId || !deviceId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email and device required' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🎁 Free credit claim:', userId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if EMAIL already claimed
    const { data: emailClaim } = await supabase
      .from('free_credit_claims')
      .select('*')
      .eq('email', userId)
      .single()

    if (emailClaim) {
      console.log('❌ Email already claimed:', userId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You have already claimed your free credits',  // ✅ Simple message
          alreadyClaimed: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if DEVICE already claimed
    const { data: deviceClaim } = await supabase
      .from('free_credit_claims')
      .select('*')
      .eq('device_fingerprint', deviceId)
      .single()

    if (deviceClaim) {
      console.log('❌ Device already claimed:', deviceId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You have already claimed your free credits',  // ✅ Simple message
          alreadyClaimed: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GRANT free credits
    const { error: insertError } = await supabase
      .from('free_credit_claims')
      .insert({
        email: userId,
        device_fingerprint: deviceId,
        user_agent: userAgent || 'unknown',
        credits_granted: FREE_CREDITS,
        claimed_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('❌ Failed to record claim:', insertError)
      throw new Error('Failed to process claim')
    }

    console.log('✅ Free credits granted!')

    return new Response(
      JSON.stringify({
        success: true,
        credits: FREE_CREDITS,
        message: 'Free credits claimed!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Something went wrong. Please try again.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})