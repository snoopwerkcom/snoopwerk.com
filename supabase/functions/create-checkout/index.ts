import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLAN_PRICES = {
  BASIC: { amount: 2200, credits: 600 },
  PRO: { amount: 4900, credits: 1800 },
  AGENCY: { amount: 9900, credits: 5000 },
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { planType, email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!planType || !PLAN_PRICES[planType as keyof typeof PLAN_PRICES]) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const plan = PLAN_PRICES[planType as keyof typeof PLAN_PRICES]

    // ✅ REUSE OR CREATE CUSTOMER (THIS IS THE FIX)
    const existing = await stripe.customers.list({ email, limit: 1 })
    const customer =
      existing.data[0] ?? await stripe.customers.create({ email })

    // ✅ CREATE CHECKOUT FOR SAME CUSTOMER
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id, // 🔑 identity anchor
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${planType} Plan - ${plan.credits} Credits`,
              description: `Get ${plan.credits} AI generation credits`,
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        plan_type: planType,
      },
      success_url: `${req.headers.get('origin') || 'http://localhost:3000'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:3000'}#pricing`,
    })

    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Checkout session creation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
