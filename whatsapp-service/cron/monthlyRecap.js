/**
 * Monthly Recap Cron Job
 * Sends a monthly financial summary on the 1st of every month at 07:00 Asia/Jakarta.
 * Reports the PREVIOUS month's data.
 */

const cron = require('node-cron');
const config = require('../config');
const sheetApi = require('../services/sheetApi');
const waSender = require('../services/waSender');

/** Timestamp-prefixed logger */
const log = (level, message, meta = '') => {
  const ts = new Date().toISOString();
  console[level](`[${ts}] [MonthlyRecap] ${message}`, meta);
};

/**
 * Get last month's date range as YYYY-MM-DD strings.
 */
function getLastMonthRange() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const pad = (n) => String(n).padStart(2, '0');

  const startDate = `${firstDayLastMonth.getFullYear()}-${pad(firstDayLastMonth.getMonth() + 1)}-${pad(firstDayLastMonth.getDate())}`;
  const endDate = `${lastDayLastMonth.getFullYear()}-${pad(lastDayLastMonth.getMonth() + 1)}-${pad(lastDayLastMonth.getDate())}`;

  return { startDate, endDate };
}

/**
 * Set up the monthly recap cron job.
 * Runs on the 1st of every month at 07:00 in the configured timezone.
 */
function setup() {
  // ┌─── minute (0)
  // │ ┌─── hour (7)
  // │ │ ┌─── day of month (1)
  // │ │ │ ┌─── month (*)
  // │ │ │ │ ┌─── day of week (*)
  const schedule = '0 7 1 * *';

  cron.schedule(
    schedule,
    async () => {
      log('info', '⏰ Monthly recap cron triggered.');
      try {
        // Use custom range for last month to ensure accurate data
        const { startDate, endDate } = getLastMonthRange();
        log('info', `Fetching summary for last month: ${startDate} to ${endDate}`);

        const summary = await sheetApi.getSummary('custom', startDate, endDate);
        log('info', 'Monthly summary data received.');

        // Also fetch year-to-date for context
        let yearSummary = null;
        try {
          yearSummary = await sheetApi.getSummary('thisYear');
        } catch (e) {
          log('warn', 'Could not fetch year summary for context.', e.message);
        }

        // Enrich the summary data with period info
        const enrichedData = {
          ...(summary.data || summary),
          periode: `${startDate} s/d ${endDate}`,
        };

        if (yearSummary && yearSummary.data) {
          enrichedData.saldoAkhir = (yearSummary.data.totalPemasukan || 0) - (yearSummary.data.totalPengeluaran || 0);
        }

        // Format and send
        const message = waSender.formatMonthlyRecapMessage(enrichedData);
        await waSender.sendMessage(config.waTargetNumber, message);
        log('info', '✅ Monthly recap sent successfully.');
      } catch (error) {
        log('error', '❌ Monthly recap failed.', error.message);
      }
    },
    {
      scheduled: true,
      timezone: config.timezone,
    }
  );

  log('info', `📅 Monthly recap scheduled — 1st of every month at 07:00 ${config.timezone}.`);
}

module.exports = { setup };
