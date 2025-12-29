
import * as api from './api';

/**
 * Legacy wrapper for components that still import from services/gemini.ts
 * Delegates to the unified backend-ready services/api.ts logic.
 */

export const generateAIImage = api.generateAIImage;

export const editAIImage = async (image: string, prompt: string) => {
  const result = await api.editAIImage(image, prompt);
  return result.imageUrl;
};

export const upscaleImage = async (image: string) => {
  const result = await api.upscaleImage(image);
  return result.imageUrl;
};

export const generateTextContent = async (prompt: string, systemInstruction: string) => {
  const result = await api.generateTextContent(prompt, systemInstruction);
  return result.text;
};

export const analyzeMultimodalContent = async (sourceType: string, sourceValue: string, systemInstruction: string) => {
  const result = await api.analyzeMultimodalContent(sourceType, sourceValue, systemInstruction);
  return result.summary;
};
