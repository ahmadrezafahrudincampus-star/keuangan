/**
 * Daily Recap Cron Job
 * Sends a daily financial summary at 21:00 Asia/Jakarta every day.
 */

const cron = require('node-cron');
const config = require('../config');
const sheetApi = require('../services/sheetApi');
const waSender = require('../services/waSender');

/** Timestamp-prefixed logger */
const log = (level, message, meta = '') => {
  const ts = new Date().toISOString();
  console[level](`[${ts}] [DailyRecap] ${message}`, meta);
};

/**
 * Set up the daily recap cron job.
 * Runs at 21:00 every day in the configured timezone.
 */
function setup() {
  // ┌─── minute (0)
  // │ ┌─── hour (21)
  // │ │ ┌─── day of month (*)
  // │ │ │ ┌─── month (*)
  // │ │ │ │ ┌─── day of week (*)
  const schedule = '0 21 * * *';

  cron.schedule(
    schedule,
    async () => {
      log('info', '⏰ Daily recap cron triggered.');
      try {
        // Fetch today's summary
        const summary = await sheetApi.getSummary('today');
        log('info', 'Summary data received.', JSON.stringify(summary));

        // Format the message
        const message = waSender.formatDailyRecapMessage(summary);

        // Send via WhatsApp
        await waSender.sendMessage(config.waTargetNumber, message);
        log('info', '✅ Daily recap sent successfully.');
      } catch (error) {
        log('error', '❌ Daily recap failed.', error.message);
      }
    },
    {
      scheduled: true,
      timezone: config.timezone,
    }
  );

  log('info', `📅 Daily recap scheduled at 21:00 ${config.timezone}.`);
}

module.exports = { setup };
