export type StyleId = 'night-street' | 'minimal-stage' | 'comic';
export type AspectRatio = '9:16' | '16:9' | '1:1';
export type Energy = 'restrained' | 'confident' | 'intense';
export type Duration = 15 | 30 | 45;

export interface CreativeConfig {
  theme: string;
  lyrics: string;
  performer: string;
  styleId: StyleId;
  aspectRatio: AspectRatio;
  durationSeconds: Duration;
  energy: Energy;
}

export interface CreativeBrief {
  concept: string;
  performer: string;
  wardrobe: string;
  setting: string;
  lighting: string;
  visualStyle: string;
  emotionalArc: string;
}

export interface Shot {
  id: string;
  title: string;
  durationSeconds: number;
  purpose: string;
  action: string;
  camera: string;
}

export interface CreativePlan {
  version: 1;
  config: CreativeConfig;
  brief: CreativeBrief;
  shots: Shot[];
}

export interface LocalAssets {
  portrait: File | null;
  audio: File | null;
  audioStartSeconds: number;
}

export interface PromptContext {
  useIdentityReference: boolean;
  useAudioReference: boolean;
}

export interface ProviderCapabilities {
  identityReference: boolean;
  audioReference: boolean;
  aspectRatios: AspectRatio[];
  // Empty until an adapter declares the durations actually supported.
  durationsSeconds: number[];
}

export interface ProviderStatus {
  configured: boolean;
  capabilities: ProviderCapabilities;
  message: string;
}

export interface ShotRequest {
  shotId: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  audioStartSeconds: number;
  useIdentityReference: boolean;
  useAudioReference: boolean;
}

export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface VideoJob {
  id: string;
  status: JobStatus;
  videoUrl?: string;
  error?: string;
}

export type TaskStatus = JobStatus | 'submitting' | 'unknown';

export interface ShotTask {
  shotId: string;
  requestId: string;
  fingerprint: string;
  status: TaskStatus;
  job?: VideoJob;
  error?: string;
  // Only explicit rejection or terminal provider failure allows a fresh request.
  retryable?: boolean;
}

export interface SavedDraft {
  version: 1;
  config: CreativeConfig;
  plan: CreativePlan;
}
