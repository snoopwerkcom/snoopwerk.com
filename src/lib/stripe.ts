import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('⚠️ VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
}

export const stripePromise = loadStripe(stripePublishableKey || '');

export const openStripePaymentLink = (planName: string) => {
  const paymentLinks: Record<string, string> = {
    'BASIC': import.meta.env.VITE_STRIPE_BASIC_LINK || '',
    'PRO': import.meta.env.VITE_STRIPE_PRO_LINK || '',
    'AGENCY': import.meta.env.VITE_STRIPE_AGENCY_LINK || '',
  };

  const link = paymentLinks[planName];

  if (!link) {
    console.error(`❌ No payment link found for ${planName} plan`);
    alert(`Payment link not configured for ${planName} plan. Please check your .env file.`);
    return;
  }

  console.log(`🔗 Opening Stripe payment link for ${planName}: ${link}`);
  window.open(link, '_blank');
};