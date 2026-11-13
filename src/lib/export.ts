import { buildShotRequest } from './prompt-builder';
import { totalDuration } from './planner';
import { getStyle } from './templates';
import type { CreativePlan, LocalAssets, PromptContext } from './types';

function codeBlock(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((match) => match.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
}

export function exportPlan(plan: CreativePlan, context: PromptContext, assets: LocalAssets, format: 'json' | 'markdown'): void {
  const requests = plan.shots.map((shot) => buildShotRequest(plan, shot, context, assets.audioStartSeconds));
  const manifest = {
    formatVersion: 1,
    plan,
    assets: {
      portraitFilename: assets.portrait?.name ?? null,
      audioFilename: assets.audio?.name ?? null,
      audioStartSeconds: assets.audioStartSeconds,
      note: 'Local files are not embedded. Media references and duration mapping must be supplied by the video API adapter.',
    },
    shots: requests,
  };
  const text = format === 'json' ? JSON.stringify(manifest, null, 2) : [
    '# AI Rap Video Generator — Creative Plan',
    `Style: ${getStyle(plan.config.styleId).name} · Aspect ratio: ${plan.config.aspectRatio} · Total target duration: ${totalDuration(plan)} s`,
    '## Creative brief',
    ...Object.entries(plan.brief).map(([key, value]) => `**${BRIEF_LABELS[key]}**\n\n${value}`),
    `## Media\n\nPortrait reference: ${assets.portrait?.name ?? 'Not provided'}\n\nAudio: ${assets.audio?.name ?? 'Not provided'}\n\nAudio starts at: ${assets.audioStartSeconds} s. Media files are not included in this export.`,
    ...plan.shots.map((shot, index) => [
      `## ${String(index + 1).padStart(2, '0')} · ${shot.title}`,
      `Target duration: ${shot.durationSeconds} s\n\nPurpose: ${shot.purpose}`,
      `Action: ${shot.action}\n\nCamera: ${shot.camera}`,
      codeBlock(requests[index].prompt),
    ].join('\n\n')),
  ].join('\n\n');
  const blob = new Blob([text], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `rap-video-plan.${format === 'json' ? 'json' : 'md'}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const BRIEF_LABELS: Record<string, string> = {
  concept: 'Concept',
  performer: 'Performer',
  wardrobe: 'Wardrobe',
  setting: 'Setting',
  lighting: 'Lighting',
  visualStyle: 'Visual style',
  emotionalArc: 'Emotional arc',
};
