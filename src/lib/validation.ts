import type { CreativeConfig, CreativePlan, SavedDraft, ShotRequest, VideoJob } from './types';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}

export function isCreativeConfig(value: unknown): value is CreativeConfig {
  if (!record(value)) return false;
  return boundedText(value.theme, 1200)
    && boundedText(value.lyrics, 2400, true)
    && boundedText(value.performer, 600)
    && ['night-street', 'minimal-stage', 'comic'].includes(String(value.styleId))
    && ['9:16', '16:9', '1:1'].includes(String(value.aspectRatio))
    && [15, 30, 45].includes(value.durationSeconds as number)
    && ['restrained', 'confident', 'intense'].includes(String(value.energy));
}

export function isCreativePlan(value: unknown): value is CreativePlan {
  if (!record(value) || value.version !== 1 || !isCreativeConfig(value.config) || !record(value.brief)) return false;
  const fields = ['concept', 'performer', 'wardrobe', 'setting', 'lighting', 'visualStyle', 'emotionalArc'];
  const brief = value.brief;
  if (!fields.every((key) => boundedText(brief[key], 1600))) return false;
  if (!Array.isArray(value.shots) || value.shots.length < 1 || value.shots.length > 12) return false;
  const ids = new Set<string>();
  return value.shots.every((shot: unknown) => {
    if (!record(shot) || typeof shot.id !== 'string' || !/^shot-\d{2}$/.test(shot.id) || ids.has(shot.id)) return false;
    ids.add(shot.id);
    return ['title', 'purpose', 'action', 'camera'].every((key) => boundedText(shot[key], 1600))
      && Number.isInteger(shot.durationSeconds)
      && (shot.durationSeconds as number) >= 1
      && (shot.durationSeconds as number) <= 20;
  });
}

export function parseDraft(value: unknown): SavedDraft | null {
  if (!record(value) || value.version !== 1 || !isCreativeConfig(value.config) || !isCreativePlan(value.plan)) return null;
  return { version: 1, config: value.config, plan: value.plan };
}

export function parseShotRequest(value: unknown): ShotRequest {
  if (!record(value)
    || !boundedText(value.shotId, 80)
    || !boundedText(value.prompt, 20000)
    || !Number.isInteger(value.durationSeconds)
    || (value.durationSeconds as number) < 1
    || (value.durationSeconds as number) > 20
    || !['9:16', '16:9', '1:1'].includes(String(value.aspectRatio))
    || typeof value.audioStartSeconds !== 'number'
    || !Number.isFinite(value.audioStartSeconds)
    || value.audioStartSeconds < 0
    || value.audioStartSeconds > 86400
    || typeof value.useIdentityReference !== 'boolean'
    || typeof value.useAudioReference !== 'boolean') {
    throw new Error('Shot parameters are incomplete or outside the allowed range.');
  }
  return value as unknown as ShotRequest;
}

export function parseVideoJob(value: unknown): VideoJob {
  if (!record(value) || !boundedText(value.id, 500)
    || !['queued', 'processing', 'succeeded', 'failed'].includes(String(value.status))) {
    throw new Error('The video provider returned an unrecognized task status.');
  }
  let videoUrl: string | undefined;
  if (value.status === 'succeeded') {
    if (!boundedText(value.videoUrl, 8192)) throw new Error('The task completed, but no video URL was returned.');
    const parsed = new URL(value.videoUrl);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
      throw new Error('Video URLs must use HTTPS, except for local development URLs.');
    }
    videoUrl = parsed.href;
  }
  return {
    id: value.id,
    status: value.status as VideoJob['status'],
    ...(videoUrl ? { videoUrl } : {}),
    ...(value.status === 'failed' ? { error: boundedText(value.error, 600) ? value.error : 'The video provider reported that the task failed.' } : {}),
  };
}
