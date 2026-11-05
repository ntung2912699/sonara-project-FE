const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000/api')).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(`Could not connect to the music service at ${API_BASE_URL}. Check that the backend is running and the API URL is correct.`, 0);
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      throw new ApiError('The music service returned an invalid response.', response.status);
    }
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.message?.text || payload?.message || `Request failed (${response.status}).`;
    throw new ApiError(message, response.status, payload?.errors || {});
  }
  if (!payload || typeof payload !== 'object') {
    throw new ApiError('The music service returned an unexpected response.', response.status);
  }

  return payload;
}

export const api = {
  request,
  get: (path, token, options = {}) => request(path, { ...options, token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  put: (path, body, token) => request(path, { method: 'PUT', body, token }),
  delete: (path, token) => request(path, { method: 'DELETE', token }),
  upload: (path, body, token) => request(path, { method: 'POST', body, token }),
  baseUrl: API_BASE_URL,
};

export async function downloadFile(path, token, fallbackName) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/octet-stream', Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(`Could not connect to the music service at ${API_BASE_URL}.`, 0);
  }

  if (!response.ok) {
    let message = `Download failed (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload?.message?.text || payload?.message || message;
    } catch {
      // The server may return a non-JSON error body.
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
