import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Core Initialization
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;


const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Utility Logic
const cleanBase64 = (str: string) =>
  (str && str.includes(',')) ? str.split(',')[1] : str;

const getCustomerId = (): string | null => {
  if (typeof window !== 'undefined') return localStorage.getItem('stripe_customer_id');
  return null;
};

// Helper to convert File to binary for Gemini
const fileToGenerativePart = async (file: File) => {
  // If file is > 2MB, you should ideally compress it here using a canvas
  // For now, let's add a size check to prevent the crash
  if (file.size > 5 * 1024 * 1024) { 
    throw new Error("Image is too large. Please use an image under 5MB.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return {
    inlineData: {
      data: base64Data,
      mimeType: file.type
    }
  };
};

// 3. Central Credit & Supabase Handler
const callGeminiGen = async <T = any>(payload: any): Promise<T> => {
  const customerId = getCustomerId();
  const enhancedPayload = customerId ? { ...payload, customerId } : payload;
  const isFreeUser = !customerId;

  // ✅ FIXED: For free users, deduct credits BEFORE the API call
  let previousCredits: number | null = null;
  
  if (isFreeUser && typeof window !== 'undefined') {
    const CREDIT_COSTS: Record<string, number> = {
      'generate': 2, 'edit': 2, 'upscale': 1, 'remove-bg': 1, 'text': 0, 'analyze': 0,
    };
    const cost = CREDIT_COSTS[payload.action] || 0;
    const currentCredits = parseInt(localStorage.getItem('user_credits') || '0');
    
    console.log('💰 Free user check:', { 
      action: payload.action,
      cost, 
      currentCredits, 
      has_enough: currentCredits >= cost 
    });
    
    if (cost > 0) {
      if (currentCredits < cost) {
        throw new Error(`Insufficient credits. Need ${cost}, have ${currentCredits}`);
      }
      
      // ✅ DEDUCT CREDITS IMMEDIATELY (before API call)
      previousCredits = currentCredits;
      const newCredits = currentCredits - cost;
      localStorage.setItem('user_credits', newCredits.toString());
      console.log(`💸 Deducted ${cost} credits: ${currentCredits} → ${newCredits}`);
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('gemini-gen', { body: enhancedPayload });
    
    if (error) {
      // ✅ REFUND credits on error for free users
      if (isFreeUser && previousCredits !== null && typeof window !== 'undefined') {
        localStorage.setItem('user_credits', previousCredits.toString());
        console.log(`🔄 Refunded credits due to error: ${previousCredits}`);
      }
      throw error;
    }
    
    // ✅ For FREE users, return the locally tracked credits (DO NOT use backend response)
    if (isFreeUser && typeof window !== 'undefined') {
      const currentFreeCredits = parseInt(localStorage.getItem('user_credits') || '0');
      return { ...data, credits: currentFreeCredits } as T;
    }
    
    // ✅ For PAID users, ALWAYS update from backend response
    if (!isFreeUser && typeof window !== 'undefined') {
      if (data.credits !== undefined) {
        localStorage.setItem('user_credits', data.credits.toString());
        console.log(`💳 Paid user credits updated: ${data.credits}`);
      } else {
        console.warn('⚠️ Backend did not return credits');
      }
    }
    
    return data as T;
    
  } catch (error: any) {
    // ✅ REFUND credits on exception for free users
    if (isFreeUser && previousCredits !== null && typeof window !== 'undefined') {
      localStorage.setItem('user_credits', previousCredits.toString());
      console.log(`🔄 Refunded credits due to exception: ${previousCredits}`);
    }
    throw error;
  }
};

// 4. Original Tool Logic
export const generateAIImage = async (prompt: string, style?: string) => {
  const result = await callGeminiGen({ action: 'generate', prompt, style });
  return { imageUrl: result.imageUrl, credits: result.credits };
};

export const editAIImage = async (image: string, prompt: string) => {
  const result = await callGeminiGen({ action: 'edit', prompt, imageBase64: cleanBase64(image) });
  return { imageUrl: result.imageUrl, credits: result.credits };
};

export const removeBackground = async (image: string) => {
  const result = await callGeminiGen({ action: 'remove-bg', imageBase64: cleanBase64(image) });
  return { imageUrl: result.imageUrl, credits: result.credits };
};

export const upscaleImage = async (image: string) => {
  const result = await callGeminiGen({ action: 'upscale', imageBase64: cleanBase64(image) });
  return { imageUrl: result.imageUrl, credits: result.credits };
};

export const generateTextContent = async (prompt: string, instruction?: string) => {
  const result = await callGeminiGen({ 
    action: 'text', 
    prompt: instruction || prompt, 
    context: instruction ? prompt : undefined 
  });
  return { text: result.text, credits: result.credits };
};

// 5. ✅ FIXED: analyzeMultimodalContent now uses callGeminiGen for consistent credit handling
export const analyzeMultimodalContent = async (
  typeOrPayload: any,
  sourceValue?: any,
  systemInstruction?: string
) => {
  try {
    let payload: any;
    
    // 1. Construct Payload
    if (typeof typeOrPayload === 'string' && sourceValue !== undefined) {
      payload = {
        action: 'analyze', 
        prompt: systemInstruction || 'analyze this content.',
      };
      if (typeOrPayload === 'url') payload.imageUrl = sourceValue;
      else if (typeOrPayload === 'image') payload.imageBase64 = cleanBase64(sourceValue);
      else if (typeOrPayload === 'video') payload.videoUrl = sourceValue;
    } else {
      payload = { ...typeOrPayload, action: 'analyze' };
    }

    // ✅ 2. Use centralized credit handler instead of direct supabase call
    const result = await callGeminiGen(payload);
    
    return { 
      summary: result?.summary || result?.text || '', 
      credits: result.credits  // Now properly tracked for free users
    };

  } catch (error: any) {
    console.error("Neural Error:", error);
    throw new Error(error.message || "Neural Engine failure.");
  }
};

export const getUserCredits = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-gen', {
      body: { action: 'get-credits', customerId: getCustomerId() }
    });
    if (error || !data) return 0;
    return data.credits ?? 0;
  } catch {
    return 0;
  }
};