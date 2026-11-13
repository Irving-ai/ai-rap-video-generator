import type { CreativeConfig, CreativeBrief, Energy, StyleId } from './types';

export interface StyleTemplate {
  id: StyleId;
  name: string;
  englishName: string;
  description: string;
  brief: Omit<CreativeBrief, 'concept' | 'performer' | 'emotionalArc'>;
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'night-street',
    name: 'Rainy streets',
    englishName: 'AFTER HOURS',
    description: 'Cool blue light / Wet ground / Cinematic',
    brief: {
      wardrobe: 'Black jacket and a simple silver chain; unchanged across shots.',
      setting: 'An underground parking garage at night, with wet concrete and open space around the performer.',
      lighting: 'Cool blue overhead light with a subtle warm rim light behind the performer.',
      visualStyle: 'Cinematic realism, natural skin texture, restrained contrast and clear subject separation.',
    },
  },
  {
    id: 'minimal-stage',
    name: 'Minimalist stage',
    englishName: 'CENTER STAGE',
    description: 'One spotlight / Dark backdrop / Performance',
    brief: {
      wardrobe: 'A plain charcoal shirt and dark trousers; unchanged across shots.',
      setting: 'A spacious black-box stage with a matte floor and no audience visible.',
      lighting: 'One soft overhead spotlight and a restrained amber backlight.',
      visualStyle: 'Minimal performance film, clean composition, deep shadows and realistic skin texture.',
    },
  },
  {
    id: 'comic',
    name: 'Comic animation',
    englishName: 'INK & RHYTHM',
    description: 'Bold outlines / Flat colors / Graphic rhythm',
    brief: {
      wardrobe: 'A red varsity jacket, plain cream T-shirt and dark trousers; unchanged across shots.',
      setting: 'A stylized rooftop overlooking a geometric city skyline at dusk.',
      lighting: 'Graphic amber highlights against deep navy shadows, using a consistent palette.',
      visualStyle: 'Hand-drawn comic animation, bold ink contours, flat color shapes and subtle halftone texture. No printed words.',
    },
  },
];

export const ENERGY_OPTIONS: { id: Energy; name: string; direction: string; arc: string }[] = [
  { id: 'restrained', name: 'Subtle', direction: 'Small, deliberate hand gestures with calm posture and focused eye contact.', arc: 'From quiet anticipation to a confident statement' },
  { id: 'confident', name: 'Confident', direction: 'Natural hand gestures and measured shoulder movement, with direct confident eye contact.', arc: 'From restraint to confidence' },
  { id: 'intense', name: 'Intense', direction: 'Assertive upper-body gestures and energetic expression, keeping the face visible and the stance controlled.', arc: 'From anticipation to an energetic release' },
];

export const DEFAULT_CONFIG: CreativeConfig = {
  theme: 'An independent rapper steps into the light in a parking garage on a rainy night, moving from being overlooked to finding their voice.',
  lyrics: 'From the underground into the light, tonight I let my voice take flight.',
  performer: 'One independent rapper, with a consistent face and hairstyle across all shots.',
  styleId: 'night-street',
  aspectRatio: '9:16',
  durationSeconds: 15,
  energy: 'confident',
};

export function getStyle(id: StyleId): StyleTemplate {
  return STYLE_TEMPLATES.find((style) => style.id === id) ?? STYLE_TEMPLATES[0];
}

export function getEnergy(id: Energy) {
  return ENERGY_OPTIONS.find((energy) => energy.id === id) ?? ENERGY_OPTIONS[1];
}
