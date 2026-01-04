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
export type VariantEdit = {
  prompt?: string;
  style?: GenerationStyle;
};

export const DEFAULT_VARIANT_EDIT: VariantEdit = {
  prompt: '',
  style: 'realistic',
};

/* ---------- Styles ---------- */
export const STYLES = [
  'realistic',
  'anime',
  'illustration',
  'photographic',
  'cinematic',
  'flat',
  '3d',
] as const;

/* ---------- App state ---------- */
export type AppToolsState = {
  loading: boolean;
  error?: string;
  activeTool?: ToolType;
};

/* ---------- Credits ---------- */
export type UserCredits = number;
