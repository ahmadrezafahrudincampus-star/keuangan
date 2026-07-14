/**
 * Weekly Recap Cron Job
 * Sends a weekly financial summary every Sunday at 21:00 Asia/Jakarta.
 */

const cron = require('node-cron');
const config = require('../config');
const sheetApi = require('../services/sheetApi');
const waSender = require('../services/waSender');

/** Timestamp-prefixed logger */
const log = (level, message, meta = '') => {
  const ts = new Date().toISOString();
  console[level](`[${ts}] [WeeklyRecap] ${message}`, meta);
};

/**
 * Set up the weekly recap cron job.
 * Runs every Sunday at 21:00 in the configured timezone.
 */
function setup() {
  // ┌─── minute (0)
  // │ ┌─── hour (21)
  // │ │ ┌─── day of month (*)
  // │ │ │ ┌─── month (*)
  // │ │ │ │ ┌─── day of week (0 = Sunday)
  const schedule = '0 21 * * 0';

  cron.schedule(
    schedule,
    async () => {
      log('info', '⏰ Weekly recap cron triggered.');
      try {
        // Fetch this week's summary
        const summary = await sheetApi.getSummary('thisWeek');
        log('info', 'Weekly summary data received.');

        // Format the message
        const message = waSender.formatWeeklyRecapMessage(summary);

        // Send via WhatsApp
        await waSender.sendMessage(config.waTargetNumber, message);
        log('info', '✅ Weekly recap sent successfully.');
      } catch (error) {
        log('error', '❌ Weekly recap failed.', error.message);
      }
    },
    {
      scheduled: true,
      timezone: config.timezone,
    }
  );

  log('info', `📅 Weekly recap scheduled — every Sunday at 21:00 ${config.timezone}.`);
}

module.exports = { setup };
