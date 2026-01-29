
export enum ToolType {
  LANDING = 'LANDING',
  AB_TESTING = 'AB_TESTING',
  POD_MERCH = 'POD_MERCH',
  REMOVE_BG = 'REMOVE_BG',
  UPSCALE = 'UPSCALE',
  TEXT_EDIT = 'TEXT_EDIT',
  THUMBNAILS = 'THUMBNAILS',
  MAGIC_EDIT = 'MAGIC_EDIT',
  LOGO_DESIGNER = 'LOGO_DESIGNER',
  PRICING = 'PRICING',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS', 
  
}

export type WorkstationStage = 'IDLE' | 'GENERATING' | 'EDITING' | 'REFINING' | 'COMPARE';

export type GenerationStyle = 
  | 'bold_typography' | 'brutalist' | 'carousel_storytelling' | 'illustration_cartoon' | 'minimalist'
  | 'realism' | 'cyberpunk' | 'cartoon' | 'cinematic' | 'manga'
  | 'none' | 'anime' | 'calligraphy' | 'looney_toon' | 'oil_painting' | 'photography' | 'psychedelic' | 'retro' | 'wave'
  | 'anime_cartoon' | 'gamer' | 'looneytoon' | 'newwave' | 'oilpainting' | 'photo_real' | 'psydelic' | 'pixar' | 'svg'
  | 'black_and_white' | 'soft' | 'dark';

export type TransitionStyle = 'fade' | 'slide' | 'zoom' | 'none';

export interface StyleOption {
  id: GenerationStyle;
  label: string;
  emoji: string;
  promptSuffix: string;
}

export const STYLES: StyleOption[] = [
  { 
    id: 'bold_typography', 
    label: 'Bold Typography', 
    emoji: '🅰️', 
    promptSuffix: 'bold high-impact typography, massive fonts, high contrast, professional graphic design, Swiss style, clean but loud' 
  },
  { 
    id: 'brutalist', 
    label: 'Brutalist', 
    emoji: '🧱', 
    promptSuffix: 'brutalist aesthetic, raw unpolished design, chunky borders, high contrast, neo-brutalism, industrial vibe, rule-breaking layout' 
  },
  { 
    id: 'carousel_storytelling', 
    label: 'Carousel Storytelling', 
    emoji: '📖', 
    promptSuffix: 'narrative visual storytelling, continuous flow between frames, cinematic storyboard, consistent characters, sequence-driven visuals' 
  },
  { 
    id: 'illustration_cartoon', 
    label: 'Illustration / Cartoon Style', 
    emoji: '🎨', 
    promptSuffix: 'modern flat vector illustration, clean lines, playful colors, stylized cartoon characters, trendy digital art' 
  },
  { 
    id: 'minimalist', 
    label: 'Minimalist', 
    emoji: '☁️', 
    promptSuffix: 'clean minimalist aesthetic, high-end professional design, ample white space, elegant, simple composition, sophisticated' 
  },
];

export interface VariantEdit {
  overlayText: string;
  subText: string;
  textColor: string;
  subTextColor: string;
  textSize: number;
  subTextSize: number;
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
  subText: '',
  textColor: '#ffffff',
  subTextColor: '#94a3b8',
  textSize: 60,
  subTextSize: 24,
  textRotation: 0,
  textX: 50,
  textY: 45,
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
    view: 'LANDING' | 'PRODUCTION';
  };
  pod: { prompt: string; style: GenerationStyle; image: string | null; edit: VariantEdit; view: 'LANDING' | 'PRODUCTION' };
  logo: { prompt: string; style: GenerationStyle; image: string | null; edit: VariantEdit; view: 'LANDING' | 'PRODUCTION' };
  removeBg: { source: string | null; result: string | null };
  upscale: { image: string | null };
  textEdit: { source: string | null; result: string | null; text: string; settings: TextSettings };
  magic: { source: string | null; result: string | null; instruction: string };
  carousel: {
    prompt: string;
    style: GenerationStyle;
    slides: CarouselSlide[];
    activeIndex: number;
    view: 'LANDING' | 'HOME' | 'SETUP' | 'ANALYSIS' | 'EDITOR' | 'EXPORT';
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    isLoading: boolean;
    numSlides: number;
    summary: string;
    musicStyle: string;
    transitionStyle: TransitionStyle;
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
  price: string;
  credits: string;
  description: string;
  features: string[];
  buttonText: string;
  popular?: boolean;
  paymentLink?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "FREE",
    price: "$0",
    credits: "100",                    // Changed from "10"
    description: "Trial",
    features: ["100 CREDITS", "Image Generation", "Magic Edit", "No watermark"],  // Changed from "10 credits"
    buttonText: "Get Started",
    paymentLink: "",
  },
  {
    name: "BASIC",
    price: "$22",
    credits: "600",                    // Changed from "60"
    description: "Growth",
    features: ["600 CREDITS", "Generate AI Images", "Remove Backgrounds", "4K Image Upscale", "Magic Edit Access"],  // Changed from "60 CREDITS"
    buttonText: "Choose Basic",
    paymentLink: import.meta.env.VITE_STRIPE_BASIC_LINK,
  },
  {
    name: "PRO",
    price: "$49",
    credits: "1800",                   // Changed from "180"
    description: "Power",
    features: ["1800 CREDITS", "Everything in BASIC", "Faster Rendering", "Batch Processing", "Priority Synthesis"],  // Changed from "180 CREDITS"
    buttonText: "Choose Pro",
    popular: true,
    paymentLink: import.meta.env.VITE_STRIPE_PRO_LINK,
  },
  {
    name: "AGENCY",
    price: "$99",
    credits: "5000",                   // Changed from "500"
    description: "Scale",
    features: ["5000 CREDITS", "Everything in PRO", "Team Access", "Unlimited Cloud History", "White-label Exports"],  // Changed from "500 CREDITS"
    buttonText: "Choose Agency",
    paymentLink: import.meta.env.VITE_STRIPE_AGENCY_LINK,
  }
];