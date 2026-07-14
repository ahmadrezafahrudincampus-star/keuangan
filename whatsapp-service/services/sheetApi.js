/**
 * Sheet API Service
 * Communicates with the Google Apps Script REST API to manage
 * transactions, summaries, and dashboard data.
 */

const axios = require('axios');
const config = require('../config');

/** Timestamp-prefixed logger */
const log = (level, message, meta = '') => {
  const ts = new Date().toISOString();
  console[level](`[${ts}] [SheetAPI] ${message}`, meta);
};

/**
 * Build a pre-configured axios instance.
 * Google Apps Script redirects on POST, so we follow redirects.
 */
const api = axios.create({
  baseURL: config.appsScriptUrl,
  timeout: config.requestTimeout,
  maxRedirects: 5,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Create a new transaction via the Apps Script API.
 * @param {Object} data - Transaction payload
 * @param {string} data.jenis        - 'Pemasukan' | 'Pengeluaran'
 * @param {string} data.kategori     - Category name
 * @param {string} data.keterangan   - Description
 * @param {number} data.nominal      - Amount
 * @param {string} [data.tanggal]    - Date string (YYYY-MM-DD)
 * @returns {Promise<Object>} API response data
 */
async function createTransaction(data) {
  try {
    log('info', 'Creating transaction...', JSON.stringify(data));
    const response = await api.post('', {
      action: 'createTransaction',
      ...data,
    });
    log('info', 'Transaction created successfully.');
    return response.data;
  } catch (error) {
    log('error', 'Failed to create transaction.', error.message);
    throw error;
  }
}

/**
 * Fetch a financial summary from the API.
 * @param {string} mode              - 'today' | 'thisWeek' | 'thisMonth' | 'custom'
 * @param {string} [startDate]       - Start date (YYYY-MM-DD) for custom range
 * @param {string} [endDate]         - End date (YYYY-MM-DD) for custom range
 * @returns {Promise<Object>} Summary data
 */
async function getSummary(mode, startDate, endDate) {
  try {
    log('info', `Fetching summary — mode: ${mode}`);
    const params = { action: 'getSummary', mode };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get('', { params });
    log('info', 'Summary fetched successfully.');
    return response.data;
  } catch (error) {
    log('error', 'Failed to fetch summary.', error.message);
    throw error;
  }
}

/**
 * Fetch dashboard data (overall balances, recent transactions, etc.)
 * @returns {Promise<Object>} Dashboard data
 */
async function getDashboard() {
  try {
    log('info', 'Fetching dashboard data...');
    const response = await api.get('', {
      params: { action: 'getDashboard' },
    });
    log('info', 'Dashboard data fetched successfully.');
    return response.data;
  } catch (error) {
    log('error', 'Failed to fetch dashboard data.', error.message);
    throw error;
  }
}

/**
 * Fetch transactions with optional filters.
 * @param {Object} [filters]
 * @param {string} [filters.jenis]       - Transaction type filter
 * @param {string} [filters.kategori]    - Category filter
 * @param {string} [filters.startDate]   - Range start (YYYY-MM-DD)
 * @param {string} [filters.endDate]     - Range end (YYYY-MM-DD)
 * @param {number} [filters.limit]       - Max results
 * @returns {Promise<Object>} Transactions list
 */
async function getTransactions(filters = {}) {
  try {
    log('info', 'Fetching transactions...', JSON.stringify(filters));
    const params = { action: 'getTransactions', ...filters };

    const response = await api.get('', { params });
    log('info', 'Transactions fetched successfully.');
    return response.data;
  } catch (error) {
    log('error', 'Failed to fetch transactions.', error.message);
    throw error;
  }
}

module.exports = {
  createTransaction,
  getSummary,
  getDashboard,
  getTransactions,
};
