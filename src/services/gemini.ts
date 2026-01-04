import * as api from './api';

/**
 * Modern wrapper for SnoopWerk AI Services.
 * This file cleans up the image data before sending it to the Supabase Edge Functions.
 */

export const generateAIImage = api.generateAIImage;

export const editAIImage = async (image: string, prompt: string) => {
  // Clean the image string: remove "data:image/png;base64," if it exists
  const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
  
  // Delegate to the API service
  const result = await api.editAIImage(cleanBase64, prompt);
  return result.imageUrl;
};

export const upscaleImage = async (image: string) => {
  const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
  const result = await api.upscaleImage(cleanBase64);
  return result.imageUrl;
};

// Keep these as they are for text-based tasks
export const generateTextContent = api.generateTextContent;
export const analyzeMultimodalContent = api.analyzeMultimodalContent;