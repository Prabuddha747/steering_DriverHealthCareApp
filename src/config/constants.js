/**
 * App-wide constants: connection states, thresholds, admin defaults, sensor countdown.
 */
export const CONNECTION_STATE = {
  CONNECTED: 'CONNECTED',
  STALE: 'STALE',
  OFFLINE: 'OFFLINE',
  NO_DATA: 'NO_DATA',
};

export const STALE_THRESHOLD = 30 * 1000;   // 30s
export const OFFLINE_THRESHOLD = 90 * 1000; // 90s

// Default admin (map "admin123" to email for Firebase)
export const DEFAULT_ADMIN_EMAIL = 'admin123@driverhealth.app';
export const DEFAULT_ADMIN_PASSWORD = 'admin123';
export const SENSOR_COUNTDOWN_SEC = 10;
  