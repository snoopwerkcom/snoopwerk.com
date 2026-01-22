import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerId, cost } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: customer } = await supabase
      .from('customers')
      .select('credits_remaining')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!customer || customer.credits_remaining < cost) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not enough credits' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const newBalance = customer.credits_remaining - cost

    await supabase
      .from('customers')
      .update({ credits_remaining: newBalance })
      .eq('stripe_customer_id', customerId)

    await supabase.from('credit_transactions').insert({
      stripe_customer_id: customerId,
      action_type: 'USAGE',
      credits_change: -cost,
      credits_after: newBalance,
    })

    return new Response(
      JSON.stringify({ success: true, credits: newBalance }),
      { headers: corsHeaders }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
