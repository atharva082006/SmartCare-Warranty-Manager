/**
 * Form validation helper utilities
 */

export const validators = {
  isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  isValidPhone(phone) {
    if (!phone) return true; // Optional by default unless required
    // Basic phone pattern permitting spaces, dashes, + prefix, 7-15 digits
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^\+?[0-9]{7,15}$/.test(cleaned);
  },

  isValidPassword(password, minLength = 6) {
    return typeof password === 'string' && password.length >= minLength;
  },

  isNotEmpty(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  },
};
