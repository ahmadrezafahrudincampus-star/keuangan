/**
 * Application Configuration
 * Loads environment variables from .env and exports a unified config object.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const config = {
  /** Google Apps Script deployment URL */
  appsScriptUrl: process.env.APPS_SCRIPT_URL || '',

  /** Target WhatsApp number (country code + number, no '+' prefix) */
  waTargetNumber: process.env.WA_TARGET_NUMBER || '',

  /** Express server port */
  port: parseInt(process.env.PORT, 10) || 3001,

  /** Timezone for cron jobs */
  timezone: 'Asia/Jakarta',

  /** WhatsApp reconnect delay in milliseconds */
  waReconnectDelay: 5000,

  /** Axios request timeout in milliseconds */
  requestTimeout: 30000,
};

// Validate critical config on startup
if (!config.appsScriptUrl) {
  console.warn('[CONFIG] ⚠️  APPS_SCRIPT_URL is not set. Sheet API calls will fail.');
}
if (!config.waTargetNumber) {
  console.warn('[CONFIG] ⚠️  WA_TARGET_NUMBER is not set. Notifications will fail.');
}

module.exports = config;
