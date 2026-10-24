/**
 * Authentication Service
 * Communicates with Flask backend API (/api/v1/auth/*)
 * Manages JWT tokens, credentials, and user profile sessions.
 */

import {
  apiClient,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  USER_STORAGE_KEY,
} from './apiClient.js';

const REMEMBER_ME_KEY = 'smartcare_remember_me';

/**
 * Normalize backend user representation into frontend format
 */
export function normalizeUser(backendUser) {
  if (!backendUser) return null;
  const username = backendUser.username || '';
  const fullName =
    backendUser.fullName ||
    backendUser.full_name ||
    username ||
    backendUser.email?.split('@')[0] ||
    'User';

  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'SC';

  return {
    id: backendUser.id,
    userId: backendUser.id,
    username,
    fullName,
    email: backendUser.email,
    phone: backendUser.phone || '',
    role: backendUser.role || 'User',
    avatarInitials: initials,
    joinedDate:
      backendUser.created_at ||
      backendUser.joinedDate ||
      new Date().toISOString().split('T')[0],
    preferences: backendUser.preferences || {
      theme: 'light',
      emailNotifications: true,
      warrantyAlerts: true,
      serviceReminders: true,
    },
  };
}

export const authService = {
  /**
   * Log in user with email and password via backend API
   */
  async login(email, password, rememberMe = false) {
    const payload = {
      email: email.trim().toLowerCase(),
      password,
    };

    const response = await apiClient.post('/auth/login', payload);

    if (response && response.access_token) {
      setAccessToken(response.access_token);
    }

    const normalized = normalizeUser(response.user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, payload.email);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    } catch (err) {
      console.error('Failed to update localStorage session:', err);
    }

    return normalized;
  },

  /**
   * Register a new user account with backend API and auto-login
   */
  async register(userData) {
    const rawUsername =
      userData.username ||
      userData.fullName ||
      userData.email.split('@')[0];
    const username = rawUsername.trim().replace(/\s+/g, '_').substring(0, 80);

    const payload = {
      username: username.length >= 3 ? username : `${username}_user`,
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      phone: userData.phone ? userData.phone.trim() : null,
    };

    await apiClient.post('/auth/register', payload);

    // Auto-login to obtain JWT token and profile
    return this.login(payload.email, payload.password, false);
  },

  /**
   * Get cached user from localStorage synchronously
   */
  getCurrentUser() {
    try {
      const data = localStorage.getItem(USER_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Fetch live user profile from backend /auth/me
   */
  async fetchCurrentUser() {
    const token = getAccessToken();
    if (!token) return null;

    const response = await apiClient.get('/auth/me');
    const normalized = normalizeUser(response.user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.error('Failed to update cached user profile:', err);
    }
    return normalized;
  },

  /**
   * Check if current session has an access token
   */
  isAuthenticated() {
    return !!getAccessToken();
  },

  /**
   * Get saved remember-me email if any
   */
  getRememberedEmail() {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) || '';
    } catch {
      return '';
    }
  },

  /**
   * Log out active user and clear tokens
   */
  async logout() {
    clearAccessToken();
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignored
    }
    return true;
  },

  /**
   * Request password reset (clean client notification)
   */
  async requestPasswordReset(email) {
    // Simulated endpoint for frontend UI consistency
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      success: true,
      message: 'Password reset instructions have been dispatched to your email.',
    };
  },

  /**
   * Update active user profile
   */
  async updateProfile(userId, updates) {
    const current = this.getCurrentUser() || {};
    const updated = {
      ...current,
      ...updates,
      preferences: {
        ...(current.preferences || {}),
        ...(updates.preferences || {}),
      },
    };
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to cache updated profile:', err);
    }
    return updated;
  },
};

export default authService;
