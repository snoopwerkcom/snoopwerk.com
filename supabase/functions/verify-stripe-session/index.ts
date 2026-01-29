import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


const PLAN_CREDITS = {
  'BASIC': 600,
  'PRO': 1800,
  'AGENCY': 5000,
};

serve(async (req) => {
  console.log('🚀 verify-stripe-session started');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
   
    console.log('📥 Session ID:', sessionId);
    

    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('❌ STRIPE_SECRET_KEY not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
    console.log('✅ Stripe initialized');

    console.log('🔍 Retrieving Stripe session...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('💳 Payment status:', session.payment_status);

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer as string;
    const customerEmail = session.customer_details?.email;
    const planType = session.metadata?.plan_type || 'BASIC';
    const credits = PLAN_CREDITS[planType as keyof typeof PLAN_CREDITS] || 60;

    console.log('📋 Plan:', planType, 'Credits:', credits);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('💾 Supabase connected');

    console.log('🔍 Checking for existing customer...');
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (existingCustomer) {
      // EXISTING CUSTOMER: Add to their balance
      console.log('👤 Existing customer found');
      const newBalance = existingCustomer.credits_remaining + credits;
      console.log(`➕ Database: ${existingCustomer.credits_remaining} + ${credits} = ${newBalance}`);
      
      await supabase
        .from('customers')
        .update({
          credits_remaining: newBalance,
         plan_type: planType,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      await supabase.from('credit_transactions').insert({
        stripe_customer_id: customerId,
        action_type: 'PURCHASE',
        credits_change: credits,
        credits_after: newBalance,
      });

      console.log('✅ Customer updated successfully');
      
      return new Response(
        JSON.stringify({
          success: true,
          customerId,
          email: customerEmail,
          credits: newBalance,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
     } else {
  // NEW CUSTOMER: Only add purchase credits (ignore frontend existingCredits)
  console.log('🆕 New customer - creating...');
  console.log(`➕ Purchase credits: ${credits}`);
  
  await supabase.from('customers').insert({
    stripe_customer_id: customerId,
    email: customerEmail,
    credits_remaining: credits,  // ✅ Only the purchased amount
    plan_type: planType,
    subscription_status: 'active',
  });

  await supabase.from('credit_transactions').insert({
    stripe_customer_id: customerId,
    action_type: 'PURCHASE',
    credits_change: credits,
    credits_after: credits,  // ✅ Matches the actual balance
  });

  console.log('✅ New customer created successfully');
  
  return new Response(
    JSON.stringify({
      success: true,
      customerId,
      email: customerEmail,
      credits: credits,  // ✅ Return only purchased credits
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
  } catch (error: any) {
    console.error('❌ ERROR:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});