import type { ProviderStatus, ShotRequest, VideoJob } from '../types';

export interface ProviderAssets {
  // URLs or IDs returned by YOUR media upload service, never browser blob URLs.
  portraitReference?: string;
  audioReference?: string;
}

export interface PrepareAssetsInput {
  portrait: File | null;
  audio: File | null;
  // The adapter must trim the source audio to this window, or use provider offset fields.
  audioStartSeconds: number;
  durationSeconds: number;
}

export interface VideoProvider {
  getStatus(): ProviderStatus;
  prepareAssets(input: PrepareAssetsInput): Promise<ProviderAssets>;
  submitJob(input: ShotRequest, assets: ProviderAssets, requestId: string): Promise<VideoJob>;
  getJob(taskId: string): Promise<VideoJob>;
  // null means acceptance is still unknown; it must NOT trigger an automatic resubmit.
  findJobByRequestId(requestId: string): Promise<VideoJob | null>;
}

export class ProviderNotConfiguredError extends Error {
  constructor() {
    super('Video API not configured. Implement the adapter in custom.ts to enable generation.');
    this.name = 'ProviderNotConfiguredError';
  }
}

// Throw only when the provider DEFINITIVELY rejected this new request.
// Network errors and timeouts are not proof of rejection.
export class ProviderRejectedError extends Error {
  constructor(message = 'The video provider explicitly rejected this generation request.') {
    super(message);
    this.name = 'ProviderRejectedError';
  }
}
