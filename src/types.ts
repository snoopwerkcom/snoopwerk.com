
export enum ToolType {
  LANDING = 'LANDING',
  AB_TESTING = 'AB_TESTING',
   POD_MERCH = 'pod-merch', 
  REMOVE_BG = 'REMOVE_BG',
  UPSCALE = 'UPSCALE',
  TEXT_EDIT = 'TEXT_EDIT',
  THUMBNAILS = 'THUMBNAILS',
  MAGIC_EDIT = 'MAGIC_EDIT',
  LOGO_DESIGNER = 'LOGO_DESIGNER',
  PRICING = 'PRICING'
  CAROUSEL = 'carousel'
}

export type WorkstationStage = 'IDLE' | 'GENERATING' | 'EDITING' | 'REFINING' | 'COMPARE';

export type GenerationStyle = 
  | 'none' | 'anime' | 'black_and_white' | 'cartoon' | 'cinematic' | 'comic' | 'cyberpunk' 
  | 'kawai' | 'loonytoon' | 'manga' | 'calligraphy' | 'new_wave' | 'oil_painting' 
  | 'photography' | 'pixar' | 'psychedelic' | 'realistic' | 'retro'
  | 'minimalist' | 'bold' | 'vibrant' | 'dark' | 'photo_led';

export interface StyleOption {
  id: GenerationStyle;
  label: string;
  emoji: string;
  promptSuffix: string;
}

export const STYLES: StyleOption[] = [
  { id: 'none', label: 'None', emoji: '✨', promptSuffix: '' },
  { id: 'minimalist', label: 'Clean Minimalist', emoji: '☁️', promptSuffix: 'clean minimalist aesthetic, high-end professional design, ample white space, elegant' },
  { id: 'bold', label: 'Bold Attention-Grabber', emoji: '🔥', promptSuffix: 'bold high-contrast design, attention-grabbing colors, punchy typography style, energetic' },
  { id: 'vibrant', label: 'Vibrant Creator', emoji: '🌈', promptSuffix: 'vibrant colors, modern creator aesthetic, high saturation, playful and professional' },
  { id: 'dark', label: 'Dark Aesthetic', emoji: '🌑', promptSuffix: 'dark sleek aesthetic, moody lighting, sophisticated shadows, premium look' },
  { id: 'photo_led', label: 'photo-led', emoji: '📸', promptSuffix: 'photorealistic style, high-quality photography focus, authentic imagery, clear, sharp' },
  { id: 'anime', label: 'Anime', emoji: '⛩️', promptSuffix: 'high-quality anime illustration, cel-shaded, vibrant colors' },
  { id: 'black_and_white', label: 'Black and White', emoji: '🏁', promptSuffix: 'monochrome, high-contrast black and white photography, artistic grayscale' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', promptSuffix: 'modern cartoon style, clean vector lines, bold vibrant colors' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', promptSuffix: 'cinematic lighting, dramatic atmosphere, blockbuster movie aesthetic, 8k resolution' },
  { id: 'comic', label: 'Comic', emoji: '💥', promptSuffix: 'comic book style, ink lines, halftone patterns, dynamic action' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🌃', promptSuffix: 'cyberpunk aesthetic, neon lights, futuristic cityscape, high-tech' },
  { id: 'kawai', label: 'Kawai', emoji: '🎀', promptSuffix: 'kawaii style, extremely cute, soft pastel colors, bubbly shapes' },
  { id: 'loonytoon', label: 'Loonytoon', emoji: '🐰', promptSuffix: 'classic looney tunes animation style, vintage cartoon aesthetic' },
  { id: 'manga', label: 'Manga', emoji: '📖', promptSuffix: 'classic manga style, detailed black ink lines, screen tones, high contrast' },
  { id: 'calligraphy', label: 'Calligraphy', emoji: '🖌️', promptSuffix: 'elegant hand-drawn calligraphy, artistic ink brush strokes, sophisticated' },
  { id: 'new_wave', label: 'New Wave', emoji: '🌊', promptSuffix: 'new wave 80s aesthetic, synthwave neon, retro-futurism' },
  { id: 'oil_painting', label: 'Oil Painting', emoji: '🖼️', promptSuffix: 'rich oil painting, visible thick brushstrokes, classical fine art texture' },
  { id: 'photography', label: 'Photography', emoji: '📸', promptSuffix: 'photorealistic, high-end professional photography, sharp focus, DSLR' },
  { id: 'pixar', label: 'Pixar', emoji: '🎈', promptSuffix: '3D animation style, Pixar inspired, soft lighting, cute characters' },
  { id: 'psychedelic', label: 'Psychedelic', emoji: '🌀', promptSuffix: 'psychedelic art, trippy visuals, swirling kaleidoscopic colors' },
  { id: 'realistic', label: 'Realistic', emoji: '💎', promptSuffix: 'highly realistic, detailed textures, natural lifelike lighting' },
  { id: 'retro', label: 'Retro', emoji: '📻', promptSuffix: 'retro vintage style, faded film look, 70s 80s aesthetic grain' },
];

export interface VariantEdit {
  overlayText: string;
  textColor: string;
  textSize: number;
  textRotation: number;
  textX: number;
  textY: number;
  fontFamily: string;
  magicPrompt: string;
  isRemoveBg: boolean;
  isUpscale: boolean;
  imageScale: number;
}

export const DEFAULT_VARIANT_EDIT: VariantEdit = {
  overlayText: '',
  textColor: '#ffffff',
  textSize: 50,
  textRotation: 0,
  textX: 50,
  textY: 50,
  fontFamily: 'sans-serif',
  magicPrompt: '',
  isRemoveBg: false,
  isUpscale: false,
  imageScale: 100
};

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  caption: string;
  edit: VariantEdit;
  isCTA?: boolean;
}

