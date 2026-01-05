/* ===============================
   GLOBAL APP TYPES (BARREL FILE)
   =============================== */

/* ---------- Tool types ---------- */
export type ToolType =
  | 'image-generate'
  | 'image-edit'
  | 'background-remove'
  | 'image-upscale'
  | 'carousel'
  | 'text'
  | 'analyze';

/* ---------- Generation styles ---------- */
export type GenerationStyle =
  | 'realistic'
  | 'anime'
  | 'illustration'
  | 'photographic'
  | 'cinematic'
  | 'flat'
  | '3d'
  | string;

/* ---------- Variant editing ---------- */
export interface VariantEdit {
  overlayText: string;
  magicPrompt: string;      // Added
  textSize: number;
  textColor: string;
  fontFamily: string;
  textX: number;
  textY: number;
  textRotation: number;    // Added
}

export const DEFAULT_VARIANT_EDIT: VariantEdit = {
  overlayText: '',
  magicPrompt: '',         // Added
  textSize: 60,
  textColor: '#ffffff',
  fontFamily: 'sans-serif',
  textX: 50,
  textY: 50,
  textRotation: 0,         // Added
};

// Ensure your STYLES objects look like this:
export const STYLES = [
  { id: 'minimalist', label: 'Minimalist', emoji: '🎨', promptSuffix: 'clean minimalist style' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', promptSuffix: 'high cinematic detail' },
  // ... add the rest of your styles here
];

/* ---------- Styles ---------- */

/* ---------- App state ---------- */
export type AppToolsState = {
  loading: boolean;
  error?: string;
  activeTool?: ToolType;
};

/* ---------- Credits ---------- */
export type UserCredits = number;
