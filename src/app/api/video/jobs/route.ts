import { requireVideoProvider } from '@/lib/providers';
import { ProviderNotConfiguredError, ProviderRejectedError } from '@/lib/providers/types';
import { parseShotRequest, parseVideoJob } from '@/lib/validation';

export const runtime = 'nodejs';

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function file(form: FormData, key: string): File | null {
  const entry = form.get(key);
  return entry instanceof File && entry.size > 0 ? entry : null;
}

export async function POST(request: Request) {
  let submissionStarted = false;
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) {
      return reply({ error: 'Cross-site submissions are not accepted.', code: 'REJECTED' }, 403);
    }
    const provider = requireVideoProvider();
    const form = await request.formData();
    const raw = form.get('input');
    const requestId = form.get('requestId');
    if (typeof raw !== 'string' || raw.length > 25000 || typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) {
      return reply({ error: 'Valid shot parameters and a request ID are required.', code: 'REJECTED' }, 400);
    }
    const input = parseShotRequest(JSON.parse(raw));
    const portrait = file(form, 'portrait');
    const audio = file(form, 'audio');
    if (portrait && (portrait.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(portrait.type))) {
      return reply({ error: 'Portraits must be JPG, PNG, or WebP files no larger than 5 MB.', code: 'REJECTED' }, 400);
    }
    if (audio && (audio.size > 15 * 1024 * 1024 || !['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a'].includes(audio.type))) {
      return reply({ error: 'Audio must be an MP3, WAV, or M4A file no larger than 15 MB.', code: 'REJECTED' }, 400);
    }
    const { capabilities } = provider.getStatus();
    if (!capabilities.aspectRatios.includes(input.aspectRatio) || !capabilities.durationsSeconds.includes(input.durationSeconds)) {
      return reply({ error: 'This model does not support the selected aspect ratio or shot duration. Update the settings.', code: 'REJECTED' }, 400);
    }
    if ((input.useIdentityReference && (!portrait || !capabilities.identityReference))
      || (input.useAudioReference && (!audio || !capabilities.audioReference))) {
      return reply({ error: 'The required media or model capabilities are unavailable for this shot.', code: 'REJECTED' }, 400);
    }
    const assets = await provider.prepareAssets({
      portrait: input.useIdentityReference ? portrait : null,
      audio: input.useAudioReference ? audio : null,
      audioStartSeconds: input.audioStartSeconds,
      durationSeconds: input.durationSeconds,
    });
    if ((input.useIdentityReference && !assets.portraitReference) || (input.useAudioReference && !assets.audioReference)) {
      return reply({ error: 'The media adapter did not return the required references.', code: 'REJECTED' }, 400);
    }
    submissionStarted = true;
    const job = parseVideoJob(await provider.submitJob(input, assets, requestId));
    return reply({ job });
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return reply({ error: error.message, code: 'NOT_CONFIGURED' }, 503);
    }
    if (error instanceof ProviderRejectedError) {
      return reply({ error: 'The video provider rejected the request. Check the adapter parameters.', code: 'REJECTED' }, 422);
    }
    // Do not leak upstream errors, request payloads, credentials or signed URLs.
    return reply({
      code: submissionStarted ? 'SUBMISSION_UNKNOWN' : 'REJECTED',
      error: submissionStarted
        ? 'Submission is unconfirmed. Recover the task before submitting again to avoid duplicate generation.'
        : 'Input validation or media preparation failed. Check the inputs and adapter.',
    }, submissionStarted ? 502 : 400);
  }
}

export async function GET(request: Request) {
  try {
    const provider = requireVideoProvider();
    const search = new URL(request.url).searchParams;
    const taskId = search.get('taskId');
    const requestId = search.get('requestId');
    if ((!taskId && !requestId) || (taskId && requestId)
      || (taskId && taskId.length > 500)
      || (requestId && !/^[a-zA-Z0-9-]{16,80}$/.test(requestId))) {
      return reply({ error: 'Provide one valid task ID or request ID.' }, 400);
    }
    const raw = taskId ? await provider.getJob(taskId) : await provider.findJobByRequestId(requestId!);
    return reply({ job: raw === null ? null : parseVideoJob(raw) });
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) return reply({ error: error.message }, 503);
    return reply({ error: 'Task status is temporarily unavailable. Please check again shortly.' }, 502);
  }
}
