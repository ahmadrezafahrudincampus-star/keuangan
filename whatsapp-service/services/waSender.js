/**
 * WhatsApp Sender Service
 * Manages the whatsapp-web.js client lifecycle, provides message sending,
 * and exposes formatters for various notification types.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config');

/** Timestamp-prefixed logger */
const log = (level, message, meta = '') => {
  const ts = new Date().toISOString();
  console[level](`[${ts}] [WASender] ${message}`, meta);
};

// ─── WhatsApp Client ──────────────────────────────────────────────────────────

let client = null;
let isReady = false;

/**
 * Create and configure the whatsapp-web.js client.
 */
function createClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
    restartOnAuthFail: true,
  });

  // ── Event Handlers ────────────────────────────────────────────────────────

  client.on('qr', (qr) => {
    log('info', 'QR Code received. Scan with your phone:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    log('info', '✅ WhatsApp authenticated successfully.');
  });

  client.on('auth_failure', (msg) => {
    log('error', `❌ Authentication failure: ${msg}`);
    isReady = false;
  });

  client.on('ready', () => {
    isReady = true;
    log('info', '🟢 WhatsApp client is ready.');
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    log('warn', `🔌 WhatsApp disconnected: ${reason}`);
    log('info', `Attempting reconnect in ${config.waReconnectDelay / 1000}s...`);
    setTimeout(() => {
      log('info', 'Reconnecting...');
      client.initialize().catch((err) => {
        log('error', 'Reconnect failed.', err.message);
      });
    }, config.waReconnectDelay);
  });

  return client;
}

/**
 * Initialize the WhatsApp client.
 * @returns {Promise<void>} Resolves when the client is ready.
 */
function initialize() {
  return new Promise((resolve, reject) => {
    createClient();

    client.once('ready', () => resolve());
    client.once('auth_failure', (msg) =>
      reject(new Error(`Auth failure: ${msg}`))
    );

    client
      .initialize()
      .catch((err) => {
        log('error', 'Initialization error.', err.message);
        reject(err);
      });
  });
}

// ─── Message Sending ──────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message to the given number.
 * @param {string} number  - Phone number (country code + number, no '+')
 * @param {string} message - Message text
 * @returns {Promise<Object>} whatsapp-web.js message object
 */
