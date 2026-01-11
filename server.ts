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

// In-memory credit store
const db = {
  credits: new Map<string, any>(), // key: email or session_id
};

app.use(cors());

// Stripe Webhook needs raw body
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

app.use(express.json({ limit: '50mb' }) as any);

app.get('/api/v1/user/credits', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;
  const email = req.query.email as string;
  const key = email || sessionId;
  let credits = db.credits.get(key);

  if (!credits) {
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

// Helper to get Gemini Client with up-to-date key
const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not configured on the server.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- AI ENGINE ROUTES ---

// Image Generation
app.post('/api/v1/ai/generate-image', async (req, res, next) => {
  const { prompt, aspectRatio } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 1) return res.status(402).json({ message: "Insufficient credits" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: `Generate high-quality viral thumbnail asset: ${prompt}` }] }],
      config: { imageConfig: { aspectRatio: aspectRatio || '1:1' } }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) {
      console.error('Image Generation Error:', JSON.stringify(response, null, 2));
      throw new Error("Generation failed - the model did not return an image. This might be due to safety filters.");
    }

    userCredits.remaining -= 1;
    db.credits.set(sessionId, userCredits);

    res.json({
      imageUrl: `data:image/png;base64,${imagePart.inlineData!.data}`,
      credits: userCredits
    });
  } catch (error: any) {
    next(error);
  }
});

// Edit Image (Magic Edits)
app.post('/api/v1/ai/edit-image', async (req, res, next) => {
  const { image, prompt } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 2) return res.status(402).json({ message: "Insufficient credits (2 required)" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
          { text: `Edit this image as follows: ${prompt}` }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part) {
      console.error('Edit Image Error:', JSON.stringify(response, null, 2));
      throw new Error("Edit failed - the model did not return an edited image.");
    }

    userCredits.remaining -= 2;
    db.credits.set(sessionId, userCredits);

    res.json({
      imageUrl: `data:image/png;base64,${part.inlineData!.data}`,
      credits: userCredits
    });
  } catch (error: any) {
    next(error);
  }
});

// Upscale
app.post('/api/v1/ai/upscale', async (req, res, next) => {
  const { image } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 2) return res.status(402).json({ message: "Insufficient credits (2 required)" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
          { text: "Enhance and upscale this image. Sharpen details and clarify textures." }
        ]
      }]
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part) {
      console.error('Upscale Error:', JSON.stringify(response, null, 2));
      throw new Error("Upscale failed - the model did not return an enhanced image.");
    }

    userCredits.remaining -= 2;
    db.credits.set(sessionId, userCredits);

    res.json({
      imageUrl: `data:image/png;base64,${part.inlineData!.data}`,
      credits: userCredits
    });
  } catch (error: any) {
    next(error);
  }
});

// Analyze Content (Carousel Studio)
app.post('/api/v1/ai/analyze-content', async (req, res, next) => {
  const { sourceType, sourceValue, systemInstruction } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 2) return res.status(402).json({ message: "Insufficient credits" });

    let parts: any[] = [];
    if (sourceType === 'image') {
      const cleanBase64 = sourceValue.includes('base64,') ? sourceValue.split('base64,')[1] : sourceValue;
      parts.push({ inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } });
      parts.push({ text: "Deeply analyze visual architecture, subtext, and potential hook points in this image." });
    } else if (sourceType === 'url') {
      parts.push({ text: `Extract mission-critical insights and viral hooks from this URL: ${sourceValue}.` });
    } else if (sourceType === 'video') {
       const cleanBase64 = sourceValue.includes('base64,') ? sourceValue.split('base64,')[1] : sourceValue;
       parts.push({ inlineData: { data: cleanBase64, mimeType: 'video/mp4' } });
       parts.push({ text: "Analyze this video for key narrative beats and high-impact visual hooks." });
    } else {
      parts.push({ text: `Deep reasoning over this creative vision: ${sourceValue}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro
      contents: [{ parts }],
      config: { 
        systemInstruction,
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget
        tools: [{ googleSearch: {} }] 
      }
    });

    userCredits.remaining -= 2;
    db.credits.set(sessionId, userCredits);

    res.json({
      summary: response.text || '',
      credits: userCredits
    });
  } catch (error: any) {
    next(error);
  }
});

// Advanced Intelligence (Image/Video Understanding) using Gemini 3 Pro
app.post('/api/v1/ai/intelligence', async (req, res, next) => {
  const { sourceType, sourceValue, prompt } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 3) return res.status(402).json({ message: "Insufficient credits (3 required for Deep Intelligence)" });

    let parts: any[] = [];
    const cleanBase64 = sourceValue.includes('base64,') ? sourceValue.split('base64,')[1] : sourceValue;
    
    if (sourceType === 'IMAGE') {
      parts.push({ inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } });
    } else if (sourceType === 'VIDEO') {
      parts.push({ inlineData: { data: cleanBase64, mimeType: 'video/mp4' } });
    }

    parts.push({ text: prompt || "Analyze this content for key information, context, and creative insights." });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget
        systemInstruction: "You are SnoopWerk's lead analyst. Provide extremely detailed, high-level intelligence based on the provided visual media. Focus on marketing opportunities, brand alignment, and technical details.",
      }
    });

    userCredits.remaining -= 3;
    db.credits.set(sessionId, userCredits);

    res.json({
      result: response.text || 'Analysis produced no output.',
      credits: userCredits
    });
  } catch (error: any) {
    next(error);
  }
});

// Background Removal
app.post('/api/v1/ai/remove-bg', async (req, res, next) => {
  const { image } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 2) return res.status(402).json({ message: "Insufficient credits" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [
          { text: "Extract subject and remove background. Professional studio cutout." },
          { inlineData: { data: cleanBase64, mimeType: 'image/png' } }
        ]
      }]
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part) {
      console.error('Remove BG Error:', JSON.stringify(response, null, 2));
      throw new Error("Background removal failed.");
    }

    userCredits.remaining -= 2;
    db.credits.set(sessionId, userCredits);

    res.json({
      imageUrl: image,
      maskUrl: `data:image/png;base64,${part.inlineData!.data}`,
      credits: userCredits
    });
  } catch (error: any) {
    next(error);
  }
});

// Text Logic
app.post('/api/v1/ai/generate-text', async (req, res, next) => {
  const { prompt, systemInstruction } = req.body;
  const sessionId = req.headers['x-session-id'] as string;
  try {
    const ai = getAiClient();
    const userCredits = db.credits.get(sessionId) || { remaining: 10 };
    if (userCredits.remaining < 1) return res.status(402).json({ message: "Insufficient credits" });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
        systemInstruction,
        thinkingConfig: { thinkingBudget: 32768 } // Max thinking budget
      }
    });

    userCredits.remaining -= 1;
    db.credits.set(sessionId, userCredits);

    res.json({ text: response.text || '', credits: userCredits });
  } catch (error: any) {
    next(error);
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('SnoopWerk Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({ 
    message: err.message || 'Internal Server Error',
    status: status
  });
});

// Serve Frontend Static Files
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath) as any);

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`SnoopWerk Studio running at port ${port}`);
});