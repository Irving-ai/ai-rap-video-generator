import { shotOffset } from './planner';
import { getEnergy } from './templates';
import type { CreativePlan, PromptContext, Shot, ShotRequest } from './types';

export function buildPrompt(plan: CreativePlan, shot: Shot, context: PromptContext): string {
  const { brief, config } = plan;
  const sections = [
    'Create one continuous shot for a rap music video.',
    `CREATIVE CONTEXT\n${brief.concept}\nEmotional direction: ${brief.emotionalArc}`,
    `CHARACTER\n${brief.performer}\n${context.useIdentityReference ? 'Use the supplied portrait as the identity reference. Preserve the facial features and hairstyle.' : 'Keep the described appearance consistent throughout the shot.'}\nWardrobe: ${brief.wardrobe}`,
    `SETTING\n${brief.setting}`,
    `LIGHTING\n${brief.lighting}`,
    `PERFORMANCE\n${shot.action}\n${getEnergy(config.energy).direction}`,
    `CAMERA\n${shot.camera}`,
    `VISUAL STYLE\n${brief.visualStyle}`,
  ];
  if (config.lyrics.trim()) {
    sections.push(`LYRIC CONTEXT\n${config.lyrics.trim()}\nTreat these lyrics as creative context, not an instruction to generate or alter the soundtrack.`);
  }
  if (context.useAudioReference) {
    sections.push('AUDIO REFERENCE\nUse the supplied audio segment as the timing reference. Align the visible vocal performance with that segment.');
  }
  sections.push('CONSTRAINTS\nOne continuous shot. No additional performers. No outfit changes. No captions, logos or watermarks.');
  return sections.join('\n\n');
}

export function buildShotRequest(
  plan: CreativePlan,
  shot: Shot,
  context: PromptContext,
  audioStartSeconds = 0
): ShotRequest {
  return {
    shotId: shot.id,
    prompt: buildPrompt(plan, shot, context),
    durationSeconds: shot.durationSeconds,
    aspectRatio: plan.config.aspectRatio,
    audioStartSeconds: audioStartSeconds + shotOffset(plan, shot.id),
    ...context,
  };
}
