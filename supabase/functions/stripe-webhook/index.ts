import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log(`📨 Webhook received: ${event.type}`)

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_email
      const planName = session.metadata?.plan || 'Unknown'

      console.log(`✅ Payment successful for ${customerEmail} - Plan: ${planName}`)

      // Update user credits based on plan
      const creditsMap: Record<string, number> = {
        'Basic': 100,
        'Pro': 500,
        'Agency': 2000,
      }

      const credits = creditsMap[planName] || 100

      // Find user by email and update credits
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id, credits_remaining, credits_total')
        .eq('email', customerEmail)
        .single()

      if (findError || !profile) {
        console.error('❌ User not found:', customerEmail)
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
      }

      // Update user credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          credits_remaining: profile.credits_remaining + credits,
          credits_total: profile.credits_total + credits,
          is_paid_subscriber: true,
          subscription_tier: planName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) {
        console.error('❌ Failed to update credits:', updateError)
        return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500 })
      }

      console.log(`✅ Added ${credits} credits to ${customerEmail}`)
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerEmail = subscription.metadata?.email

      console.log(`🚫 Subscription cancelled for ${customerEmail}`)

      // Update user status
      if (customerEmail) {
        await supabase
          .from('profiles')
          .update({
            is_paid_subscriber: false,
            subscription_tier: 'Free',
          })
          .eq('email', customerEmail)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})