export interface UserCredits {
  remaining: number;
  total: number;
  is_low_credit: boolean;
  subscription_required: boolean;
  is_paid_subscriber: boolean;
}

export interface AppToolsState {
  credits: UserCredits;
  abTesting: { 
    prompt: string; 
    style: GenerationStyle; 
    variations: string[]; 
    stage: WorkstationStage;
    selectedVarIndex: number | null;
    editedImage: string | null;
    variantEdits: VariantEdit[];
    shortlist: string[];
  };
  pod: { prompt: string; style: GenerationStyle; image: string | null; edit: VariantEdit };
  logo: { prompt: string; style: GenerationStyle; image: string | null; edit: VariantEdit };
  removeBg: { source: string | null; result: string | null };
  upscale: { image: string | null };
  textEdit: { source: string | null; result: string | null; text: string; settings: TextSettings };
  magic: { source: string | null; result: string | null; instruction: string };
  carousel: {
    prompt: string;
    style: GenerationStyle;
    slides: CarouselSlide[];
    activeIndex: number;
    view: 'HOME' | 'SETUP' | 'ANALYSIS' | 'EDITOR' | 'EXPORT';
    aspectRatio: '1:1' | '16:9' | '9:16';
    isLoading: boolean;
    numSlides: number;
    summary: string;
    musicStyle: string;
    contentSource: {
      type: 'prompt' | 'image' | 'url' | 'podcast' | 'video';
      value: string;
    };
  };
}

export interface TextSettings {
  color: string;
  font: string;
  size: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  direction: 'ltr' | 'rtl';
}

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
  color: '#ffffff',
  font: 'sans-serif',
  size: 48,
  rotation: 0,
  flipH: false,
  flipV: false,
  direction: 'ltr',
}

export interface PricingPlan {
  name: string;
  description: string;
  price: string;
  credits: string;
  features: string[];
  buttonText: string;
  popular?: boolean;
  stripePriceId?: string; // Add this for Stripe integration later
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Free Trial",
    price: "$0",
    credits: "10 credits free",
    description: "New users, casual creators",
    features: ["Standard image generation", "Basic background removal"],
    buttonText: "Start Free Trial"
  },
  {
    name: "Basic",
    price: "$15",
    credits: "50 credits / month",
    description: "Starter creators, hobbyists",
    features: ["Standard asset generation", "Cloud storage", "Essential tools"],
    buttonText: "Choose Basic"
  },
  {
    name: "Pro",
    price: "$25",
    credits: "180 credits / month",
    description: "Frequent creator, influencer",
    features: ["4K asset generation", "Unlimited Magic Edits", "Brand watermark"],
    buttonText: "Go Pro",
    popular: true
  },
  {
    name: "Agency",
    price: "$59",
    credits: "500 credits / month",
    description: "Agencies, studio, team",
    features: ["Full studio access", "Batch processing", "API access"],
    buttonText: "CHOOSE AGENCY"
  }
];