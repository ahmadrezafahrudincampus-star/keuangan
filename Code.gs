/**
 * ============================================================
 * Personal Finance Tracker — Google Apps Script REST API
 * ============================================================
 * 
 * REST API menggunakan doGet/doPost dengan parameter "action"
 * untuk routing. Terhubung ke Google Spreadsheet sebagai database.
 * 
 * Sheet: "Transaksi"
 * Kolom: No | ID | Tanggal | Jam | Jenis | Kategori | Keterangan | Nominal | Catatan | Timestamp | Status Sinkronisasi
 * 
 * Deploy: Deploy > New deployment > Web app > Anyone
 */

// ─── KONFIGURASI ──────────────────────────────────────────────────────────────

const SHEET_NAME = 'Transaksi';
const TIMEZONE = 'Asia/Jakarta';

// Indeks kolom (0-based)
const COL = {
  NO: 0,
  ID: 1,
  TANGGAL: 2,
  JAM: 3,
  JENIS: 4,
  KATEGORI: 5,
  KETERANGAN: 6,
  NOMINAL: 7,
  CATATAN: 8,
  TIMESTAMP: 9,
  STATUS_SYNC: 10,
};

const HEADER_ROW = [
  'No', 'ID', 'Tanggal', 'Jam', 'Jenis', 'Kategori',
  'Keterangan', 'Nominal', 'Catatan', 'Timestamp', 'Status Sinkronisasi'
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Mendapatkan sheet "Transaksi". Jika belum ada, buat beserta header.
 */
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER_ROW);
    sheet.getRange(1, 1, 1, HEADER_ROW.length).setFontWeight('bold');
  }
  return sheet;
}

/**
 * Generate UUID menggunakan Utilities.getUuid().
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Hitung saldo saat ini (total pemasukan - total pengeluaran).
 */
function calculateSaldo() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  var data = sheet.getRange(2, 1, lastRow - 1, HEADER_ROW.length).getValues();
  var saldo = 0;
  for (var i = 0; i < data.length; i++) {
    var nominal = parseFloat(data[i][COL.NOMINAL]) || 0;
    if (data[i][COL.JENIS] === 'Pemasukan') {
      saldo += nominal;
    } else if (data[i][COL.JENIS] === 'Pengeluaran') {
      saldo -= nominal;
    }
  }
  return saldo;
}

/**
 * Format response JSON standar.
 */
function formatResponse(success, data, message) {
  var response = { success: success };
  if (data !== undefined && data !== null) response.data = data;
  if (message) response.message = message;
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Format angka ke Rupiah: "Rp1.234.567"
 */
function formatCurrency(value) {
  var num = parseFloat(value) || 0;
  var str = Math.abs(num).toString();
  var parts = str.split('.');
  var intPart = parts[0];
  var formatted = '';
  var count = 0;
  for (var i = intPart.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) formatted = '.' + formatted;
    formatted = intPart[i] + formatted;
    count++;
  }
  return (num < 0 ? '-' : '') + 'Rp' + formatted;
}

/**
 * Parse body dari POST request.
 */
function parseBody(e) {
  try {
    if (e && e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (err) {
    // ignore parse error
  }
  return {};
}

/**
 * Dapatkan tanggal saat ini di timezone Jakarta.
 */
function getNow() {
  return new Date();
}

/**
 * Format Date ke string YYYY-MM-DD di timezone Jakarta.
 */
function formatDate(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Format Date ke string HH:mm:ss di timezone Jakarta.
 */
function formatTime(date) {
  return Utilities.formatDate(date, TIMEZONE, 'HH:mm:ss');
}

/**
 * Format Date ke ISO string.
 */
function formatTimestamp(date) {
  return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
}

/**
 * Parse string YYYY-MM-DD jadi Date object (tanpa waktu).
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  var parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * Mendapatkan semua data transaksi sebagai array of objects.
 */
function getAllTransactions() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, HEADER_ROW.length).getValues();
  var transactions = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var tanggalVal = row[COL.TANGGAL];
    var tanggalStr;
    if (tanggalVal instanceof Date) {
      tanggalStr = formatDate(tanggalVal);
    } else {
      tanggalStr = String(tanggalVal);
    }

    var jamVal = row[COL.JAM];
    var jamStr;
    if (jamVal instanceof Date) {
      jamStr = formatTime(jamVal);
    } else {
      jamStr = String(jamVal);
    }

    transactions.push({
      no: row[COL.NO],
      id: row[COL.ID],
      tanggal: tanggalStr,
      jam: jamStr,
      jenis: row[COL.JENIS],
      kategori: row[COL.KATEGORI],
      keterangan: row[COL.KETERANGAN],
      nominal: parseFloat(row[COL.NOMINAL]) || 0,
      catatan: row[COL.CATATAN] || '',
      timestamp: row[COL.TIMESTAMP],
      statusSinkronisasi: row[COL.STATUS_SYNC],
      _rowIndex: i + 2 // actual row in sheet (1-indexed, skip header)
    });
  }
  return transactions;
}

