/**
 * Notification Service
 * Manages user alert notifications, read/unread states, and badge counts.
 * Future Flask swap target: /api/notifications
 */

import { INITIAL_NOTIFICATIONS } from '../data/notifications.js';
import { storage } from '../utils/storage.js';

const NOTIFICATIONS_STORAGE_KEY = 'smartcare_notifications';
const delay = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));

function getStoredNotifications() {
  const data = storage.get(NOTIFICATIONS_STORAGE_KEY);
  if (!data || !Array.isArray(data) || data.length === 0) {
    storage.set(NOTIFICATIONS_STORAGE_KEY, INITIAL_NOTIFICATIONS);
    return INITIAL_NOTIFICATIONS;
  }
  return data;
}

export const notificationService = {
  /**
   * Retrieve all notifications sorted newest first.
   */
  async getNotifications() {
    await delay();
    const notifs = getStoredNotifications();
    return [...notifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Retrieve unread notifications only.
   */
  async getUnreadNotifications() {
    await delay();
    const notifs = getStoredNotifications();
    return notifs
      .filter((n) => !n.read)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Mark a single notification as read.
   */
  async markNotificationAsRead(id) {
    await delay(100);
    const notifs = getStoredNotifications();
    const index = notifs.findIndex((n) => n.id === id);

    if (index === -1) {
      throw new Error(`Notification ${id} not found.`);
    }

    notifs[index] = { ...notifs[index], read: true };
    storage.set(NOTIFICATIONS_STORAGE_KEY, notifs);
    return notifs[index];
  },

  /**
   * Mark all notifications as read.
   */
  async markAllNotificationsAsRead() {
    await delay(120);
    const notifs = getStoredNotifications();
    const updated = notifs.map((n) => ({ ...n, read: true }));
    storage.set(NOTIFICATIONS_STORAGE_KEY, updated);
    return { success: true, count: updated.length };
  },

  /**
   * Delete notification by ID.
   */
  async deleteNotification(id) {
    await delay(140);
    const notifs = getStoredNotifications();
    const filtered = notifs.filter((n) => n.id !== id);

    if (filtered.length === notifs.length) {
      throw new Error(`Notification ${id} not found.`);
    }

    storage.set(NOTIFICATIONS_STORAGE_KEY, filtered);
    return { success: true, deletedId: id };
  },

  /**
   * Fast synchronous or async count of unread notifications for Topbar badge.
   */
  async getUnreadCount() {
    await delay(60);
    const notifs = getStoredNotifications();
    return notifs.filter((n) => !n.read).length;
  },
};