async function sendMessage(number, message) {
  if (!isReady) {
    log('error', 'Cannot send message — client is not ready.');
    throw new Error('WhatsApp client is not ready.');
  }

  const chatId = `${number}@c.us`;
  try {
    log('info', `📤 Sending message to ${number}...`);
    const result = await client.sendMessage(chatId, message);
    log('info', `✅ Message sent to ${number} successfully.`);
    return result;
  } catch (error) {
    log('error', `❌ Failed to send message to ${number}.`, error.message);
    throw error;
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Format a number as Indonesian Rupiah (e.g. Rp1.234.567).
 * @param {number|string} value
 * @returns {string}
 */
function formatCurrency(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'Rp0';
  return 'Rp' + Math.abs(num).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a new-transaction notification message.
 * @param {Object} data
 * @param {string} data.jenis         - 'Pemasukan' | 'Pengeluaran'
 * @param {string} data.kategori
 * @param {string} data.keterangan
 * @param {number} data.nominal
 * @param {string} data.tanggal
 * @param {string} data.jam
 * @param {number} data.saldoSaatIni
 * @returns {string}
 */
function formatNewTransactionMessage(data) {
  const isPengeluaran = data.jenis === 'Pengeluaran';
  const title = isPengeluaran ? '💸 *Pengeluaran Baru*' : '💰 *Pemasukan Baru*';

  return [
    title,
    '',
    `📂 *Kategori*      : ${data.kategori}`,
    `📝 *Keterangan*    : ${data.keterangan}`,
    `💵 *Nominal*       : ${formatCurrency(data.nominal)}`,
    `📅 *Tanggal*       : ${data.tanggal}`,
    `🕐 *Jam*           : ${data.jam}`,
    '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏦 *Saldo Saat Ini* : ${formatCurrency(data.saldoSaatIni)}`,
  ].join('\n');
}

/**
 * Format the daily recap message.
 * @param {Object} summaryData - Summary response from the API
 * @returns {string}
 */
function formatDailyRecapMessage(summaryData) {
  const data = summaryData.data || summaryData;
  const pemasukan = data.totalPemasukan || 0;
  const pengeluaran = data.totalPengeluaran || 0;
  const selisih = pemasukan - pengeluaran;

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: config.timezone,
  });

  let msg = [
    `📊 *Rekap Harian*`,
    `📅 ${today}`,
    '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Pemasukan*    : ${formatCurrency(pemasukan)}`,
    `💸 *Pengeluaran*  : ${formatCurrency(pengeluaran)}`,
    `📈 *Selisih*      : ${selisih >= 0 ? '+' : '-'}${formatCurrency(Math.abs(selisih))}`,
    `🔢 *Transaksi*    : ${data.jumlahTransaksi || 0} transaksi`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  // Top spending categories
  if (data.topKategori && data.topKategori.length > 0) {
    msg.push('', '📋 *Top Pengeluaran:*');
    data.topKategori.forEach((item, i) => {
      msg.push(`  ${i + 1}. ${item.kategori} — ${formatCurrency(item.total)}`);
    });
  }

  msg.push('', '_Tetap bijak dalam mengelola keuangan! 🙌_');
  return msg.join('\n');
}

/**
 * Format the weekly recap message.
 * @param {Object} summaryData
 * @returns {string}
 */
function formatWeeklyRecapMessage(summaryData) {
  const data = summaryData.data || summaryData;
  const pemasukan = data.totalPemasukan || 0;
  const pengeluaran = data.totalPengeluaran || 0;
  const selisih = pemasukan - pengeluaran;

  let msg = [
    `📊 *Rekap Mingguan*`,
    `📅 Periode: ${data.periode || 'Minggu ini'}`,
    '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Total Pemasukan*    : ${formatCurrency(pemasukan)}`,
    `💸 *Total Pengeluaran*  : ${formatCurrency(pengeluaran)}`,
    `📈 *Selisih*            : ${selisih >= 0 ? '+' : '-'}${formatCurrency(Math.abs(selisih))}`,
    `🔢 *Total Transaksi*    : ${data.jumlahTransaksi || 0} transaksi`,
    `📉 *Rata-rata / hari*   : ${formatCurrency(Math.round(pengeluaran / (data.jumlahHari || 7)))}/hari`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (data.topKategori && data.topKategori.length > 0) {
    msg.push('', '📋 *Top Pengeluaran Minggu Ini:*');
    data.topKategori.forEach((item, i) => {
      msg.push(`  ${i + 1}. ${item.kategori} — ${formatCurrency(item.total)}`);
    });
  }

  msg.push('', '_Semangat minggu depan! 💪_');
  return msg.join('\n');
}

/**
 * Format the monthly recap message.
 * @param {Object} summaryData
 * @returns {string}
 */
function formatMonthlyRecapMessage(summaryData) {
  const data = summaryData.data || summaryData;
  const pemasukan = data.totalPemasukan || 0;
  const pengeluaran = data.totalPengeluaran || 0;
  const selisih = pemasukan - pengeluaran;

  // Calculate days in the period (default 30)
  const daysInMonth = data.jumlahHari || 30;

  let msg = [
    `📊 *Rekap Bulanan*`,
    `📅 Periode: ${data.periode || 'Bulan lalu'}`,
    '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Total Pemasukan*    : ${formatCurrency(pemasukan)}`,
    `💸 *Total Pengeluaran*  : ${formatCurrency(pengeluaran)}`,
    `📈 *Selisih*            : ${selisih >= 0 ? '+' : '-'}${formatCurrency(Math.abs(selisih))}`,
    `🔢 *Total Transaksi*    : ${data.jumlahTransaksi || 0} transaksi`,
    `📉 *Rata-rata / hari*   : ${formatCurrency(Math.round(pengeluaran / daysInMonth))}/hari`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  if (data.topKategori && data.topKategori.length > 0) {
    msg.push('', '📋 *Top 5 Pengeluaran:*');
    data.topKategori.slice(0, 5).forEach((item, i) => {
      msg.push(`  ${i + 1}. ${item.kategori} — ${formatCurrency(item.total)}`);
    });
  }

  if (data.saldoAkhir !== undefined) {
    msg.push('', `🏦 *Saldo Akhir Bulan* : ${formatCurrency(data.saldoAkhir)}`);
  }

  msg.push('', '_Bulan baru, semangat baru! 🚀_');
  return msg.join('\n');
}

/**
 * Destroy the WhatsApp client (for graceful shutdown).
 * @returns {Promise<void>}
 */
async function destroy() {
  if (client) {
    log('info', '🔌 Destroying WhatsApp client...');
    await client.destroy();
    isReady = false;
    log('info', '✅ WhatsApp client destroyed.');
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  initialize,
  destroy,
  sendMessage,
  formatCurrency,
  formatNewTransactionMessage,
  formatDailyRecapMessage,
  formatWeeklyRecapMessage,
  formatMonthlyRecapMessage,
  /** Check if the WA client is currently connected and ready */
  isClientReady: () => isReady,
};
