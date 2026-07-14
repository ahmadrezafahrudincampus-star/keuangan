# Personal Finance Tracker — Backend

Backend untuk aplikasi pencatatan keuangan pribadi (Personal Finance Tracker PWA).

## Arsitektur

```
┌──────────────────────────┐     ┌───────────────────────────────┐
│   Google Apps Script     │     │   Node.js WhatsApp Service    │
│   (REST API)             │◄────│   (Notification Service)      │
│                          │     │                               │
│   📊 Google Spreadsheet  │     │   📱 whatsapp-web.js          │
│   sebagai database       │     │   ⏰ node-cron                │
└──────────────────────────┘     │   🌐 Express.js              │
                                 └───────────────────────────────┘
```

---

## 1. Google Apps Script (REST API)

### Setup Google Spreadsheet

1. Buat Google Spreadsheet baru di [Google Sheets](https://sheets.google.com)
2. Rename sheet pertama menjadi **`Transaksi`**
3. Tambahkan header di baris pertama (A1:K1):

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| No | ID | Tanggal | Jam | Jenis | Kategori | Keterangan | Nominal | Catatan | Timestamp | Status Sinkronisasi |

> **Catatan:** Header akan otomatis dibuat jika sheet "Transaksi" belum ada saat API pertama kali dipanggil.

### Deploy Apps Script

1. Buka Google Spreadsheet yang sudah dibuat
2. Klik **Extensions > Apps Script**
3. Hapus semua kode default di editor
4. Copy-paste seluruh isi file `Code.gs` ke editor
5. Klik **💾 Save** (Ctrl+S)
6. Klik **Deploy > New deployment**
7. Klik ikon ⚙️ di samping "Select type", pilih **Web app**
8. Isi konfigurasi:
   - **Description**: `Personal Finance Tracker API v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
9. Klik **Deploy**
10. Klik **Authorize access** dan ikuti flow OAuth
11. Salin **Web app URL** — ini adalah `APPS_SCRIPT_URL` Anda

> **Format URL**: `https://script.google.com/macros/s/AKfycb.../exec`

### Update Deployment

Setiap kali mengubah kode:
1. Klik **Deploy > Manage deployments**
2. Klik ikon ✏️ Edit
3. Pilih **New version** pada dropdown "Version"
4. Klik **Deploy**

---

### API Endpoints

Base URL: `{APPS_SCRIPT_URL}`

---

#### a) Buat Transaksi Baru

```
POST ?action=createTransaction
```

**Request Body:**
```json
{
  "jenis": "Pengeluaran",
  "kategori": "Makanan",
  "keterangan": "Makan siang di warteg",
  "nominal": 25000,
  "tanggal": "2026-07-12",
  "jam": "12:30:00",
  "catatan": "Nasi + ayam goreng"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaksi": {
      "no": 1,
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tanggal": "2026-07-12",
      "jam": "12:30:00",
      "jenis": "Pengeluaran",
      "kategori": "Makanan",
      "keterangan": "Makan siang di warteg",
      "nominal": 25000,
      "catatan": "Nasi + ayam goreng",
      "timestamp": "2026-07-12T12:30:45.123+07:00",
      "statusSinkronisasi": "Sudah Sinkron"
    },
    "saldoSaatIni": -25000
  },
  "message": "Transaksi berhasil disimpan"
}
```

---

#### b) Ambil Daftar Transaksi

```
GET ?action=getTransactions&startDate=2026-07-01&endDate=2026-07-31&jenis=Pengeluaran&kategori=Makanan&keyword=warteg&minNominal=10000&maxNominal=50000&page=1&limit=10
```

Semua query parameter bersifat **opsional**.

**Response:**
```json
{
  "success": true,
  "data": {
    "transaksi": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalData": 25,
      "totalPages": 3
    }
  }
}
```

---

#### c) Ambil Ringkasan (Summary)

```
GET ?action=getSummary&mode=thisMonth
```

Mode yang tersedia: `today`, `yesterday`, `7days`, `thisWeek`, `30days`, `thisMonth`, `lastMonth`, `thisYear`, `custom`

Untuk mode `custom`:
```
GET ?action=getSummary&mode=custom&startDate=2026-01-01&endDate=2026-06-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "thisMonth",
    "periode": "2026-07-01 s/d 2026-07-12",
    "totalPemasukan": 5000000,
    "totalPengeluaran": 2350000,
    "selisih": 2650000,
    "jumlahTransaksi": 42,
    "jumlahHari": 12,
    "rataRataPengeluaran": 55952,
    "kategoriTerbesar": {
      "kategori": "Makanan",
      "total": 850000,
      "jumlah": 15
    },
    "ringkasanPerKategori": [
      { "kategori": "Makanan", "total": 850000, "jumlah": 15 },
      { "kategori": "Transport", "total": 500000, "jumlah": 10 }
    ],
    "topKategori": [ ... ]
  }
}
```

---

#### d) Dashboard

```
GET ?action=getDashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "saldoSaatIni": 2650000,
    "pemasukanBulanIni": 5000000,
    "pengeluaranBulanIni": 2350000,
    "totalHariIni": 75000,
    "transaksiTerakhir": [
      {
        "id": "...",
        "tanggal": "2026-07-12",
        "jam": "19:30:00",
        "jenis": "Pengeluaran",
        "kategori": "Makanan",
        "keterangan": "Makan malam",
        "nominal": 35000
      }
    ]
  }
}
```

---

#### e) Detail Transaksi

```
GET ?action=getTransactionDetail&id=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response:**
```json
{
  "success": true,
  "data": {
    "no": 1,
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tanggal": "2026-07-12",
    "jam": "12:30:00",
    "jenis": "Pengeluaran",
    "kategori": "Makanan",
    "keterangan": "Makan siang di warteg",
    "nominal": 25000,
    "catatan": "Nasi + ayam goreng",
    "timestamp": "2026-07-12T12:30:45.123+07:00",
    "statusSinkronisasi": "Sudah Sinkron"
  }
}
```

---

#### f) Update Transaksi

```
POST ?action=updateTransaction
```

**Request Body (kirim field yang ingin diubah saja):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "kategori": "Makanan & Minuman",
  "nominal": 30000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaksi": { ... },
    "updatedFields": {
      "kategori": "Makanan & Minuman",
      "nominal": 30000
    }
  },
  "message": "Transaksi berhasil diupdate"
}
```

---

#### g) Hapus Transaksi

```
POST ?action=deleteTransaction
```

**Request Body:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "deletedId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
  "message": "Transaksi berhasil dihapus"
}
```

---

#### h) Sync Batch (dari IndexedDB/offline)

```
POST ?action=syncBatch
```

**Request Body:**
```json
{
  "transactions": [
    {
      "id": "local-uuid-1",
      "jenis": "Pengeluaran",
      "kategori": "Transport",
      "keterangan": "Grab ke kantor",
      "nominal": 25000,
      "tanggal": "2026-07-10",
      "jam": "08:00:00"
    },
    {
      "id": "local-uuid-2",
      "jenis": "Pemasukan",
      "kategori": "Gaji",
      "keterangan": "Gaji bulan Juli",
      "nominal": 8000000,
      "tanggal": "2026-07-01",
      "jam": "09:00:00"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncedCount": 2,
    "failedCount": 0,
    "failedIds": [],
    "totalProcessed": 2
  },
  "message": "2 transaksi berhasil disinkronkan"
}
```

---

#### i) Statistik

```
GET ?action=getStatistics&period=monthly
```

Period: `daily`, `weekly`, `monthly`, `yearly`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "dataGrafik": [
      { "label": "Jul 2025", "pengeluaran": 2100000, "pemasukan": 5000000 },
      { "label": "Agu 2025", "pengeluaran": 1800000, "pemasukan": 5000000 }
    ],
    "kategoriTerbesar": { "kategori": "Makanan", "total": 12500000 },
    "pengeluaranTerbesar": {
      "id": "...",
      "keterangan": "Bayar kos",
      "nominal": 2000000,
      "tanggal": "2026-07-01",
      "kategori": "Tempat Tinggal"
    },
    "pemasukanTerbesar": {
      "id": "...",
      "keterangan": "Gaji Juli",
      "nominal": 8000000,
      "tanggal": "2026-07-01",
      "kategori": "Gaji"
    },
    "rataRataHarian": 78333,
    "jumlahTransaksi": 156
  }
}
```

---

## 2. WhatsApp Notification Service (Node.js)

### Struktur Folder

```
whatsapp-service/
├── index.js              # Entry point + Express server
├── config.js             # Konfigurasi dari .env
├── package.json
├── .env.example          # Template environment variables
├── services/
│   ├── sheetApi.js       # Client untuk Apps Script API
│   └── waSender.js       # WhatsApp client + message formatters
└── cron/
    ├── dailyRecap.js     # Rekap harian (21:00 setiap hari)
    ├── weeklyRecap.js    # Rekap mingguan (21:00 setiap Minggu)
    └── monthlyRecap.js   # Rekap bulanan (07:00 tanggal 1)
```

### Instalasi

```bash
# Masuk ke folder whatsapp-service
cd whatsapp-service

# Install dependencies
npm install

# Salin file .env
cp .env.example .env

# Edit .env dengan nilai yang sesuai
# APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
# WA_TARGET_NUMBER=628xxxxxxxxxx
# PORT=3001
```

### Konfigurasi `.env`

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `APPS_SCRIPT_URL` | URL deployment Google Apps Script | `https://script.google.com/macros/s/AKfycb.../exec` |
| `WA_TARGET_NUMBER` | Nomor WA tujuan (kode negara tanpa +) | `6281234567890` |
| `PORT` | Port Express server | `3001` |

### Menjalankan

```bash
# Mode production
npm start

# Mode development (auto-restart saat file berubah)
npm run dev
```

### Pertama Kali Login WhatsApp

Saat pertama kali dijalankan, akan muncul **QR code di terminal**:
1. Buka WhatsApp di HP
2. Buka **Settings > Linked Devices > Link a Device**
3. Scan QR code yang tampil di terminal
4. Tunggu sampai muncul pesan `🟢 WhatsApp client is ready.`

> Session tersimpan di folder `.wwebjs_auth/` sehingga tidak perlu scan QR lagi setelah login pertama.

### Endpoint Internal

#### Health Check

```
GET http://localhost:3001/health
```

```json
{
  "status": "ok",
  "uptime": 3600,
  "waClientReady": true,
  "timestamp": "2026-07-12T20:00:00.000Z"
}
```

#### Kirim Notifikasi Transaksi Baru

```
POST http://localhost:3001/notify/new-transaction
Content-Type: application/json

{
  "jenis": "Pengeluaran",
  "kategori": "Makanan",
  "keterangan": "Makan siang",
  "nominal": 25000,
  "tanggal": "2026-07-12",
  "jam": "12:30:00",
  "saldoSaatIni": 2650000
}
```

### Cron Jobs

| Jadwal | Jam | Deskripsi |
|--------|-----|-----------|
| Setiap hari | 21:00 WIB | Rekap harian — ringkasan transaksi hari ini |
| Setiap Minggu | 21:00 WIB | Rekap mingguan — ringkasan transaksi minggu ini |
| Tanggal 1 setiap bulan | 07:00 WIB | Rekap bulanan — ringkasan transaksi bulan lalu |

### Contoh Pesan WhatsApp

**Notifikasi Transaksi Baru:**
```
💸 *Pengeluaran Baru*

📂 *Kategori*      : Makanan
📝 *Keterangan*    : Makan siang di warteg
💵 *Nominal*       : Rp25.000
📅 *Tanggal*       : 2026-07-12
🕐 *Jam*           : 12:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 *Saldo Saat Ini* : Rp2.650.000
```

**Rekap Harian:**
```
📊 *Rekap Harian*
📅 Sabtu, 12 Juli 2026

━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Pemasukan*    : Rp0
💸 *Pengeluaran*  : Rp125.000
📈 *Selisih*      : -Rp125.000
🔢 *Transaksi*    : 5 transaksi
━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *Top Pengeluaran:*
  1. Makanan — Rp75.000
  2. Transport — Rp50.000

_Tetap bijak dalam mengelola keuangan! 🙌_
```

---

## Integrasi Apps Script ↔ WhatsApp Service

Agar Apps Script mengirim notifikasi ke WhatsApp setelah transaksi baru dibuat, tambahkan kode berikut di **akhir function `handleCreateTransaction`** sebelum `return`:

```javascript
// Opsional: Kirim notifikasi ke WhatsApp service
try {
  var waServiceUrl = 'http://YOUR_SERVER_IP:3001/notify/new-transaction';
  UrlFetchApp.fetch(waServiceUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      jenis: jenis,
      kategori: body.kategori,
      keterangan: body.keterangan,
      nominal: nominal,
      tanggal: tanggal,
      jam: jam,
      saldoSaatIni: saldoSaatIni
    }),
    muteHttpExceptions: true
  });
} catch (e) {
  // Notifikasi gagal, tapi transaksi tetap tersimpan
  Logger.log('WA notification failed: ' + e.message);
}
```

> **Catatan:** WhatsApp service harus accessible dari internet (gunakan ngrok, Cloudflare Tunnel, atau deploy di VPS) agar Apps Script bisa mengirim request.

---

## Requirements

- **Google Account** untuk Google Sheets & Apps Script
- **Node.js >= 18** untuk WhatsApp service
- **Chrome/Chromium** (otomatis digunakan oleh Puppeteer di whatsapp-web.js)

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| QR code tidak muncul | Pastikan `qrcode-terminal` terinstall. Jalankan `npm install` ulang. |
| WhatsApp disconnect terus | Hapus folder `.wwebjs_auth/` dan scan QR ulang. |
| Apps Script error 403 | Pastikan deployment di-set ke "Anyone" dan sudah authorize. |
| CORS error dari frontend | Apps Script Web App otomatis handle CORS. Pastikan request ke URL yang benar. |
| Cron tidak berjalan | Pastikan `APPS_SCRIPT_URL` sudah di-set di `.env`. Cek log di terminal. |