/**
 * Mendapatkan No terakhir (auto increment).
 */
function getNextNo() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  var lastNo = sheet.getRange(lastRow, COL.NO + 1).getValue();
  return (parseInt(lastNo) || 0) + 1;
}

/**
 * Menghitung date range berdasarkan mode.
 */
function getDateRange(mode, customStart, customEnd) {
  var now = getNow();
  var todayStr = formatDate(now);
  var today = parseDate(todayStr);
  var startDate, endDate;

  switch (mode) {
    case 'today':
      startDate = today;
      endDate = today;
      break;

    case 'yesterday':
      var yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday;
      endDate = yesterday;
      break;

    case '7days':
      endDate = today;
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;

    case 'thisWeek':
      // Minggu ini (Senin - Minggu)
      var dayOfWeek = today.getDay(); // 0=Minggu, 1=Senin, ...
      var diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - diffToMonday);
      endDate = today;
      break;

    case '30days':
      endDate = today;
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;

    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
      break;

    case 'lastMonth':
      var lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      startDate = lastMonth;
      endDate = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
      break;

    case 'thisYear':
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = today;
      break;

    case 'custom':
      startDate = parseDate(customStart);
      endDate = parseDate(customEnd);
      if (!startDate || !endDate) {
        throw new Error('startDate dan endDate harus diisi untuk mode custom (format: YYYY-MM-DD)');
      }
      break;

    default:
      startDate = today;
      endDate = today;
  }

  return { startDate: startDate, endDate: endDate };
}

/**
 * Filter transaksi berdasarkan tanggal (YYYY-MM-DD string comparison).
 */
function filterByDateRange(transactions, startDate, endDate) {
  var startStr = formatDate(startDate);
  var endStr = formatDate(endDate);

  return transactions.filter(function (t) {
    return t.tanggal >= startStr && t.tanggal <= endStr;
  });
}


// ─── REQUEST HANDLERS ────────────────────────────────────────────────────────

/**
 * Handle GET requests.
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    switch (action) {
      case 'getTransactions':
        return handleGetTransactions(e);
      case 'getSummary':
        return handleGetSummary(e);
      case 'getDashboard':
        return handleGetDashboard(e);
      case 'getTransactionDetail':
        return handleGetTransactionDetail(e);
      case 'getStatistics':
        return handleGetStatistics(e);
      default:
        return formatResponse(false, null, 'Action tidak dikenali: ' + action);
    }
  } catch (err) {
    return formatResponse(false, null, 'Error: ' + err.message);
  }
}

/**
 * Handle POST/PUT requests.
 */
function doPost(e) {
  try {
    var body = parseBody(e);
    var action = (e && e.parameter && e.parameter.action)
      ? e.parameter.action
      : (body.action || '');

    switch (action) {
      case 'createTransaction':
        return handleCreateTransaction(body);
      case 'updateTransaction':
        return handleUpdateTransaction(body);
      case 'deleteTransaction':
        return handleDeleteTransaction(body);
      case 'syncBatch':
        return handleSyncBatch(body);
      default:
        return formatResponse(false, null, 'Action tidak dikenali: ' + action);
    }
  } catch (err) {
    return formatResponse(false, null, 'Error: ' + err.message);
  }
}


