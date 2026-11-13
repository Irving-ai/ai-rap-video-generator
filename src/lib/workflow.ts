import { parseVideoJob } from './validation';
import type { LocalAssets, ShotRequest, ShotTask, VideoJob } from './types';

export function isTaskActive(task?: ShotTask): boolean {
  return Boolean(task && ['submitting', 'queued', 'processing', 'unknown'].includes(task.status));
}

export function requestFingerprint(input: ShotRequest, assets: LocalAssets): string {
  const describe = (file: File | null) => file ? [file.name, file.size, file.type, file.lastModified] : null;
  return JSON.stringify({
    input,
    portrait: input.useIdentityReference ? describe(assets.portrait) : null,
    audio: input.useAudioReference ? describe(assets.audio) : null,
  });
}

export function taskFromJob(task: ShotTask, job: VideoJob): ShotTask {
  return { ...task, job, status: job.status, error: job.error, retryable: job.status === 'failed' };
}

export async function submitShot(input: ShotRequest, assets: LocalAssets, requestId: string): Promise<{
  job?: VideoJob;
  rejected?: boolean;
  error?: string;
}> {
  const form = new FormData();
  form.set('input', JSON.stringify(input));
  form.set('requestId', requestId);
  if (input.useIdentityReference && assets.portrait) form.set('portrait', assets.portrait);
  if (input.useAudioReference && assets.audio) form.set('audio', assets.audio);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch('/api/video/jobs', { method: 'POST', body: form, signal: controller.signal });
    const data = await response.json() as { job?: unknown; code?: string; error?: string };
    if (!response.ok) {
      return {
        rejected: ['REJECTED', 'NOT_CONFIGURED'].includes(data.code ?? ''),
        error: data.error ?? 'The submission result is unknown. Check the task status before trying again.',
      };
    }
    return { job: parseVideoJob(data.job) };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function queryJob(task: ShotTask): Promise<VideoJob | null> {
  const params = new URLSearchParams(task.job ? { taskId: task.job.id } : { requestId: task.requestId });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/video/jobs?${params}`, { cache: 'no-store', signal: controller.signal });
    const data = await response.json() as { job?: unknown; error?: string };
    if (!response.ok) throw new Error(data.error ?? 'Task status is temporarily unavailable.');
    return data.job === null ? null : parseVideoJob(data.job);
  } finally {
    window.clearTimeout(timeout);
  }
}
