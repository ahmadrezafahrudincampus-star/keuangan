/**
 * ============================================================
 * WhatsApp Finance Notifier — Main Entry Point
 * ============================================================
 *
 * Express server + WhatsApp client + Cron jobs.
 *
 * Endpoints:
 *   POST /notify/new-transaction  — Send new transaction notification
 *   GET  /health                  — Health check
 */

const express = require('express');
const config = require('./config');
const waSender = require('./services/waSender');
const dailyRecap = require('./cron/dailyRecap');
const weeklyRecap = require('./cron/weeklyRecap');
const monthlyRecap = require('./cron/monthlyRecap');

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = (level, message, meta = '') => {
  const ts = new Date().toISOString();
  console[level](`[${ts}] [Server] ${message}`, meta);
};

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    waClientReady: waSender.isClientReady(),
    timestamp: new Date().toISOString(),
  });
});

// ─── New Transaction Notification ─────────────────────────────────────────────

app.post('/notify/new-transaction', async (req, res) => {
  try {
    const { jenis, kategori, keterangan, nominal, tanggal, jam, saldoSaatIni } = req.body;

    // Validate required fields
    if (!jenis || !kategori || !keterangan || nominal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Field wajib: jenis, kategori, keterangan, nominal',
      });
    }

    // Check if WA client is ready
    if (!waSender.isClientReady()) {
      return res.status(503).json({
        success: false,
        message: 'WhatsApp client belum siap. Silakan coba lagi nanti.',
      });
    }

    // Format the notification message
    const message = waSender.formatNewTransactionMessage({
      jenis,
      kategori,
      keterangan,
      nominal,
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      jam: jam || new Date().toTimeString().split(' ')[0],
      saldoSaatIni: saldoSaatIni || 0,
    });

    // Send via WhatsApp
    await waSender.sendMessage(config.waTargetNumber, message);

    log('info', `📤 Transaction notification sent — ${jenis}: ${keterangan} ${waSender.formatCurrency(nominal)}`);

    res.json({
      success: true,
      message: 'Notifikasi WhatsApp berhasil dikirim',
    });
  } catch (error) {
    log('error', '❌ Failed to send transaction notification.', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim notifikasi: ' + error.message,
    });
  }
});

// ─── Error Handling Middleware ─────────────────────────────────────────────────

app.use((err, req, res, next) => {
  log('error', 'Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} tidak ditemukan`,
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  log('info', '🚀 Starting WhatsApp Finance Notifier...');
  log('info', `   Apps Script URL: ${config.appsScriptUrl ? '✅ configured' : '❌ NOT SET'}`);
  log('info', `   Target number:   ${config.waTargetNumber ? config.waTargetNumber : '❌ NOT SET'}`);
  log('info', `   Port:            ${config.port}`);

  // 1. Start Express server
  const server = app.listen(config.port, () => {
    log('info', `🌐 Express server listening on port ${config.port}`);
    log('info', `   Health check:    http://localhost:${config.port}/health`);
    log('info', `   Notify endpoint: POST http://localhost:${config.port}/notify/new-transaction`);
  });

  // 2. Initialize WhatsApp client
  try {
    log('info', '📱 Initializing WhatsApp client...');
    log('info', '   (Scan QR code with your phone if this is the first time)');
    await waSender.initialize();
    log('info', '✅ WhatsApp client ready!');

    // 3. Setup cron jobs (only after WA client is ready)
    log('info', '⏰ Setting up cron jobs...');
    dailyRecap.setup();
    weeklyRecap.setup();
    monthlyRecap.setup();
    log('info', '✅ All cron jobs scheduled.');
  } catch (error) {
    log('error', '❌ Failed to initialize WhatsApp client.', error.message);
    log('warn', '⚠️  Server will continue running. Cron jobs will NOT send messages until WA is connected.');
    log('warn', '   Restart the service to try again.');
  }

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────

  const shutdown = async (signal) => {
    log('info', `\n🛑 Received ${signal}. Shutting down gracefully...`);

    // Destroy WhatsApp client
    try {
      if (waSender.isClientReady()) {
        log('info', '   Closing WhatsApp client...');
        await waSender.destroy();
      }
    } catch (e) {
      // Ignore errors during shutdown
    }

    // Close Express server, then exit
    server.close(() => {
      log('info', '   Express server closed.');
      log('info', '👋 Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log('error', '💥 Uncaught Exception:', error.message);
    log('error', error.stack);
  });

  process.on('unhandledRejection', (reason) => {
    log('error', '💥 Unhandled Rejection:', String(reason));
  });
}

// Run
start();