// ─── ENDPOINT IMPLEMENTATIONS ─────────────────────────────────────────────────

/**
 * a) POST ?action=createTransaction
 * Body: { jenis, kategori, keterangan, nominal, tanggal, jam, catatan }
 */
function handleCreateTransaction(body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var sheet = getSheet();
    var now = getNow();

    // Validasi input wajib
    if (!body.jenis || !body.kategori || !body.keterangan || !body.nominal) {
      return formatResponse(false, null, 'Field wajib: jenis, kategori, keterangan, nominal');
    }

    var jenis = body.jenis;
    if (jenis !== 'Pemasukan' && jenis !== 'Pengeluaran') {
      return formatResponse(false, null, 'Jenis harus "Pemasukan" atau "Pengeluaran"');
    }

    var nominal = parseFloat(body.nominal);
    if (isNaN(nominal) || nominal <= 0) {
      return formatResponse(false, null, 'Nominal harus berupa angka positif');
    }

    var id = generateId();
    var no = getNextNo();
    var tanggal = body.tanggal || formatDate(now);
    var jam = body.jam || formatTime(now);
    var catatan = body.catatan || '';
    var timestamp = formatTimestamp(now);
    var statusSync = 'Sudah Sinkron';

    var newRow = [no, id, tanggal, jam, jenis, body.kategori, body.keterangan, nominal, catatan, timestamp, statusSync];
    sheet.appendRow(newRow);

    // Hitung saldo terbaru
    var saldoSaatIni = calculateSaldo();

    var transaksi = {
      no: no,
      id: id,
      tanggal: tanggal,
      jam: jam,
      jenis: jenis,
      kategori: body.kategori,
      keterangan: body.keterangan,
      nominal: nominal,
      catatan: catatan,
      timestamp: timestamp,
      statusSinkronisasi: statusSync
    };

    lock.releaseLock();
    return formatResponse(true, { transaksi: transaksi, saldoSaatIni: saldoSaatIni }, 'Transaksi berhasil disimpan');

  } catch (err) {
    lock.releaseLock();
    return formatResponse(false, null, 'Gagal menyimpan transaksi: ' + err.message);
  }
}

/**
 * b) GET ?action=getTransactions
 * Query: startDate, endDate, jenis, kategori, keyword, minNominal, maxNominal, page, limit
 */
function handleGetTransactions(e) {
  try {
    var params = e.parameter || {};
    var transactions = getAllTransactions();

    // Filter: startDate & endDate
    if (params.startDate) {
      transactions = transactions.filter(function (t) {
        return t.tanggal >= params.startDate;
      });
    }
    if (params.endDate) {
      transactions = transactions.filter(function (t) {
        return t.tanggal <= params.endDate;
      });
    }

    // Filter: jenis
    if (params.jenis) {
      var jenis = params.jenis;
      transactions = transactions.filter(function (t) {
        return t.jenis === jenis;
      });
    }

    // Filter: kategori
    if (params.kategori) {
      var kategori = params.kategori;
      transactions = transactions.filter(function (t) {
        return t.kategori === kategori;
      });
    }

    // Filter: keyword (search di keterangan & catatan)
    if (params.keyword) {
      var keyword = params.keyword.toLowerCase();
      transactions = transactions.filter(function (t) {
        var text = (t.keterangan + ' ' + t.catatan).toLowerCase();
        return text.indexOf(keyword) >= 0;
      });
    }

    // Filter: minNominal & maxNominal
    if (params.minNominal) {
      var minNom = parseFloat(params.minNominal);
      transactions = transactions.filter(function (t) {
        return t.nominal >= minNom;
      });
    }
    if (params.maxNominal) {
      var maxNom = parseFloat(params.maxNominal);
      transactions = transactions.filter(function (t) {
        return t.nominal <= maxNom;
      });
    }

    // Urutkan terbaru dulu (berdasarkan tanggal & jam descending)
    transactions.sort(function (a, b) {
      var dateCompare = b.tanggal.localeCompare(a.tanggal);
      if (dateCompare !== 0) return dateCompare;
      return (b.jam || '').localeCompare(a.jam || '');
    });

    // Pagination
    var page = parseInt(params.page) || 1;
    var limit = parseInt(params.limit) || 20;
    var totalData = transactions.length;
    var totalPages = Math.ceil(totalData / limit);
    var startIndex = (page - 1) * limit;
    var paginatedData = transactions.slice(startIndex, startIndex + limit);

    // Hapus _rowIndex dari response
    paginatedData = paginatedData.map(function (t) {
      var copy = {};
      for (var key in t) {
        if (key !== '_rowIndex') copy[key] = t[key];
      }
      return copy;
    });

    return formatResponse(true, {
      transaksi: paginatedData,
      pagination: {
        page: page,
        limit: limit,
        totalData: totalData,
        totalPages: totalPages
      }
    });

  } catch (err) {
    return formatResponse(false, null, 'Gagal mengambil transaksi: ' + err.message);
  }
}

