import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const cleanBase64 = (str: string) =>
  (str && str.includes(',')) ? str.split(',')[1] : str;

const callGeminiGen = async <T = any>(payload: any): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('gemini-gen', {
    body: payload,
  });
  if (error) throw error;
  return data as T;
};

// Main image generation function
export const generateAIImage = async (prompt: string, style?: string) =>
  (await callGeminiGen<{ imageUrl: string }>({
    action: 'generate',
    prompt,
    style,
  })).imageUrl;

// Canonical API
export const editAIImage = async (image: string, prompt: string) =>
  (await callGeminiGen<{ imageUrl: string }>({
    action: 'edit',
    prompt,
    imageBase64: cleanBase64(image),
  })).imageUrl;

export const removeBackground = async (image: string) =>
  (await callGeminiGen<{ imageUrl: string }>({
    action: 'remove-bg',
    imageBase64: cleanBase64(image),
  })).imageUrl;

export const upscaleImage = async (image: string) =>
  (await callGeminiGen<{ imageUrl: string }>({
    action: 'upscale',
    imageBase64: cleanBase64(image),
  })).imageUrl;

// Legacy alias
export const generateImage = generateAIImage;

// ===============================
// Legacy / ToolCarousel support
// ===============================

// Text-only generation (Gemini text)
export const generateTextContent = async (prompt: string) => {
  const { data, error } = await supabase.functions.invoke('gemini-gen', {
    body: {
      action: 'text',
      prompt,
    },
  });
  if (error) throw error;
  return data.text;
};

// Multimodal analysis (text + image / video URL)
export const analyzeMultimodalContent = async (payload: {
  prompt: string;
  imageBase64?: string;
  imageUrl?: string;
  videoUrl?: string;
}) => {
  const { data, error } = await supabase.functions.invoke('gemini-gen', {
    body: {
      action: 'analyze',
      ...payload,
      imageBase64: payload.imageBase64
        ? cleanBase64(payload.imageBase64)
        : undefined,
    },
  });
  if (error) throw error;
  return data;
};