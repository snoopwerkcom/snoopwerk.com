// CORRECTED Stripe Webhook - No More Doubling!
// File: supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const sig = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!sig || !webhookSecret) {
      console.error('Missing signature or webhook secret')
      return new Response('Webhook Error: Missing signature', { status: 400 })
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log('✅ Webhook event type:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const customerEmail = session.customer_email || session.customer_details?.email

      console.log('💳 Processing payment for customer:', customerId)
      console.log('📧 Customer email:', customerEmail)

      // Get the price ID from line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
      const priceId = lineItems.data[0]?.price?.id

      console.log('💰 Price ID:', priceId)

      // ✅ Map price IDs to credit amounts
      const creditMap: { [key: string]: number } = {
        'price_1SoPEMEpgkIxcbAj27YDZW83': 600,   // Basic
        'price_1SoPDuEpgkIxcbAj0I1rNPfK': 1800,  // Pro
        'price_1SoPBMEpgkIxcbAjepzNxVBC': 5000,  // Agency
      }


      const creditsToAdd = creditMap[priceId || ''] || 0

      if (creditsToAdd === 0) {
        console.warn('⚠️ Unknown price ID, no credits added')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('💎 Credits to add:', creditsToAdd)

      // ✅ Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('credits_remaining, stripe_customer_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (existingCustomer) {
        // ✅ EXISTING CUSTOMER - ADD credits to current balance
        const currentBalance = existingCustomer.credits_remaining || 0
        const newBalance = currentBalance + creditsToAdd

        console.log('🔄 Existing customer found')
        console.log('💰 Current balance:', currentBalance)
        console.log('➕ Adding:', creditsToAdd)
        console.log('🎯 New balance:', newBalance)

        const { error: updateError } = await supabase
          .from('customers')
          .update({
            credits_remaining: newBalance,
            email: customerEmail,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId)

        if (updateError) {
          console.error('❌ Error updating customer:', updateError)
          throw updateError
        }

        console.log('✅ Customer updated successfully with', newBalance, 'credits')
      } else {
        // ✅ NEW CUSTOMER - Create with initial credits
        console.log('🆕 New customer, creating with', creditsToAdd, 'credits')

        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            stripe_customer_id: customerId,
            email: customerEmail,
            credits_remaining: creditsToAdd,
            plan_type: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('❌ Error creating customer:', insertError)
          throw insertError
        }

        console.log('✅ New customer created with', creditsToAdd, 'credits')
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