/**
 * c) GET ?action=getSummary
 * Query: mode, startDate, endDate
 */
function handleGetSummary(e) {
  try {
    var params = e.parameter || {};
    var mode = params.mode || 'today';

    var range = getDateRange(mode, params.startDate, params.endDate);
    var allTransactions = getAllTransactions();
    var filtered = filterByDateRange(allTransactions, range.startDate, range.endDate);

    var totalPemasukan = 0;
    var totalPengeluaran = 0;
    var jumlahTransaksi = filtered.length;
    var kategoriMap = {};

    for (var i = 0; i < filtered.length; i++) {
      var t = filtered[i];
      if (t.jenis === 'Pemasukan') {
        totalPemasukan += t.nominal;
      } else {
        totalPengeluaran += t.nominal;
      }

      // Hitung per kategori (hanya pengeluaran)
      if (t.jenis === 'Pengeluaran') {
        if (!kategoriMap[t.kategori]) {
          kategoriMap[t.kategori] = { kategori: t.kategori, total: 0, jumlah: 0 };
        }
        kategoriMap[t.kategori].total += t.nominal;
        kategoriMap[t.kategori].jumlah++;
      }
    }

    // Ringkasan per kategori, urut dari terbesar
    var ringkasanPerKategori = [];
    for (var key in kategoriMap) {
      ringkasanPerKategori.push(kategoriMap[key]);
    }
    ringkasanPerKategori.sort(function (a, b) { return b.total - a.total; });

    var kategoriTerbesar = ringkasanPerKategori.length > 0
      ? ringkasanPerKategori[0]
      : null;

    var selisih = totalPemasukan - totalPengeluaran;
    var rataRataPengeluaran = jumlahTransaksi > 0
      ? Math.round(totalPengeluaran / jumlahTransaksi)
      : 0;

    // Hitung jumlah hari dalam periode
    var msPerDay = 86400000;
    var jumlahHari = Math.max(1, Math.round((range.endDate - range.startDate) / msPerDay) + 1);

    return formatResponse(true, {
      mode: mode,
      periode: formatDate(range.startDate) + ' s/d ' + formatDate(range.endDate),
      totalPemasukan: totalPemasukan,
      totalPengeluaran: totalPengeluaran,
      selisih: selisih,
      jumlahTransaksi: jumlahTransaksi,
      jumlahHari: jumlahHari,
      rataRataPengeluaran: rataRataPengeluaran,
      kategoriTerbesar: kategoriTerbesar,
      ringkasanPerKategori: ringkasanPerKategori,
      topKategori: ringkasanPerKategori.slice(0, 5)
    });

  } catch (err) {
    return formatResponse(false, null, 'Gagal mengambil summary: ' + err.message);
  }
}

/**
 * d) GET ?action=getDashboard
 */
