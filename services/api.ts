import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const cleanBase64 = (str: string) => (str && str.includes(',')) ? str.split(',')[1] : str;

const callGeminiGen = async (payload: any) => {
  const { data, error } = await supabase.functions.invoke('gemini-gen', {
    body: payload,
  });
  if (error) throw error;
  return data.imageUrl; // Ensure this matches your Edge Function return
};

// Use the names your components are currently calling to stop the red lines
export const generateAIImage = async (prompt: string, style: string) => 
  callGeminiGen({ action: 'generate', prompt, style });

export const editAIImage = async (image: string, prompt: string) => 
  callGeminiGen({ action: 'edit', prompt, imageBase64: cleanBase64(image) });

export const removeBackground = async (image: string) => 
  callGeminiGen({ action: 'remove-bg', imageBase64: cleanBase64(image) });

export const upscaleImage = async (image: string) => 
  callGeminiGen({ action: 'upscale', imageBase64: cleanBase64(image) });