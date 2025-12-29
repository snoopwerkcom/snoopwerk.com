import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize Stripe and Gemini
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
// Always use the process.env.API_KEY string directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// In-memory credit store (In production, replace with Redis or Postgres)
const db = {
  credits: new Map<string, any>(), // key: email or session_id
};

app.use(cors());

// Stripe Webhook needs raw body for signature verification
app.post('/api/v1/stripe-webhook', express.raw({ type: 'application/json' }) as any, (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send('Stripe not configured');
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;
    const amountPaid = session.amount_total || 0;
    
    // Add credits logic (e.g., $1 = 10 credits)
    const creditsToAdd = Math.floor(amountPaid / 100) * 10;
    
    if (email) {
      const current = db.credits.get(email) || { remaining: 0, total: 0 };
      db.credits.set(email, {
        remaining: current.remaining + creditsToAdd,
        total: current.total + creditsToAdd,
        is_paid_subscriber: true
      });
    }
  }

  res.json({ received: true });
});

// Regular JSON parsing for other routes
app.use(express.json({ limit: '50mb' }) as any);

/**
 * Route: Check Credits by Email or Session
 */
app.get('/api/v1/user/credits', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;
  const email = req.query.email as string;
  
  const key = email || sessionId;
  let credits = db.credits.get(key);

  if (!credits) {
    // Default trial credits for new sessions
    credits = {
      remaining: 10.0,
      total: 10.0,
      is_low_credit: false,
      subscription_required: false,
      is_paid_subscriber: false
    };
    db.credits.set(key, credits);
  }

  res.json(credits);
});

// --- AI ENGINE ROUTES ---

// Image Generation (Nano Banana)
app.post('/api/v1/ai/generate-image', async (req, res) => {
  const { prompt, aspectRatio } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  
  try {
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 1) return res.status(402).json({ message: "Insufficient credits" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Render high-fidelity studio quality: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: aspectRatio || '1:1' } }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart?.inlineData) throw new Error("Generation failed");

    // Deduct credit
    userCredits.remaining -= 1;
    db.credits.set(sessionId, userCredits);

    res.json({
      imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`,
      credits: userCredits
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Background Removal
app.post('/api/v1/ai/remove-bg', async (req, res) => {
  const { image } = req.body;
  const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: "GENERATE ALPHA MASK: Subject WHITE, Background BLACK." },
          { inlineData: { data: cleanBase64, mimeType: 'image/png' } }
        ]
      }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Mask failed");

    res.json({
      imageUrl: image,
      maskUrl: `data:image/png;base64,${part.inlineData.data}`,
      credits: { remaining: 8.0, total: 10.0 } // Mock update
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Text Logic (Gemini 3)
app.post('/api/v1/ai/generate-text', async (req, res) => {
  const { prompt, systemInstruction } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction }
    });
    res.json({ text: response.text || '', credits: { remaining: 5.5, total: 10.0 } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Serve Frontend Static Files
const distPath = path.join(__dirname, '../dist');
// Added 'as any' to fix TypeScript overload resolution error where RequestHandler is mistaken for PathParams
app.use(express.static(distPath) as any);

// SPA Handler: Route all non-API requests to index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`SnoopWerk Studio running at http://localhost:${port}`);
});