function handleGetDashboard(e) {
  try {
    var allTransactions = getAllTransactions();
    var now = getNow();
    var todayStr = formatDate(now);

    // Bulan ini
    var thisMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));

    var saldoSaatIni = 0;
    var pemasukanBulanIni = 0;
    var pengeluaranBulanIni = 0;
    var totalHariIni = 0;

    for (var i = 0; i < allTransactions.length; i++) {
      var t = allTransactions[i];
      // Saldo keseluruhan
      if (t.jenis === 'Pemasukan') {
        saldoSaatIni += t.nominal;
      } else {
        saldoSaatIni -= t.nominal;
      }

      // Bulan ini
      if (t.tanggal >= thisMonthStart && t.tanggal <= todayStr) {
        if (t.jenis === 'Pemasukan') {
          pemasukanBulanIni += t.nominal;
        } else {
          pengeluaranBulanIni += t.nominal;
        }
      }

      // Hari ini (pengeluaran saja)
      if (t.tanggal === todayStr && t.jenis === 'Pengeluaran') {
        totalHariIni += t.nominal;
      }
    }

    // 5 transaksi terbaru
    var sorted = allTransactions.slice().sort(function (a, b) {
      var dateCompare = b.tanggal.localeCompare(a.tanggal);
      if (dateCompare !== 0) return dateCompare;
      return (b.jam || '').localeCompare(a.jam || '');
    });
    var transaksiTerakhir = sorted.slice(0, 5).map(function (t) {
      var copy = {};
      for (var key in t) {
        if (key !== '_rowIndex') copy[key] = t[key];
      }
      return copy;
    });

    return formatResponse(true, {
      saldoSaatIni: saldoSaatIni,
      pemasukanBulanIni: pemasukanBulanIni,
      pengeluaranBulanIni: pengeluaranBulanIni,
      totalHariIni: totalHariIni,
      transaksiTerakhir: transaksiTerakhir
    });

  } catch (err) {
    return formatResponse(false, null, 'Gagal mengambil dashboard: ' + err.message);
  }
}

/**
 * e) GET ?action=getTransactionDetail&id=xxx
 */
function handleGetTransactionDetail(e) {
  try {
    var id = e.parameter.id;
    if (!id) {
      return formatResponse(false, null, 'Parameter "id" wajib diisi');
    }

    var transactions = getAllTransactions();
    var found = null;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].id === id) {
        found = transactions[i];
        break;
      }
    }

    if (!found) {
      return formatResponse(false, null, 'Transaksi dengan ID "' + id + '" tidak ditemukan');
    }

    // Hapus _rowIndex
    var result = {};
    for (var key in found) {
      if (key !== '_rowIndex') result[key] = found[key];
    }

    return formatResponse(true, result);

  } catch (err) {
    return formatResponse(false, null, 'Gagal mengambil detail transaksi: ' + err.message);
  }
}

/**
 * f) POST ?action=updateTransaction
 * Body: { id, ...field yang diubah }
 */
function handleUpdateTransaction(body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (!body.id) {
      lock.releaseLock();
      return formatResponse(false, null, 'Field "id" wajib diisi');
    }

    var sheet = getSheet();
    var transactions = getAllTransactions();
    var target = null;
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].id === body.id) {
        target = transactions[i];
        break;
      }
    }

    if (!target) {
      lock.releaseLock();
      return formatResponse(false, null, 'Transaksi dengan ID "' + body.id + '" tidak ditemukan');
    }

    var rowIndex = target._rowIndex;

    // Update field yang diberikan
    var updatableFields = {
      tanggal: COL.TANGGAL,
      jam: COL.JAM,
      jenis: COL.JENIS,
      kategori: COL.KATEGORI,
      keterangan: COL.KETERANGAN,
      nominal: COL.NOMINAL,
      catatan: COL.CATATAN
    };

    var updated = {};
    for (var field in updatableFields) {
      if (body[field] !== undefined && body[field] !== null) {
        var colIndex = updatableFields[field] + 1; // 1-based for sheet
        var value = body[field];

        // Validasi khusus
        if (field === 'nominal') {
          value = parseFloat(value);
          if (isNaN(value) || value <= 0) {
            lock.releaseLock();
            return formatResponse(false, null, 'Nominal harus berupa angka positif');
          }
        }
        if (field === 'jenis' && value !== 'Pemasukan' && value !== 'Pengeluaran') {
          lock.releaseLock();
          return formatResponse(false, null, 'Jenis harus "Pemasukan" atau "Pengeluaran"');
        }

        sheet.getRange(rowIndex, colIndex).setValue(value);
        updated[field] = value;
      }
    }

    // Update timestamp
    var now = getNow();
    sheet.getRange(rowIndex, COL.TIMESTAMP + 1).setValue(formatTimestamp(now));

    lock.releaseLock();

    // Ambil data terbaru
    var updatedRow = sheet.getRange(rowIndex, 1, 1, HEADER_ROW.length).getValues()[0];
    var result = {
      no: updatedRow[COL.NO],
      id: updatedRow[COL.ID],
      tanggal: updatedRow[COL.TANGGAL] instanceof Date ? formatDate(updatedRow[COL.TANGGAL]) : String(updatedRow[COL.TANGGAL]),
      jam: updatedRow[COL.JAM] instanceof Date ? formatTime(updatedRow[COL.JAM]) : String(updatedRow[COL.JAM]),
      jenis: updatedRow[COL.JENIS],
      kategori: updatedRow[COL.KATEGORI],
      keterangan: updatedRow[COL.KETERANGAN],
      nominal: parseFloat(updatedRow[COL.NOMINAL]) || 0,
      catatan: updatedRow[COL.CATATAN] || '',
      timestamp: updatedRow[COL.TIMESTAMP],
      statusSinkronisasi: updatedRow[COL.STATUS_SYNC]
    };

    return formatResponse(true, { transaksi: result, updatedFields: updated }, 'Transaksi berhasil diupdate');

  } catch (err) {
    try { lock.releaseLock(); } catch(e) {}
    return formatResponse(false, null, 'Gagal update transaksi: ' + err.message);
  }
}

