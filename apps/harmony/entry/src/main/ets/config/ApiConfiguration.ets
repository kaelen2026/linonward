import BuildProfile from 'BuildProfile';
import { isApiConfigured, resolveApiEndpoint } from './ApiEndpoint';

/**
 * The API origin baked in by `arkOptions.buildProfileFields` in
 * entry/build-profile.json5 — debug points at localhost:3001, release ships
 * empty on purpose.
 */
export const API_BASE_URL: string = BuildProfile.API_BASE_URL;
export const HYBRID_CHANNEL_URL: string = BuildProfile.HYBRID_CHANNEL_URL;

export function apiIsConfigured(): boolean {
  return isApiConfigured(API_BASE_URL);
}

export function apiEndpoint(path: string): string {
  return resolveApiEndpoint(API_BASE_URL, path);
}
