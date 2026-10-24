/**
 * Centralized Native Fetch API Client for SmartCare
 * Handles base URL configuration, JWT Authorization headers,
 * JSON and FormData payload serialization, response normalization,
 * AbortController signals, structured ApiError modeling,
 * and 401 Unauthorized token revocation.
 */

export const TOKEN_STORAGE_KEY = 'smartcare_access_token';
export const USER_STORAGE_KEY = 'smartcare_current_user';

const BASE_URL = (
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://127.0.0.1:5000/api/v1'
).replace(/\/+$/, '');

/**
 * Normalized API Error Class
 * Provides structured error properties without leaking sensitive tokens or passwords.
 */
export class ApiError extends Error {
  constructor({
    status = 0,
    statusText = '',
    message = 'An unexpected error occurred.',
    code = 'UNKNOWN_ERROR',
    endpoint = '',
    data = null,
    isNetworkError = false,
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.endpoint = endpoint;
    this.data = data;
    this.isNetworkError = isNetworkError;
    this.isAuthError = status === 401;
  }
}

/**
 * Access token helpers
 */
export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to access localStorage:', err);
  }
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}

/**
 * Build URL with optional query parameters
 */
function buildUrl(endpoint, params = null) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${BASE_URL}${path}`;

  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  return url;
}

/**
 * Map HTTP status code to structured error code and default friendly message
 */
function mapStatusToErrorInfo(status, endpoint) {
  switch (status) {
    case 0:
      return {
        code: 'NETWORK_ERROR',
        defaultMessage: 'Unable to connect to SmartCare server. Please check your network connection and verify backend is running.',
      };
    case 400:
      return {
        code: 'BAD_REQUEST',
        defaultMessage: 'Bad request. Please check the submitted data.',
      };
    case 401:
      return {
        code: endpoint.includes('/auth/login') ? 'INVALID_CREDENTIALS' : 'AUTH_EXPIRED',
        defaultMessage: endpoint.includes('/auth/login')
          ? 'Invalid email or password.'
          : 'Your session has expired. Please sign in again.',
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        defaultMessage: 'You do not have permission to perform this action.',
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        defaultMessage: 'The requested resource was not found.',
      };
    case 409:
      return {
        code: 'CONFLICT',
        defaultMessage: 'A conflict occurred with this request. The resource may already exist.',
      };
    case 413:
      return {
        code: 'PAYLOAD_TOO_LARGE',
        defaultMessage: 'File size exceeds the allowed limit (10 MB).',
      };
    case 415:
      return {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        defaultMessage: 'The file type or format is not supported.',
      };
    case 422:
      return {
        code: 'VALIDATION_ERROR',
        defaultMessage: 'Validation failed for the submitted information.',
      };
    case 429:
      return {
        code: 'RATE_LIMITED',
        defaultMessage: 'Too many requests. Please wait a moment before trying again.',
      };
    case 500:
      return {
        code: 'SERVER_ERROR',
        defaultMessage: 'An internal server error occurred. Please try again later.',
      };
    case 502:
      return {
        code: 'BAD_GATEWAY',
        defaultMessage: 'SmartCare gateway error. The backend may be restarting.',
      };
    case 503:
      return {
        code: 'SERVICE_UNAVAILABLE',
        defaultMessage: 'The SmartCare service is temporarily unavailable. Please try again.',
      };
    case 504:
      return {
        code: 'GATEWAY_TIMEOUT',
        defaultMessage: 'The request timed out. Please try again.',
      };
    default:
      return {
        code: status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED',
        defaultMessage: `Request failed with HTTP status ${status}.`,
      };
  }
}

/**
 * Normalize and execute HTTP request
 */
async function request(endpoint, options = {}) {
  const { params, headers: customHeaders = {}, body, signal, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  const token = getAccessToken();
  const headers = { ...customHeaders };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Handle FormData vs JSON
  let processedBody = body;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      // Let the browser set Content-Type with multipart boundary
      delete headers['Content-Type'];
      delete headers['content-type'];
    } else if (typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      processedBody = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal,
      headers,
      body: processedBody,
    });
  } catch (networkError) {
    if (networkError.name === 'AbortError') {
      throw new ApiError({
        status: 0,
        statusText: 'Aborted',
        message: 'Request was cancelled.',
        code: 'REQUEST_ABORTED',
        endpoint,
        isNetworkError: false,
      });
    }

    const errorInfo = mapStatusToErrorInfo(0, endpoint);
    throw new ApiError({
      status: 0,
      statusText: 'Network Error',
      message: errorInfo.defaultMessage,
      code: errorInfo.code,
      endpoint,
      isNetworkError: true,
    });
  }

  // Handle 401 Unauthorized (only trigger session eviction for authenticated endpoints, not login/register)
  if (response.status === 401) {
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
    if (!isAuthEndpoint) {
      clearAccessToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('smartcare:unauthorized', {
            detail: { endpoint, status: 401 },
          })
        );
      }
    }
  }

  // Check response content type
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data = null;
  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorInfo = mapStatusToErrorInfo(response.status, endpoint);

    let errorMessage = errorInfo.defaultMessage;
    let errorCode = errorInfo.code;

    if (data && typeof data === 'object') {
      // Safe extraction: do not use if empty or contains server internals
      const candidateMsg = data.message || data.error;
      if (typeof candidateMsg === 'string' && candidateMsg.trim().length > 0) {
        // Protect against raw traceback exposure
        if (!candidateMsg.includes('Traceback') && !candidateMsg.includes('File "')) {
          errorMessage = candidateMsg;
        }
      }
      if (data.code && typeof data.code === 'string') {
        errorCode = data.code;
      }
    }

    throw new ApiError({
      status: response.status,
      statusText: response.statusText,
      message: errorMessage,
      code: errorCode,
      endpoint,
      data,
      isNetworkError: false,
    });
  }

  return data;
}

/**
 * Fetch a raw Blob (for authenticated document downloads & previews)
 */
async function downloadBlob(endpoint, options = {}) {
  const { params, headers: customHeaders = {}, signal, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  const token = getAccessToken();
  const headers = { ...customHeaders };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal,
      headers,
    });
  } catch (networkError) {
    if (networkError.name === 'AbortError') {
      throw new ApiError({
        status: 0,
        statusText: 'Aborted',
        message: 'Download was cancelled.',
        code: 'REQUEST_ABORTED',
        endpoint,
        isNetworkError: false,
      });
    }

    throw new ApiError({
      status: 0,
      statusText: 'Network Error',
      message: 'Network error downloading document file. Please check connection.',
      code: 'NETWORK_ERROR',
      endpoint,
      isNetworkError: true,
    });
  }

  if (response.status === 401) {
    clearAccessToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smartcare:unauthorized', {
          detail: { endpoint, status: 401 },
        })
      );
    }
  }

  if (!response.ok) {
    const errorInfo = mapStatusToErrorInfo(response.status, endpoint);
    let errMsg = errorInfo.defaultMessage;
    let errCode = errorInfo.code;

    try {
      const errJson = await response.json();
      if (errJson && (errJson.error || errJson.message)) {
        errMsg = errJson.error || errJson.message;
      }
    } catch {
      // Fallback
    }

    throw new ApiError({
      status: response.status,
      statusText: response.statusText,
      message: errMsg,
      code: errCode,
      endpoint,
      isNetworkError: false,
    });
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = null;
  if (contentDisposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }

  return { blob, filename, contentType: response.headers.get('content-type') };
}

export const apiClient = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
  },
  post(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'POST', body });
  },
  put(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'PUT', body });
  },
  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
  },
  upload(endpoint, formData, options = {}) {
    return request(endpoint, { ...options, method: 'POST', body: formData });
  },
  downloadBlob,
  getBaseUrl() {
    return BASE_URL;
  },
};

export default apiClient;