/**
 * g) POST ?action=deleteTransaction
 * Body: { id }
 */
function handleDeleteTransaction(body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (!body.id) {
      lock.releaseLock();
      return formatResponse(false, null, 'Field "id" wajib diisi');
    }

    var sheet = getSheet();
    var transactions = getAllTransactions();
    var target = null;

    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].id === body.id) {
        target = transactions[i];
        break;
      }
    }

    if (!target) {
      lock.releaseLock();
      return formatResponse(false, null, 'Transaksi dengan ID "' + body.id + '" tidak ditemukan');
    }

    sheet.deleteRow(target._rowIndex);
    lock.releaseLock();

    return formatResponse(true, { deletedId: body.id }, 'Transaksi berhasil dihapus');

  } catch (err) {
    try { lock.releaseLock(); } catch(e) {}
    return formatResponse(false, null, 'Gagal menghapus transaksi: ' + err.message);
  }
}

/**
 * h) POST ?action=syncBatch
 * Body: { transactions: [ ... ] }
 */
function handleSyncBatch(body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(60000); // Longer timeout for batch operations

    if (!body.transactions || !Array.isArray(body.transactions) || body.transactions.length === 0) {
      lock.releaseLock();
      return formatResponse(false, null, 'Field "transactions" harus berupa array dengan minimal 1 item');
    }

    var sheet = getSheet();
    var existingTransactions = getAllTransactions();

    // Buat set dari ID yang sudah ada untuk lookup cepat
    var existingIds = {};
    for (var i = 0; i < existingTransactions.length; i++) {
      existingIds[existingTransactions[i].id] = true;
    }

    var now = getNow();
    var timestamp = formatTimestamp(now);
    var syncedCount = 0;
    var failedIds = [];
    var nextNo = getNextNo();
    var newRows = [];

    for (var j = 0; j < body.transactions.length; j++) {
      var t = body.transactions[j];

      // Cek duplikasi
      if (t.id && existingIds[t.id]) {
        failedIds.push({ id: t.id, reason: 'ID sudah ada (duplikat)' });
        continue;
      }

      // Validasi minimal
      if (!t.jenis || !t.kategori || !t.keterangan || !t.nominal) {
        failedIds.push({ id: t.id || 'unknown', reason: 'Data tidak lengkap' });
        continue;
      }

      var nominal = parseFloat(t.nominal);
      if (isNaN(nominal) || nominal <= 0) {
        failedIds.push({ id: t.id || 'unknown', reason: 'Nominal tidak valid' });
        continue;
      }

      var id = t.id || generateId();
      var tanggal = t.tanggal || formatDate(now);
      var jam = t.jam || formatTime(now);
      var catatan = t.catatan || '';

      newRows.push([nextNo, id, tanggal, jam, t.jenis, t.kategori, t.keterangan, nominal, catatan, timestamp, 'Sudah Sinkron']);
      existingIds[id] = true; // prevent duplicates within same batch
      nextNo++;
      syncedCount++;
    }

    // Batch write semua baris sekaligus
    if (newRows.length > 0) {
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, newRows.length, HEADER_ROW.length).setValues(newRows);
    }

    lock.releaseLock();

    return formatResponse(true, {
      syncedCount: syncedCount,
      failedCount: failedIds.length,
      failedIds: failedIds,
      totalProcessed: body.transactions.length
    }, syncedCount + ' transaksi berhasil disinkronkan');

  } catch (err) {
    try { lock.releaseLock(); } catch(e) {}
    return formatResponse(false, null, 'Gagal sync batch: ' + err.message);
  }
}

