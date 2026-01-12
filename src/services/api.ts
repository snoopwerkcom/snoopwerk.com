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
export const generateAIImage = async (prompt: string, style?: string) => {
  const result = await callGeminiGen<{ imageUrl: string; credits?: any }>({
    action: 'generate',
    prompt,
    style,
  });
  return {
    imageUrl: result.imageUrl,
    credits: result.credits
  };
};

// Canonical API
export const editAIImage = async (image: string, prompt: string) => {
  const result = await callGeminiGen<{ imageUrl: string; credits?: any }>({
    action: 'edit',
    prompt,
    imageBase64: cleanBase64(image),
  });
  return {
    imageUrl: result.imageUrl,
    credits: result.credits
  };
};

export const removeBackground = async (image: string) => {
  const result = await callGeminiGen<{ imageUrl: string; credits?: any }>({
    action: 'remove-bg',
    imageBase64: cleanBase64(image),
  });
  return {
    imageUrl: result.imageUrl,
    credits: result.credits
  };
};

export const upscaleImage = async (image: string) => {
  const result = await callGeminiGen<{ imageUrl: string; credits?: any }>({
    action: 'upscale',
    imageBase64: cleanBase64(image),
  });
  return {
    imageUrl: result.imageUrl,
    credits: result.credits
  };
};

// Legacy alias
export const generateImage = generateAIImage;

// ===============================
// Legacy / ToolCarousel support
// ===============================

// Text-only generation (Gemini text)
export const generateTextContent = async (prompt: string, instruction?: string) => {
  const { data, error } = await supabase.functions.invoke('gemini-gen', {
    body: {
      action: 'text',
      prompt: instruction || prompt,
      context: instruction ? prompt : undefined,
    },
  });
  if (error) throw error;
  return {
    text: data.text,
    credits: data.credits
  };
};

// Multimodal analysis (text + image / video URL)
// Supports both carousel usage: (type, value, instruction) and direct object usage: ({ prompt, ... })
export const analyzeMultimodalContent = async (
  sourceTypeOrPayload: 'prompt' | 'url' | 'image' | 'video' | { prompt: string; imageBase64?: string; imageUrl?: string; videoUrl?: string },
  sourceValue?: string,
  systemInstruction?: string
) => {
  let payload: any;
  
  // Handle carousel's 3-argument call: (type, value, instruction)
  if (typeof sourceTypeOrPayload === 'string' && sourceValue !== undefined) {
    payload = {
      prompt: systemInstruction || 'analyze this content and provide a detailed summary.',
    };
    
    // Map source type to correct field
    if (sourceTypeOrPayload === 'url') {
      payload.imageUrl = sourceValue;
    } else if (sourceTypeOrPayload === 'image') {
      payload.imageBase64 = cleanBase64(sourceValue);
    } else if (sourceTypeOrPayload === 'video') {
      payload.videoUrl = sourceValue;
    } else if (sourceTypeOrPayload === 'prompt') {
      // For prompt type, the sourceValue IS the content to analyze
      payload.prompt = systemInstruction || 'analyze this content.';
      payload.context = sourceValue; // The actual content to analyze
    }
  } 
  // Handle direct object call: ({ prompt, imageBase64, ... })
  else if (typeof sourceTypeOrPayload === 'object') {
    payload = {
      ...sourceTypeOrPayload,
      imageBase64: sourceTypeOrPayload.imageBase64
        ? cleanBase64(sourceTypeOrPayload.imageBase64)
        : undefined,
    };
  } else {
    throw new Error('Invalid analyzeMultimodalContent arguments');
  }

  const { data, error } = await supabase.functions.invoke('gemini-gen', {
    body: {
      action: 'text',
      ...payload,
    },
  });
  
  if (error) throw error;
  
  return {
    summary: data.summary || data.text || '',
    credits: data.credits
  };
};