import 'server-only';

import { customProvider } from './custom';
import { ProviderNotConfiguredError } from './types';

export function getVideoProvider() {
  return customProvider;
}

export function requireVideoProvider() {
  const provider = getVideoProvider();
  if (!provider.getStatus().configured) throw new ProviderNotConfiguredError();
  return provider;
}