/**
 * i) GET ?action=getStatistics
 * Query: period (daily, weekly, monthly, yearly)
 */
function handleGetStatistics(e) {
  try {
    var params = e.parameter || {};
    var period = params.period || 'monthly';

    var allTransactions = getAllTransactions();
    var now = getNow();

    // Tentukan range dan grouping berdasarkan period
    var dataGrafik = [];
    var range, groupFormat, labels;

    switch (period) {
      case 'daily':
        // 30 hari terakhir
        range = getDateRange('30days');
        var filtered = filterByDateRange(allTransactions, range.startDate, range.endDate);
        var dayMap = {};

        // Buat label untuk 30 hari
        for (var d = 0; d < 30; d++) {
          var date = new Date(range.startDate);
          date.setDate(date.getDate() + d);
          var label = formatDate(date);
          dayMap[label] = { label: label, pengeluaran: 0, pemasukan: 0 };
        }

        for (var i = 0; i < filtered.length; i++) {
          var t = filtered[i];
          if (dayMap[t.tanggal]) {
            if (t.jenis === 'Pemasukan') {
              dayMap[t.tanggal].pemasukan += t.nominal;
            } else {
              dayMap[t.tanggal].pengeluaran += t.nominal;
            }
          }
        }

        // Convert to sorted array
        var sortedDays = Object.keys(dayMap).sort();
        for (var sd = 0; sd < sortedDays.length; sd++) {
          dataGrafik.push(dayMap[sortedDays[sd]]);
        }
        break;

      case 'weekly':
        // 12 minggu terakhir
        var weeksBack = 12;
        var weekMap = {};
        var startOfWeek = new Date(now);
        var dow = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday

        for (var w = weeksBack - 1; w >= 0; w--) {
          var weekStart = new Date(startOfWeek);
          weekStart.setDate(weekStart.getDate() - (w * 7));
          var weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          var weekLabel = 'W' + formatDate(weekStart).substring(5);
          weekMap[weekLabel] = {
            label: weekLabel,
            startDate: formatDate(weekStart),
            endDate: formatDate(weekEnd),
            pengeluaran: 0,
            pemasukan: 0
          };
        }

        for (var key in weekMap) {
          var week = weekMap[key];
          for (var wt = 0; wt < allTransactions.length; wt++) {
            var tr = allTransactions[wt];
            if (tr.tanggal >= week.startDate && tr.tanggal <= week.endDate) {
              if (tr.jenis === 'Pemasukan') {
                week.pemasukan += tr.nominal;
              } else {
                week.pengeluaran += tr.nominal;
              }
            }
          }
          dataGrafik.push({ label: week.label, pengeluaran: week.pengeluaran, pemasukan: week.pemasukan });
        }
        break;

      case 'monthly':
        // 12 bulan terakhir
        var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        for (var m = 11; m >= 0; m--) {
          var monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
          var monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          var monthStartStr = formatDate(monthDate);
          var monthEndStr = formatDate(monthEnd);
          var monthLabel = monthNames[monthDate.getMonth()] + ' ' + monthDate.getFullYear();

          var monthPemasukan = 0;
          var monthPengeluaran = 0;

          for (var mt = 0; mt < allTransactions.length; mt++) {
            var mtr = allTransactions[mt];
            if (mtr.tanggal >= monthStartStr && mtr.tanggal <= monthEndStr) {
              if (mtr.jenis === 'Pemasukan') {
                monthPemasukan += mtr.nominal;
              } else {
                monthPengeluaran += mtr.nominal;
              }
            }
          }

          dataGrafik.push({ label: monthLabel, pengeluaran: monthPengeluaran, pemasukan: monthPemasukan });
        }
        break;

      case 'yearly':
        // 5 tahun terakhir
        for (var y = 4; y >= 0; y--) {
          var year = now.getFullYear() - y;
          var yearStartStr = year + '-01-01';
          var yearEndStr = year + '-12-31';
          var yearLabel = String(year);

          var yearPemasukan = 0;
          var yearPengeluaran = 0;

          for (var yt = 0; yt < allTransactions.length; yt++) {
            var ytr = allTransactions[yt];
            if (ytr.tanggal >= yearStartStr && ytr.tanggal <= yearEndStr) {
              if (ytr.jenis === 'Pemasukan') {
                yearPemasukan += ytr.nominal;
              } else {
                yearPengeluaran += ytr.nominal;
              }
            }
          }

          dataGrafik.push({ label: yearLabel, pengeluaran: yearPengeluaran, pemasukan: yearPemasukan });
        }
        break;
    }

    // Statistik tambahan dari semua transaksi
    var allPengeluaran = allTransactions.filter(function (t) { return t.jenis === 'Pengeluaran'; });
    var allPemasukan = allTransactions.filter(function (t) { return t.jenis === 'Pemasukan'; });

    // Kategori terbesar (pengeluaran)
    var katMap = {};
    for (var ki = 0; ki < allPengeluaran.length; ki++) {
      var kat = allPengeluaran[ki].kategori;
      katMap[kat] = (katMap[kat] || 0) + allPengeluaran[ki].nominal;
    }
    var kategoriTerbesar = null;
    var maxKatNominal = 0;
    for (var kk in katMap) {
      if (katMap[kk] > maxKatNominal) {
        maxKatNominal = katMap[kk];
        kategoriTerbesar = { kategori: kk, total: katMap[kk] };
      }
    }

    // Transaksi terbesar
    var pengeluaranTerbesar = null;
    var pemasukanTerbesar = null;

    if (allPengeluaran.length > 0) {
      allPengeluaran.sort(function (a, b) { return b.nominal - a.nominal; });
      var pt = allPengeluaran[0];
      pengeluaranTerbesar = {
        id: pt.id,
        keterangan: pt.keterangan,
        nominal: pt.nominal,
        tanggal: pt.tanggal,
        kategori: pt.kategori
      };
    }

    if (allPemasukan.length > 0) {
      allPemasukan.sort(function (a, b) { return b.nominal - a.nominal; });
      var pm = allPemasukan[0];
      pemasukanTerbesar = {
        id: pm.id,
        keterangan: pm.keterangan,
        nominal: pm.nominal,
        tanggal: pm.tanggal,
        kategori: pm.kategori
      };
    }

    // Rata-rata harian pengeluaran (30 hari terakhir)
    var last30Range = getDateRange('30days');
    var last30Pengeluaran = filterByDateRange(allPengeluaran, last30Range.startDate, last30Range.endDate);
    var totalLast30 = 0;
    for (var l = 0; l < last30Pengeluaran.length; l++) {
      totalLast30 += last30Pengeluaran[l].nominal;
    }
    var rataRataHarian = Math.round(totalLast30 / 30);

    return formatResponse(true, {
      period: period,
      dataGrafik: dataGrafik,
      kategoriTerbesar: kategoriTerbesar,
      pengeluaranTerbesar: pengeluaranTerbesar,
      pemasukanTerbesar: pemasukanTerbesar,
      rataRataHarian: rataRataHarian,
      jumlahTransaksi: allTransactions.length
    });

  } catch (err) {
    return formatResponse(false, null, 'Gagal mengambil statistik: ' + err.message);
  }
}
