import 'server-only';

import type { ProviderCapabilities } from '../types';
import { ProviderNotConfiguredError, type VideoProvider } from './types';

// Implement ALL methods below, then change this to true.
// Environment variables alone do not enable an unfinished adapter.
const ADAPTER_IMPLEMENTED = false;

// TODO: Declare only capabilities you have verified for your chosen model.
const capabilities: ProviderCapabilities = {
  identityReference: false,
  audioReference: false,
  aspectRatios: [],
  durationsSeconds: [],
};

export const customProvider: VideoProvider = {
  getStatus() {
    const configured = ADAPTER_IMPLEMENTED && Boolean(
      process.env.VIDEO_API_BASE_URL?.trim()
      && process.env.VIDEO_API_KEY?.trim()
      && process.env.VIDEO_MODEL?.trim()
    );
    return {
      configured,
      capabilities,
      message: configured ? 'Video API configured' : 'Video API not configured',
    };
  },

  async prepareAssets(_input) {
    // TODO 1: Upload File objects to provider-accessible storage.
    // For audio, supply only the requested time window or map start/duration.
    // Return { portraitReference, audioReference }; return {} when no assets exist.
    throw new ProviderNotConfiguredError();
  },

  async submitJob(_input, _assets, _requestId) {
    // TODO 2: Map prompt, duration, aspect ratio, model and references to your API.
    // Read credentials from process.env on the server only.
    // Use requestId as the provider's idempotency key (or persist a mapping).
    // Return a normalized VideoJob; never blindly retry a timed-out POST.
    throw new ProviderNotConfiguredError();
  },

  async getJob(_taskId) {
    // TODO 3: Fetch status. Map provider statuses to queued/processing/succeeded/failed.
    // succeeded requires a usable videoUrl; failed requires an explicit terminal failure.
    throw new ProviderNotConfiguredError();
  },

  async findJobByRequestId(_requestId) {
    // TODO 4: Recover a submission whose HTTP response was lost.
    // Use provider lookup or your own durable requestId -> taskId mapping.
    // Return null only for unresolved acceptance, not a fabricated failure.
    throw new ProviderNotConfiguredError();
  },
};
