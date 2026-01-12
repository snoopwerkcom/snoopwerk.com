import React, { useState, useRef } from 'react';
import { generateAIImage, editAIImage, removeBackground, upscaleImage } from '../services/api';
import { ToolType, AppToolsState, StyleOption, VariantEdit, GenerationStyle, UserCredits } from '../types';
import ImageModal from './ImageModal';

interface ToolLogoDesignerProps {
  state: AppToolsState['logo'];
  credits: UserCredits;
  onUpdate: (newState: Partial<AppToolsState['logo']>) => void;
  onUpdateCredits: (credits: UserCredits) => void;
  onAction?: (tool: ToolType) => void;
}

/* =========================
   STYLES (File 2 naming)
========================= */
const LOGO_STYLES: StyleOption[] = [
  { id: 'none', label: 'None', emoji: '✖️', promptSuffix: '' },
  { id: 'svg', label: 'SVG / Vector', emoji: '📐', promptSuffix: 'clean flat vector logo, geometric, minimalist' },
  { id: 'minimalist', label: 'Minimalist', emoji: '☁️', promptSuffix: 'extreme minimalist branding, simple shapes' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', promptSuffix: 'esports mascot logo, sharp edges, bold contrast' },
  { id: 'retro', label: 'Retro', emoji: '📼', promptSuffix: 'vintage retro branding, classic vector style' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨', promptSuffix: 'playful cartoon illustration, flat colors' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🤖', promptSuffix: 'cyberpunk neon futuristic logo' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', promptSuffix: 'cinematic lighting, premium 3D logo render' },
];

/* =========================
   FONTS (File 2 feature)
========================= */
const FONTS = [
  { label: 'System Sans', value: 'sans-serif' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Inter Black', value: "'Inter', sans-serif" },
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
];


const ToolLogoDesigner: React.FC<ToolLogoDesignerProps> = ({
  state,
  credits,
  onUpdate,
  onUpdateCredits,
  onAction,
}) => {
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
 const [activeTab, setActiveTab] =
  useState<'create' | 'text' | 'refine'>('create');
