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
  PRICING = 'PRICING'
}

export type WorkstationStage = 'IDLE' | 'GENERATING' | 'EDITING' | 'REFINING' | 'COMPARE';

export type GenerationStyle = 
  | 'bold_typography' | 'brutalist' | 'carousel_storytelling' | 'illustration_cartoon' | 'minimalist'
  | 'realism' | 'cyberpunk' | 'cartoon' | 'cinematic' | 'manga'
  | 'none' | 'anime' | 'calligraphy' | 'looney_toon' | 'oil_painting' | 'photography' | 'psychedelic' | 'retro' | 'wave'
  | 'anime_cartoon' | 'gamer' | 'looneytoon' | 'newwave' | 'oilpainting' | 'photo_real' | 'psydelic' | 'pixar' | 'svg'
  | 'black_and_white';

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
    view: 'LANDING' | 'HOME' | 'SETUP' | 'ANALYSIS' | 'EDITOR' | 'EXPORT';
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
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
  price: string;
  credits: string;
  description: string;
  features: string[];
  buttonText: string;
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "FREE",
    price: "$0",
    credits: "",
    description: "",
    features: ["10 credits", "Image Generation", "Magic Edit", "No watermark"],
    buttonText: "Get Started"
  },
  {
    name: "BASIC",
    price: "$15",
    credits: "/month",
    description: "",
    features: ["60 credits / month", "Image generation", "Magic edit", "Background removal"],
    buttonText: "Choose"
  },
  {
    name: "PRO",
    price: "$25",
    credits: "/month",
    description: "",
    features: ["180 credits / month", "Everything in BASIC", "Faster rendering", "Higher resolution"],
    buttonText: "Choose",
    popular: true
  },
  {
    name: "AGENCY",
    price: "$59",
    credits: "/month",
    description: "",
    features: ["500 credits / month", "Everything in PRO", "Team access", "Client export tools"],
    buttonText: "Choose"
  }
];