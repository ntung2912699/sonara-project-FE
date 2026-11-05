export const TOKEN_KEY = 'sonora_token';
export const USER_KEY = 'sonora_user';
export const AUDIO_KEY = 'sonora_audio_jobs';
export function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return '--:--';
  const value = Number(seconds);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

export function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function readAudioJobs(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
}
