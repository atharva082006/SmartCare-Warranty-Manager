/**
 * Mock user database for SmartCare.
 * Provides default demo accounts and initial state.
 */

export const INITIAL_USERS = [
  {
    id: 'USR-2026-001',
    fullName: 'Vinay Raykar',
    email: 'vinay@smartcare.io',
    phone: '+91 98765 43210',
    password: 'password123',
    role: 'Admin',
    avatarInitials: 'VR',
    joinedDate: '2026-01-15',
    preferences: {
      theme: 'light',
      emailNotifications: true,
      warrantyAlerts: true,
      serviceReminders: true,
    },
  },
  {
    id: 'USR-2026-002',
    fullName: 'Demo Customer',
    email: 'demo@smartcare.io',
    phone: '+91 98888 77777',
    password: 'demo1234',
    role: 'User',
    avatarInitials: 'DC',
    joinedDate: '2026-02-01',
    preferences: {
      theme: 'light',
      emailNotifications: true,
      warrantyAlerts: true,
      serviceReminders: false,
    },
  },
];
