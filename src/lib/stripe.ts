import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('⚠️ VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
}

export const stripePromise = loadStripe(stripePublishableKey || '');

const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  'FREE': '', // No payment needed
  'BASIC': import.meta.env.VITE_STRIPE_BASIC_LINK || '',
  'PRO': import.meta.env.VITE_STRIPE_PRO_LINK || '',
  'AGENCY': import.meta.env.VITE_STRIPE_AGENCY_LINK || '',
  'QUICK BUY': import.meta.env.VITE_STRIPE_QUICK_BUY_LINK || '', // ✅ NEW
};

export const openStripePaymentLink = (planName: string) => {
  const link = STRIPE_PAYMENT_LINKS[planName];
  
  if (!link) {
    console.error(`No payment link found for plan: ${planName}`);
    return;
  }
  

  console.log(`🔗 Opening Stripe payment link for ${planName}: ${link}`);
  window.open(link, '_blank');
};