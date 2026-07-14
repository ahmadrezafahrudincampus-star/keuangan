/**
 * ============================================================
 * Catatan Uang — Premium Mobile-First Finance Tracker
 * Main Application JavaScript
 * ============================================================
 */

// ─── KONFIGURASI ────────────────────────────────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycby0bo3DOd8sAixRbGVpuqOgSCMYOFOwVaGPRPocjB6kM11FgqfFr_bnB8bwBGlVQnmC/exec';
const DB_NAME = 'CatatanUangDB';
const DB_VERSION = 1;
const STORE_TX = 'transactions';
const STORE_PENDING = 'pending';

// ─── STATE ──────────────────────────────────────────────────
let transactions = [];
let currentScreen = 'screen-beranda';
let currentJenis = 'Pengeluaran';
let editJenis = 'Pengeluaran';
let activeFilters = {};
let searchKeyword = '';
let chartInstances = {};

// ─── KATEGORI CONFIG ────────────────────────────────────────
const KATEGORI_CONFIG = {
  'Makanan & Minuman': { icon: '🍔', class: 'makanan' },
  'Transportasi': { icon: '🚗', class: 'transportasi' },
  'Belanja': { icon: '🛍️', class: 'belanja' },
  'Tagihan': { icon: '📄', class: 'tagihan' },
  'Rokok': { icon: '🚬', class: 'rokok' },
  'Hiburan': { icon: '🎮', class: 'hiburan' },
  'Kesehatan': { icon: '💊', class: 'kesehatan' },
  'Pendidikan': { icon: '📚', class: 'pendidikan' },
  'Gaji': { icon: '💰', class: 'gaji' },
  'Investasi': { icon: '📈', class: 'investasi' },
  'Freelance': { icon: '💻', class: 'freelance' },
  'Hadiah': { icon: '🎁', class: 'lainnya' },
  'Bonus': { icon: '🎉', class: 'gaji' },
  'Lainnya': { icon: '📦', class: 'lainnya' }
};

const KATEGORI_PENGELUARAN = [
  'Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan', 'Rokok',
  'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'
];
const KATEGORI_PEMASUKAN = [
  'Gaji', 'Freelance', 'Investasi', 'Hadiah', 'Bonus', 'Lainnya'
];

function updateKategoriDropdown(selectId, jenis) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  const list = jenis === 'Pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;
  select.innerHTML = '<option value="">Pilih Kategori</option>' + list.map(k => {
    const cfg = KATEGORI_CONFIG[k] || KATEGORI_CONFIG['Lainnya'];
    return `<option value="${k}" ${k === current ? 'selected' : ''}>${cfg.icon} ${k}</option>`;
  }).join('');
}

// ─── SAMPLE DATA ────────────────────────────────────────────
function generateSampleTransactions() {
  const t = new Date();
  const d = (offset) => {
    const dt = new Date(t);
    dt.setDate(dt.getDate() - offset);
    return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
  };
  return [
    { id:'s1', tanggal:d(0), jam:'08:30:00', jenis:'Pengeluaran', kategori:'Makanan & Minuman', keterangan:'Sarapan nasi uduk', nominal:15000, catatan:'' },
    { id:'s2', tanggal:d(0), jam:'12:15:00', jenis:'Pengeluaran', kategori:'Makanan & Minuman', keterangan:'Makan siang di warteg', nominal:25000, catatan:'Nasi + ayam' },
    { id:'s3', tanggal:d(0), jam:'07:00:00', jenis:'Pengeluaran', kategori:'Transportasi', keterangan:'Grab ke kantor', nominal:18000, catatan:'' },
    { id:'s4', tanggal:d(1), jam:'19:30:00', jenis:'Pengeluaran', kategori:'Makanan & Minuman', keterangan:'Makan malam', nominal:35000, catatan:'' },
    { id:'s5', tanggal:d(1), jam:'10:00:00', jenis:'Pengeluaran', kategori:'Rokok', keterangan:'Rokok Sampoerna', nominal:28000, catatan:'' },
    { id:'s6', tanggal:d(2), jam:'14:00:00', jenis:'Pengeluaran', kategori:'Belanja', keterangan:'Belanja bulanan', nominal:350000, catatan:'Indomaret' },
    { id:'s7', tanggal:d(2), jam:'09:00:00', jenis:'Pengeluaran', kategori:'Tagihan', keterangan:'Listrik Juli', nominal:275000, catatan:'Token' },
    { id:'s8', tanggal:d(3), jam:'20:00:00', jenis:'Pengeluaran', kategori:'Hiburan', keterangan:'Nonton bioskop', nominal:50000, catatan:'' },
    { id:'s9', tanggal:d(3), jam:'08:00:00', jenis:'Pengeluaran', kategori:'Transportasi', keterangan:'Bensin motor', nominal:30000, catatan:'' },
    { id:'s10', tanggal:d(4), jam:'12:00:00', jenis:'Pengeluaran', kategori:'Makanan & Minuman', keterangan:'Kopi Starbucks', nominal:55000, catatan:'' },
    { id:'s11', tanggal:d(13), jam:'09:00:00', jenis:'Pemasukan', kategori:'Gaji', keterangan:'Gaji bulan ini', nominal:5000000, catatan:'PT ABC' },
    { id:'s12', tanggal:d(8), jam:'15:00:00', jenis:'Pemasukan', kategori:'Freelance', keterangan:'Project website', nominal:1500000, catatan:'' },
    { id:'s13', tanggal:d(5), jam:'11:00:00', jenis:'Pengeluaran', kategori:'Kesehatan', keterangan:'Obat flu', nominal:45000, catatan:'Apotek' },
    { id:'s14', tanggal:d(6), jam:'16:00:00', jenis:'Pengeluaran', kategori:'Pendidikan', keterangan:'Buku pemrograman', nominal:120000, catatan:'' },
    { id:'s15', tanggal:d(7), jam:'13:00:00', jenis:'Pengeluaran', kategori:'Makanan & Minuman', keterangan:'Makan siang bersama', nominal:75000, catatan:'4 orang' },
  ];
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────

function sanitize(str) {
  if (!str) return '';
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function formatCurrency(val) {
  const num = Math.abs(parseFloat(val) || 0);
  return 'Rp' + num.toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function nowTimeStr() {
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function generateId() {
  return 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getKategoriConfig(kategori) {
  return KATEGORI_CONFIG[kategori] || KATEGORI_CONFIG['Lainnya'];
}

function getCatClass(kategori) {
  return getKategoriConfig(kategori).class;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// ─── NAVIGATION ─────────────────────────────────────────────

function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  currentScreen = screenId;

  // Scroll to top
  const appContent = document.getElementById('app-content');
  if (appContent) appContent.scrollTop = 0;

  // Update bottom nav
  const mainScreens = ['screen-beranda', 'screen-transaksi', 'screen-rekap', 'screen-akun'];
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.screen === screenId) btn.classList.add('active');
  });

  // Render content based on screen
  switch(screenId) {
    case 'screen-beranda': renderDashboard(); break;
    case 'screen-transaksi': renderTransactionList(); break;
    case 'screen-tambah': setupAddForm(); break;
    case 'screen-rekap': renderRekapTab('hariIni'); break;
    case 'screen-statistik': renderStatistik('monthly'); break;
  }

  // Re-init Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  const gradients = {
    success: 'linear-gradient(135deg, #16A34A, #22C55E)',
    error: 'linear-gradient(135deg, #EF4444, #DC2626)',
    info: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    warning: 'linear-gradient(135deg, #F97316, #FB923C)'
  };

  toast.style.cssText = `
    background: ${gradients[type] || gradients.success};
    color: white; padding: 12px 20px; border-radius: 12px;
    font-size: 13px; font-weight: 500; margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInUp 0.3s ease-out;
  `;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function showDashboardLoading() {
  const container = document.getElementById('recent-transactions');
  if (container) {
    container.innerHTML = `<div class="loading-skeleton">
      <div class="skeleton-item"><div class="skeleton-icon"></div><div class="skeleton-text"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div><div class="skeleton-amount"></div></div>
      <div class="skeleton-item"><div class="skeleton-icon"></div><div class="skeleton-text"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div><div class="skeleton-amount"></div></div>
      <div class="skeleton-item"><div class="skeleton-icon"></div><div class="skeleton-text"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div><div class="skeleton-amount"></div></div>
    </div>`;
  }
}

// ─── ONLINE/OFFLINE STATUS ──────────────────────────────────

function updateOnlineStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (navigator.onLine) {
    dot.className = 'status-dot online';
    text.textContent = 'Online';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'Offline';
  }
}

// ─── DASHBOARD ──────────────────────────────────────────────

function renderDashboard() {
  const today = todayStr();
  const month = today.substring(0, 7);

  let saldo = 0, pemasukanBulan = 0, pengeluaranBulan = 0;
  transactions.forEach(t => {
    if (t.jenis === 'Pemasukan') saldo += t.nominal;
    else saldo -= t.nominal;
    if (t.tanggal && t.tanggal.startsWith(month)) {
      if (t.jenis === 'Pemasukan') pemasukanBulan += t.nominal;
      else pengeluaranBulan += t.nominal;
    }
  });

  const saldoEl = document.getElementById('saldo-amount');
  saldoEl.textContent = (saldo < 0 ? '-' : '') + formatCurrency(saldo);
  saldoEl.classList.toggle('saldo-negatif', saldo < 0);
  document.getElementById('pemasukan-amount').textContent = formatCurrency(pemasukanBulan);
  document.getElementById('pengeluaran-amount').textContent = formatCurrency(pengeluaranBulan);

  // Recent transactions (5 terbaru)
  const sorted = [...transactions].sort((a, b) => {
    const dc = (b.tanggal || '').localeCompare(a.tanggal || '');
    return dc !== 0 ? dc : (b.jam || '').localeCompare(a.jam || '');
  });
  const recent = sorted.slice(0, 5);
  const container = document.getElementById('recent-transactions');
  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">Belum ada transaksi</div></div>';
  } else {
    container.innerHTML = recent.map(t => renderTransactionItem(t)).join('');
  }

  // Sync time
  document.getElementById('sync-time').textContent = 'Terakhir sync: ' + new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
}

function renderTransactionItem(t) {
  const cfg = getKategoriConfig(t.kategori);
  const isExpense = t.jenis === 'Pengeluaran';
  return `
    <div class="transaction-item" onclick="editTransaction('${sanitize(t.id)}')">
      <div class="transaction-icon cat-${cfg.class}">${cfg.icon}</div>
      <div class="transaction-info">
        <div class="transaction-name">${sanitize(t.keterangan)}</div>
        <div class="transaction-category">${sanitize(t.kategori)} · ${(t.jam || '').substring(0,5)}</div>
      </div>
      <div class="transaction-amount ${isExpense ? 'expense' : 'income'}">${isExpense ? '-' : '+'}${formatCurrency(t.nominal)}</div>
    </div>`;
}

// ─── TRANSACTION LIST (ALL) ─────────────────────────────────

function renderTransactionList() {
  let filtered = [...transactions];

  // Apply filters
  if (searchKeyword) {
    const kw = searchKeyword.toLowerCase();
    filtered = filtered.filter(t => (t.keterangan + ' ' + t.catatan + ' ' + t.kategori).toLowerCase().includes(kw));
  }
  if (activeFilters.jenis) filtered = filtered.filter(t => t.jenis === activeFilters.jenis);
  if (activeFilters.kategori) filtered = filtered.filter(t => t.kategori === activeFilters.kategori);
  if (activeFilters.startDate) filtered = filtered.filter(t => t.tanggal >= activeFilters.startDate);
  if (activeFilters.endDate) filtered = filtered.filter(t => t.tanggal <= activeFilters.endDate);

  // Sort terbaru
  filtered.sort((a, b) => {
    const dc = (b.tanggal || '').localeCompare(a.tanggal || '');
    return dc !== 0 ? dc : (b.jam || '').localeCompare(a.jam || '');
  });

  // Group by date
  const groups = {};
  filtered.forEach(t => {
    const date = t.tanggal || 'Tanpa Tanggal';
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
  });

  const container = document.getElementById('transaction-list-full');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">Tidak ada transaksi ditemukan</div></div>';
    return;
  }

  let html = '';
  Object.keys(groups).sort().reverse().forEach(date => {
    const dayTxs = groups[date];
    const dayTotal = dayTxs.reduce((sum, t) => sum + (t.jenis === 'Pengeluaran' ? t.nominal : 0), 0);
    html += `<div class="date-group">
      <div class="date-header">
        <span class="date-label">${formatDate(date)}</span>
        <span class="date-total">-${formatCurrency(dayTotal)}</span>
      </div>
      <div class="date-transactions">
        ${dayTxs.map(t => renderTransactionItem(t)).join('')}
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

// ─── FILTER & SEARCH ────────────────────────────────────────

function openFilterModal() {
  document.getElementById('filter-modal').style.display = 'flex';
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeFilterModal() {
  document.getElementById('filter-modal').style.display = 'none';
}

function applyFilters() {
  activeFilters = {
    jenis: document.getElementById('filter-jenis').value,
    kategori: document.getElementById('filter-kategori').value,
    startDate: document.getElementById('filter-start-date').value,
    endDate: document.getElementById('filter-end-date').value,
  };
  closeFilterModal();
  renderTransactionList();
  showToast('Filter diterapkan', 'info');
}

function resetFilters() {
  activeFilters = {};
  document.getElementById('filter-jenis').value = '';
  document.getElementById('filter-kategori').value = '';
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  closeFilterModal();
  renderTransactionList();
  showToast('Filter direset', 'info');
}

// ─── ADD TRANSACTION ────────────────────────────────────────

function setupAddForm() {
  currentJenis = 'Pengeluaran';
  updateKategoriDropdown('input-kategori', currentJenis);
  document.getElementById('input-tanggal').value = todayStr();
  document.getElementById('input-jam').value = nowTimeStr();
  document.getElementById('input-kategori').value = '';
  document.getElementById('input-keterangan').value = '';
  document.getElementById('input-nominal').value = '';
  document.getElementById('input-catatan').value = '';
}

function saveTransaction() {
  const kategori = document.getElementById('input-kategori').value;
  const keterangan = document.getElementById('input-keterangan').value.trim();
  const nominal = parseFloat(document.getElementById('input-nominal').value);
  const tanggal = document.getElementById('input-tanggal').value;
  const jam = document.getElementById('input-jam').value || nowTimeStr();
  const catatan = document.getElementById('input-catatan').value.trim();

  if (!kategori || !keterangan || !nominal || nominal <= 0) {
    showToast('Mohon lengkapi semua field wajib', 'error');
    return;
  }

  if (tanggal > todayStr()) {
    showToast('Tanggal tidak boleh di masa depan', 'warning');
    return;
  }

  const tx = {
    id: generateId(),
    jenis: currentJenis,
    kategori, keterangan, nominal, tanggal,
    jam: jam + ':00',
    catatan
  };

  // Add locally
  transactions.push(tx);
  saveTransactionsToDB(transactions);

  // Sync to server
  const localId = tx.id;
  if (navigator.onLine) {
    fetch(API_URL + '?action=createTransaction', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(tx),
      redirect: 'follow'
    }).then(r => r.json()).then(data => {
      if (data.success && data.data && data.data.transaksi) {
        // Update local ID with server-generated UUID
        const serverId = data.data.transaksi.id;
        const idx = transactions.findIndex(t => t.id === localId);
        if (idx >= 0) {
          transactions[idx].id = serverId;
          transactions[idx].no = data.data.transaksi.no;
          transactions[idx].timestamp = data.data.transaksi.timestamp;
          saveTransactionsToDB(transactions);
        }
        showToast('Transaksi tersimpan & sinkron!', 'success');
      }
    }).catch(() => {
      addPendingTransaction(tx);
      showToast('Tersimpan offline, akan disinkronkan nanti', 'warning');
    });
  } else {
    addPendingTransaction(tx);
    showToast('Tersimpan offline', 'warning');
  }

  navigateTo('screen-beranda');
}

// ─── EDIT TRANSACTION ───────────────────────────────────────

function editTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  document.getElementById('edit-transaction-id').value = tx.id;
  document.getElementById('edit-keterangan').value = tx.keterangan;
  document.getElementById('edit-nominal').value = tx.nominal;
  document.getElementById('edit-tanggal').value = tx.tanggal;
  document.getElementById('edit-jam').value = (tx.jam || '').substring(0, 5);
  document.getElementById('edit-catatan').value = tx.catatan || '';

  // Set jenis toggle
  editJenis = tx.jenis;
  document.querySelectorAll('#edit-toggle-group .toggle-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.type === tx.jenis) btn.classList.add('active');
  });
  updateKategoriDropdown('edit-kategori', editJenis);
  document.getElementById('edit-kategori').value = tx.kategori;

  navigateTo('screen-edit-transaksi');
}

function saveEditTransaction() {
  const id = document.getElementById('edit-transaction-id').value;
  const kategori = document.getElementById('edit-kategori').value;
  const keterangan = document.getElementById('edit-keterangan').value.trim();
  const nominal = parseFloat(document.getElementById('edit-nominal').value);
  const tanggal = document.getElementById('edit-tanggal').value;
  const jam = document.getElementById('edit-jam').value || nowTimeStr();
  const catatan = document.getElementById('edit-catatan').value.trim();

  if (!kategori || !keterangan || !nominal || nominal <= 0) {
    showToast('Mohon lengkapi semua field wajib', 'error');
    return;
  }

  // Update locally
  const idx = transactions.findIndex(t => t.id === id);
  if (idx >= 0) {
    transactions[idx] = { ...transactions[idx], jenis: editJenis, kategori, keterangan, nominal, tanggal, jam: jam + ':00', catatan };
    saveTransactionsToDB(transactions);
  }

  // Sync to server
  if (navigator.onLine) {
    fetch(API_URL + '?action=updateTransaction', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ id, jenis: editJenis, kategori, keterangan, nominal, tanggal, jam: jam + ':00', catatan }),
      redirect: 'follow'
    }).then(r => r.json()).then(data => {
      if (data.success) showToast('Transaksi berhasil diupdate', 'success');
    }).catch(() => showToast('Update tersimpan offline', 'warning'));
  } else {
    showToast('Update tersimpan offline', 'warning');
  }

  navigateTo('screen-beranda');
}

function deleteTransaction(id) {
  document.getElementById('confirm-delete-modal').style.display = 'flex';
  document.getElementById('btn-confirm-delete').onclick = () => confirmDelete(id);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeDeleteModal() {
  document.getElementById('confirm-delete-modal').style.display = 'none';
}

function confirmDelete(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactionsToDB(transactions);
  closeDeleteModal();

  if (navigator.onLine) {
    fetch(API_URL + '?action=deleteTransaction', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ id }),
      redirect: 'follow'
    }).catch(() => {});
  }

  showToast('Transaksi dihapus', 'success');
  navigateTo('screen-beranda');
}

// ─── REKAP ──────────────────────────────────────────────────

function renderRekapTab(tab) {
  const container = document.getElementById('rekap-content');
  const calStrip = document.getElementById('calendar-strip');

  // Update tab active state
  document.querySelectorAll('#rekap-tabs .tab-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tab) btn.classList.add('active');
  });

  const today = todayStr();
  let filtered = [];
  let label = '';

  switch(tab) {
    case 'hariIni': {
      filtered = transactions.filter(t => t.tanggal === today);
      label = formatDate(today);
      calStrip.style.display = 'flex';
      renderCalendarStrip();
      break;
    }
    case 'mingguIni': {
      const mon = getMonday(new Date());
      const monStr = mon.getFullYear() + '-' + String(mon.getMonth()+1).padStart(2,'0') + '-' + String(mon.getDate()).padStart(2,'0');
      filtered = transactions.filter(t => t.tanggal >= monStr && t.tanggal <= today);
      label = formatDateShort(monStr) + ' - ' + formatDateShort(today);
      calStrip.style.display = 'none';
      break;
    }
    case 'bulanIni': {
      const monthStart = today.substring(0, 7) + '-01';
      filtered = transactions.filter(t => t.tanggal >= monthStart && t.tanggal <= today);
      label = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      calStrip.style.display = 'none';
      break;
    }
    case 'custom': {
      calStrip.style.display = 'none';
      container.innerHTML = '';
      navigateTo('screen-rekap-custom');
      return;
    }
  }

  const pengeluaran = filtered.filter(t => t.jenis === 'Pengeluaran');
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.nominal, 0);
  const totalPemasukan = filtered.filter(t => t.jenis === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);

  // Kategori breakdown
  const katMap = {};
  pengeluaran.forEach(t => {
    if (!katMap[t.kategori]) katMap[t.kategori] = 0;
    katMap[t.kategori] += t.nominal;
  });
  const katSorted = Object.entries(katMap).sort((a, b) => b[1] - a[1]);

  let html = `
    <div class="rekap-summary-grid">
      <div class="rekap-summary-card green-card">
        <div class="rekap-summary-label">Total Pengeluaran</div>
        <div class="rekap-summary-value">${formatCurrency(totalPengeluaran)}</div>
      </div>
      <div class="rekap-summary-card blue-card">
        <div class="rekap-summary-label">Total Pemasukan</div>
        <div class="rekap-summary-value">${formatCurrency(totalPemasukan)}</div>
      </div>
      <div class="rekap-summary-card purple-card">
        <div class="rekap-summary-label">Jumlah Transaksi</div>
        <div class="rekap-summary-value">${filtered.length}</div>
      </div>
      <div class="rekap-summary-card orange-card">
        <div class="rekap-summary-label">Selisih</div>
        <div class="rekap-summary-value">${formatCurrency(totalPemasukan - totalPengeluaran)}</div>
      </div>
    </div>
    <div class="section-header" style="padding-top:0">
      <span class="section-title">Top Kategori Pengeluaran</span>
      ${tab === 'hariIni' ? '<button class="btn-detail" onclick="navigateTo(\'screen-detail-harian\');renderDetailHarian()">Detail</button>' : ''}
      ${tab === 'mingguIni' ? '<button class="btn-detail" onclick="navigateTo(\'screen-rekap-mingguan\');renderRekapMingguan()">Detail</button>' : ''}
      ${tab === 'bulanIni' ? '<button class="btn-detail" onclick="navigateTo(\'screen-rekap-bulanan\');renderRekapBulanan()">Detail</button>' : ''}
    </div>`;

  if (katSorted.length > 0) {
    html += katSorted.slice(0, 5).map(([kat, total]) => {
      const pct = totalPengeluaran > 0 ? (total / totalPengeluaran * 100) : 0;
      const cls = getCatClass(kat);
      return `<div class="category-bar-item">
        <div class="category-bar-header">
          <div class="category-bar-label"><span class="category-dot cat-bg-${cls}"></span>${sanitize(kat)}</div>
          <div class="category-bar-amount">${formatCurrency(total)}</div>
        </div>
        <div class="category-bar-track"><div class="category-bar-fill cat-bg-${cls}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } else {
    html += '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Belum ada pengeluaran</div></div>';
  }

  container.innerHTML = html;
}

function renderCalendarStrip() {
  const strip = document.getElementById('calendar-strip');
  const today = new Date();
  let html = '';
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const isToday = i === 0;
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    html += `<div class="calendar-day ${isToday ? 'active' : ''}" onclick="selectCalendarDay('${dateStr}', this)">
      <span class="calendar-day-name">${dayNames[d.getDay()]}</span>
      <span class="calendar-day-number">${d.getDate()}</span>
    </div>`;
  }
  strip.innerHTML = html;
}

function selectCalendarDay(dateStr, el) {
  document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  
  const filtered = transactions.filter(t => t.tanggal === dateStr);
  const pengeluaran = filtered.filter(t => t.jenis === 'Pengeluaran');
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.nominal, 0);
  const totalPemasukan = filtered.filter(t => t.jenis === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
  
  const katMap = {};
  pengeluaran.forEach(t => { katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal; });
  const katSorted = Object.entries(katMap).sort((a, b) => b[1] - a[1]);
  
  const container = document.getElementById('rekap-content');
  let html = `
    <div class="rekap-summary-grid">
      <div class="rekap-summary-card green-card">
        <div class="rekap-summary-label">Total Pengeluaran</div>
        <div class="rekap-summary-value">${formatCurrency(totalPengeluaran)}</div>
      </div>
      <div class="rekap-summary-card blue-card">
        <div class="rekap-summary-label">Total Pemasukan</div>
        <div class="rekap-summary-value">${formatCurrency(totalPemasukan)}</div>
      </div>
      <div class="rekap-summary-card purple-card">
        <div class="rekap-summary-label">Jumlah Transaksi</div>
        <div class="rekap-summary-value">${filtered.length}</div>
      </div>
      <div class="rekap-summary-card orange-card">
        <div class="rekap-summary-label">Selisih</div>
        <div class="rekap-summary-value">${formatCurrency(totalPemasukan - totalPengeluaran)}</div>
      </div>
    </div>
    <div class="section-header" style="padding-top:0">
      <span class="section-title">Top Kategori Pengeluaran</span>
      <button class="btn-detail" onclick="navigateTo('screen-detail-harian');renderDetailHarianForDate('${dateStr}')">Detail</button>
    </div>`;
  
  if (katSorted.length > 0) {
    html += katSorted.slice(0, 5).map(([kat, total]) => {
      const pct = totalPengeluaran > 0 ? (total / totalPengeluaran * 100) : 0;
      const cls = getCatClass(kat);
      return `<div class="category-bar-item">
        <div class="category-bar-header">
          <div class="category-bar-label"><span class="category-dot cat-bg-${cls}"></span>${sanitize(kat)}</div>
          <div class="category-bar-amount">${formatCurrency(total)}</div>
        </div>
        <div class="category-bar-track"><div class="category-bar-fill cat-bg-${cls}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } else {
    html += '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Belum ada pengeluaran</div></div>';
  }
  container.innerHTML = html;
}

function renderDetailHarianForDate(dateStr) {
  const dayTxs = transactions.filter(t => t.tanggal === dateStr);
  const pengeluaran = dayTxs.filter(t => t.jenis === 'Pengeluaran');
  const total = pengeluaran.reduce((s, t) => s + t.nominal, 0);

  document.getElementById('detail-harian-total').textContent = formatCurrency(total);
  document.getElementById('detail-harian-count').textContent = dayTxs.length + ' Transaksi';
  document.getElementById('detail-harian-date').textContent = formatDate(dateStr);
  document.getElementById('detail-harian-totalbar-amount').textContent = formatCurrency(total);

  const timeline = document.getElementById('detail-harian-timeline');
  if (dayTxs.length === 0) {
    timeline.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Belum ada transaksi pada tanggal ini</div></div>';
    return;
  }

  const sorted = [...dayTxs].sort((a, b) => (a.jam || '').localeCompare(b.jam || ''));
  timeline.innerHTML = sorted.map((t, i) => {
    const cfg = getKategoriConfig(t.kategori);
    const isExpense = t.jenis === 'Pengeluaran';
    return `<div class="timeline-item" style="position:relative;padding-left:40px;padding-bottom:16px">
      ${i < sorted.length - 1 ? '<div class="timeline-connector"></div>' : ''}
      <div class="timeline-dot" style="background:${isExpense ? 'var(--red)' : 'var(--primary)'}"></div>
      <div class="timeline-time">${(t.jam || '').substring(0, 5)}</div>
      <div class="timeline-card" onclick="editTransaction('${sanitize(t.id)}')">
        <div class="transaction-icon cat-${cfg.class}">${cfg.icon}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${sanitize(t.keterangan)}</div>
          <div style="font-size:11px;color:var(--gray-400)">${sanitize(t.kategori)}</div>
        </div>
        <div style="font-weight:700;font-size:14px;color:${isExpense ? 'var(--red)' : 'var(--primary)'}">${isExpense ? '-' : '+'}${formatCurrency(t.nominal)}</div>
      </div>
    </div>`;
  }).join('');
}

// ─── DETAIL HARIAN ──────────────────────────────────────────

function renderDetailHarian() {
  const today = todayStr();
  const todayTxs = transactions.filter(t => t.tanggal === today);
  const pengeluaran = todayTxs.filter(t => t.jenis === 'Pengeluaran');
  const total = pengeluaran.reduce((s, t) => s + t.nominal, 0);

  document.getElementById('detail-harian-total').textContent = formatCurrency(total);
  document.getElementById('detail-harian-count').textContent = todayTxs.length + ' Transaksi';
  document.getElementById('detail-harian-date').textContent = formatDate(today);
  document.getElementById('detail-harian-totalbar-amount').textContent = formatCurrency(total);

  const timeline = document.getElementById('detail-harian-timeline');
  if (todayTxs.length === 0) {
    timeline.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Belum ada transaksi hari ini</div></div>';
    return;
  }

  const sorted = [...todayTxs].sort((a, b) => (a.jam || '').localeCompare(b.jam || ''));
  timeline.innerHTML = sorted.map((t, i) => {
    const cfg = getKategoriConfig(t.kategori);
    const isExpense = t.jenis === 'Pengeluaran';
    return `<div class="timeline-item" style="position:relative;padding-left:40px;padding-bottom:16px">
      ${i < sorted.length - 1 ? '<div class="timeline-connector"></div>' : ''}
      <div class="timeline-dot" style="background:${isExpense ? 'var(--red)' : 'var(--primary)'}"></div>
      <div class="timeline-time">${(t.jam || '').substring(0, 5)}</div>
      <div class="timeline-card" onclick="editTransaction('${sanitize(t.id)}')">
        <div class="transaction-icon cat-${cfg.class}">${cfg.icon}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${sanitize(t.keterangan)}</div>
          <div style="font-size:11px;color:var(--gray-400)">${sanitize(t.kategori)}</div>
        </div>
        <div style="font-weight:700;font-size:14px;color:${isExpense ? 'var(--red)' : 'var(--primary)'}">${isExpense ? '-' : '+'}${formatCurrency(t.nominal)}</div>
      </div>
    </div>`;
  }).join('');
}

// ─── REKAP MINGGUAN ─────────────────────────────────────────

function renderRekapMingguan() {
  const today = todayStr();
  const mon = getMonday(new Date());
  const monStr = mon.getFullYear() + '-' + String(mon.getMonth()+1).padStart(2,'0') + '-' + String(mon.getDate()).padStart(2,'0');
  const filtered = transactions.filter(t => t.tanggal >= monStr && t.tanggal <= today);
  const pengeluaran = filtered.filter(t => t.jenis === 'Pengeluaran');
  const total = pengeluaran.reduce((s, t) => s + t.nominal, 0);

  document.getElementById('weekly-period').textContent = formatDateShort(monStr) + ' - ' + formatDateShort(today);
  document.getElementById('weekly-total').textContent = formatCurrency(total);
  document.getElementById('weekly-count').textContent = filtered.length + ' Transaksi';

  renderCategoryBars('weekly-categories', pengeluaran);
}

// ─── REKAP BULANAN ──────────────────────────────────────────

function renderRekapBulanan() {
  const today = todayStr();
  const monthStart = today.substring(0, 7) + '-01';
  const filtered = transactions.filter(t => t.tanggal >= monthStart && t.tanggal <= today);
  const pengeluaran = filtered.filter(t => t.jenis === 'Pengeluaran');
  const total = pengeluaran.reduce((s, t) => s + t.nominal, 0);

  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  document.getElementById('monthly-period').textContent = monthName;
  document.getElementById('monthly-total').textContent = formatCurrency(total);
  document.getElementById('monthly-count').textContent = filtered.length + ' Transaksi';

  renderCategoryBars('monthly-categories', pengeluaran);

  // Trend chart — pengeluaran per hari dalam bulan ini
  const dayMap = {};
  pengeluaran.forEach(t => {
    const day = parseInt(t.tanggal.substring(8, 10));
    dayMap[day] = (dayMap[day] || 0) + t.nominal;
  });

  const todayDate = new Date().getDate();
  const labels = [];
  const data = [];
  for (let i = 1; i <= todayDate; i++) {
    labels.push(i);
    data.push(dayMap[i] || 0);
  }

  renderChart('chart-monthly-trend', 'bar', labels, [{ label: 'Pengeluaran', data, backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 4 }]);
}

// ─── REKAP CUSTOM ───────────────────────────────────────────

function handleCustomRekap() {
  const startDate = document.getElementById('custom-start-date').value;
  const endDate = document.getElementById('custom-end-date').value;

  if (!startDate || !endDate) {
    showToast('Pilih rentang tanggal', 'error');
    return;
  }
  if (startDate > endDate) {
    showToast('Tanggal awal harus sebelum tanggal akhir', 'error');
    return;
  }

  const filtered = transactions.filter(t => t.tanggal >= startDate && t.tanggal <= endDate);
  const pengeluaran = filtered.filter(t => t.jenis === 'Pengeluaran');
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.nominal, 0);

  document.getElementById('custom-period').textContent = formatDateShort(startDate) + ' - ' + formatDateShort(endDate);
  document.getElementById('custom-total').textContent = formatCurrency(totalPengeluaran);
  document.getElementById('custom-count').textContent = filtered.length + ' Transaksi';
  document.getElementById('custom-rekap-result').style.display = 'block';

  renderCategoryBars('custom-categories', pengeluaran);

  // Pie chart
  const katMap = {};
  pengeluaran.forEach(t => { katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal; });
  const katEntries = Object.entries(katMap).sort((a, b) => b[1] - a[1]);

  const colors = ['#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#6B7280'];
  renderChart('chart-pie', 'doughnut',
    katEntries.map(e => e[0]),
    [{ data: katEntries.map(e => e[1]), backgroundColor: colors.slice(0, katEntries.length) }],
    { cutout: '65%' }
  );
}

// ─── SHARED: CATEGORY BARS ──────────────────────────────────

function renderCategoryBars(containerId, pengeluaran) {
  const katMap = {};
  pengeluaran.forEach(t => { katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal; });
  const katSorted = Object.entries(katMap).sort((a, b) => b[1] - a[1]);
  const total = pengeluaran.reduce((s, t) => s + t.nominal, 0);

  const container = document.getElementById(containerId);
  if (katSorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Belum ada pengeluaran</div></div>';
    return;
  }

  container.innerHTML = katSorted.map(([kat, katTotal]) => {
    const pct = total > 0 ? (katTotal / total * 100) : 0;
    const cls = getCatClass(kat);
    return `<div class="category-bar-item">
      <div class="category-bar-header">
        <div class="category-bar-label"><span class="category-dot cat-bg-${cls}"></span>${sanitize(kat)}</div>
        <div class="category-bar-amount">${formatCurrency(katTotal)} (${pct.toFixed(0)}%)</div>
      </div>
      <div class="category-bar-track"><div class="category-bar-fill cat-bg-${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ─── STATISTIK ──────────────────────────────────────────────

function renderStatistik(period) {
  // Update tab active
  document.querySelectorAll('#stat-tabs .tab-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === period) btn.classList.add('active');
  });

  const now = new Date();
  let labels = [], pemasukanData = [], pengeluaranData = [], title = '';

  switch(period) {
    case 'daily': {
      title = '30 Hari Terakhir';
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        labels.push(d.getDate());
        const dayTxs = transactions.filter(t => t.tanggal === ds);
        pemasukanData.push(dayTxs.filter(t => t.jenis === 'Pemasukan').reduce((s,t) => s + t.nominal, 0));
        pengeluaranData.push(dayTxs.filter(t => t.jenis === 'Pengeluaran').reduce((s,t) => s + t.nominal, 0));
      }
      break;
    }
    case 'weekly': {
      title = '12 Minggu Terakhir';
      for (let w = 11; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (w * 7));
        const ws = getMonday(weekStart);
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        const wsStr = ws.getFullYear() + '-' + String(ws.getMonth()+1).padStart(2,'0') + '-' + String(ws.getDate()).padStart(2,'0');
        const weStr = we.getFullYear() + '-' + String(we.getMonth()+1).padStart(2,'0') + '-' + String(we.getDate()).padStart(2,'0');
        labels.push('W' + (12 - w));
        const weekTxs = transactions.filter(t => t.tanggal >= wsStr && t.tanggal <= weStr);
        pemasukanData.push(weekTxs.filter(t => t.jenis === 'Pemasukan').reduce((s,t) => s + t.nominal, 0));
        pengeluaranData.push(weekTxs.filter(t => t.jenis === 'Pengeluaran').reduce((s,t) => s + t.nominal, 0));
      }
      break;
    }
    case 'monthly': {
      title = '12 Bulan Terakhir';
      const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      for (let m = 11; m >= 0; m--) {
        const md = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const me = new Date(md.getFullYear(), md.getMonth() + 1, 0);
        const msStr = md.getFullYear() + '-' + String(md.getMonth()+1).padStart(2,'0') + '-01';
        const meStr = me.getFullYear() + '-' + String(me.getMonth()+1).padStart(2,'0') + '-' + String(me.getDate()).padStart(2,'0');
        labels.push(monthNames[md.getMonth()]);
        const mTxs = transactions.filter(t => t.tanggal >= msStr && t.tanggal <= meStr);
        pemasukanData.push(mTxs.filter(t => t.jenis === 'Pemasukan').reduce((s,t) => s + t.nominal, 0));
        pengeluaranData.push(mTxs.filter(t => t.jenis === 'Pengeluaran').reduce((s,t) => s + t.nominal, 0));
      }
      break;
    }
    case 'yearly': {
      title = '5 Tahun Terakhir';
      for (let y = 4; y >= 0; y--) {
        const year = now.getFullYear() - y;
        labels.push(year);
        const yTxs = transactions.filter(t => t.tanggal && t.tanggal.startsWith(String(year)));
        pemasukanData.push(yTxs.filter(t => t.jenis === 'Pemasukan').reduce((s,t) => s + t.nominal, 0));
        pengeluaranData.push(yTxs.filter(t => t.jenis === 'Pengeluaran').reduce((s,t) => s + t.nominal, 0));
      }
      break;
    }
  }

  document.getElementById('chart-stat-title').textContent = title;

  renderChart('chart-statistik', 'bar', labels, [
    { label: 'Pemasukan', data: pemasukanData, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
    { label: 'Pengeluaran', data: pengeluaranData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 }
  ]);

  // Quick stats
  renderQuickStats();
}

function renderQuickStats() {
  const allPengeluaran = transactions.filter(t => t.jenis === 'Pengeluaran');
  allPengeluaran.sort((a, b) => b.nominal - a.nominal);

  if (allPengeluaran.length > 0) {
    document.getElementById('stat-biggest-expense').textContent = formatCurrency(allPengeluaran[0].nominal);
    document.getElementById('stat-biggest-expense-detail').textContent = allPengeluaran[0].keterangan;
  }

  // Top category
  const katMap = {};
  allPengeluaran.forEach(t => { katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal; });
  const topKat = Object.entries(katMap).sort((a, b) => b[1] - a[1]);
  if (topKat.length > 0) {
    document.getElementById('stat-top-category').textContent = topKat[0][0];
    document.getElementById('stat-top-category-detail').textContent = formatCurrency(topKat[0][1]);
  }

  // Daily avg (30 days)
  const today = todayStr();
  let total30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    total30 += allPengeluaran.filter(t => t.tanggal === ds).reduce((s,t) => s + t.nominal, 0);
  }
  document.getElementById('stat-daily-avg').textContent = formatCurrency(Math.round(total30 / 30));
  document.getElementById('stat-total-tx').textContent = transactions.length;
}

// ─── CHART HELPER ───────────────────────────────────────────

function renderChart(canvasId, type, labels, datasets, extraOptions = {}) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => formatCurrency(ctx.parsed.y || ctx.parsed || 0)
        }
      }
    },
    scales: type === 'doughnut' || type === 'pie' ? {} : {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: v => 'Rp' + (v/1000) + 'k' } }
    },
    ...extraOptions
  };

  chartInstances[canvasId] = new Chart(canvas, { type, data: { labels, datasets }, options });
}

// ─── EXPORT CSV ─────────────────────────────────────────────

function exportToCSV() {
  if (transactions.length === 0) {
    showToast('Tidak ada data untuk di-export', 'error');
    return;
  }

  const headers = ['Tanggal', 'Jam', 'Jenis', 'Kategori', 'Keterangan', 'Nominal', 'Catatan'];
  const sorted = [...transactions].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
  const rows = sorted.map(t => [t.tanggal, t.jam, t.jenis, t.kategori, `"${(t.keterangan || '').replace(/"/g, '""')}"`, t.nominal, `"${(t.catatan || '').replace(/"/g, '""')}"`]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'catatan_uang_' + todayStr() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('File CSV berhasil di-download', 'success');
}

// ─── SYNC ───────────────────────────────────────────────────

function syncNow() {
  showToast('Memulai sinkronisasi...', 'info');
  fetchAndSyncTransactions();
}

async function fetchAndSyncTransactions() {
  if (!navigator.onLine) {
    showToast('Tidak ada koneksi internet', 'warning');
    return;
  }

  const syncTimeEl = document.getElementById('sync-time');
  if (syncTimeEl) syncTimeEl.innerHTML = '<span style="animation:pulse 1s infinite">⏳ Sinkronisasi...</span>';

  try {
    // Sync pending transactions first
    const pending = await getPendingTransactions();
    if (pending.length > 0) {
      // Remove any pending txs that were already synced via createTransaction
      // (they would have had their local IDs replaced with server IDs)
      const pendingIds = pending.map(p => p.id);
      const stillPending = pending.filter(p => {
        // Only sync if local ID still exists in transactions array
        // (if ID was replaced by server UUID, this entry is orphaned)
        return transactions.some(t => t.id === p.id);
      });

      if (stillPending.length > 0) {
        const resp = await fetch(API_URL + '?action=syncBatch', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ transactions: stillPending }),
          redirect: 'follow'
        });
        const data = await resp.json();
        if (data.success) {
          showToast(`${data.data.syncedCount} transaksi disinkronkan`, 'success');
        }
      }
      // Clear all pending regardless (they've been handled)
      await clearPendingTransactions();
    }

    // Fetch all from server (source of truth)
    const resp = await fetch(API_URL + '?action=getTransactions&limit=1000', { redirect: 'follow' });
    const data = await resp.json();
    if (data.success && data.data && data.data.transaksi) {
      const serverTxs = data.data.transaksi.map(t => ({
        ...t,
        nominal: parseFloat(t.nominal) || 0
      }));

      // Merge: keep local-only transactions that haven't been synced yet
      const serverIds = new Set(serverTxs.map(t => t.id));
      const localOnly = transactions.filter(t =>
        t.id.startsWith('local-') && !serverIds.has(t.id)
      );

      transactions = [...serverTxs, ...localOnly];
      await saveTransactionsToDB(transactions);
      document.getElementById('sync-time').textContent = 'Sync: ' + new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    }
  } catch (err) {
    console.warn('Sync error:', err);
  }

  // Re-render current screen
  if (currentScreen === 'screen-beranda') renderDashboard();
  else if (currentScreen === 'screen-transaksi') renderTransactionList();
  else if (currentScreen === 'screen-statistik') renderStatistik('monthly');
}

// ─── INDEXEDDB ──────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_TX)) db.createObjectStore(STORE_TX, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_PENDING)) db.createObjectStore(STORE_PENDING, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveTransactionsToDB(txs) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TX, 'readwrite');
    const store = tx.objectStore(STORE_TX);
    store.clear();
    txs.forEach(t => store.put(t));
  } catch (e) { console.warn('DB save error:', e); }
}

async function getTransactionsFromDB() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TX, 'readonly');
      const req = tx.objectStore(STORE_TX).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
}

async function addPendingTransaction(t) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    tx.objectStore(STORE_PENDING).put(t);
  } catch (e) { console.warn('Pending save error:', e); }
}

async function getPendingTransactions() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const req = tx.objectStore(STORE_PENDING).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
}

async function clearPendingTransactions() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    tx.objectStore(STORE_PENDING).clear();
  } catch (e) { console.warn('Clear pending error:', e); }
}

// ─── EVENT LISTENERS ────────────────────────────────────────

function setupDateInputs() {
  document.querySelectorAll('input[type="date"]').forEach(el => {
    el.setAttribute('max', '2099-12-31');
    el.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val) {
        const parts = val.split('-');
        if (parts[0] && parts[0].length > 4) {
          parts[0] = parts[0].substring(0, 4);
          e.target.value = parts.join('-');
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Limit year input to 4 digits
  setupDateInputs();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed:', e));
  }

  // Online/offline
  window.addEventListener('online', () => { updateOnlineStatus(); fetchAndSyncTransactions(); });
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen) navigateTo(screen);
    });
  });

  // FAB
  document.getElementById('fab-add').addEventListener('click', () => navigateTo('screen-tambah'));

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const back = btn.dataset.back;
      if (back) navigateTo(back);
    });
  });

  // Lihat Semua
  const lihatSemua = document.getElementById('btn-lihat-semua');
  if (lihatSemua) lihatSemua.addEventListener('click', () => navigateTo('screen-transaksi'));

  // Toggle Jenis — Tambah
  document.querySelectorAll('#screen-tambah .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#screen-tambah .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentJenis = btn.dataset.type;
      updateKategoriDropdown('input-kategori', currentJenis);
    });
  });

  // Toggle Jenis — Edit
  document.querySelectorAll('#edit-toggle-group .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#edit-toggle-group .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editJenis = btn.dataset.type;
      updateKategoriDropdown('edit-kategori', editJenis);
    });
  });

  // Quick category
  document.querySelectorAll('.quick-cat-item').forEach(item => {
    item.addEventListener('click', () => {
      const kat = item.dataset.kategori;
      if (kat) document.getElementById('input-kategori').value = kat;
    });
  });

  // Simpan button
  document.getElementById('btn-simpan').addEventListener('click', saveTransaction);

  // Edit save
  document.getElementById('btn-save-edit').addEventListener('click', saveEditTransaction);

  // Edit delete
  document.getElementById('btn-delete-edit').addEventListener('click', () => {
    const id = document.getElementById('edit-transaction-id').value;
    if (id) deleteTransaction(id);
  });

  // Rekap tabs
  document.querySelectorAll('#rekap-tabs .tab-item').forEach(btn => {
    btn.addEventListener('click', () => renderRekapTab(btn.dataset.tab));
  });

  // Stat tabs
  document.querySelectorAll('#stat-tabs .tab-item').forEach(btn => {
    btn.addEventListener('click', () => renderStatistik(btn.dataset.tab));
  });

  // Custom rekap button
  const btnCustom = document.getElementById('btn-custom-rekap');
  if (btnCustom) btnCustom.addEventListener('click', handleCustomRekap);

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchKeyword = searchInput.value.trim();
        renderTransactionList();
      }, 300);
    });
  }

  // Load data
  // 1. Load from IndexedDB first (instant)
  const dbTxs = await getTransactionsFromDB();
  if (dbTxs.length > 0) {
    transactions = dbTxs;
  } else {
    transactions = generateSampleTransactions();
    saveTransactionsToDB(transactions);
  }

  // Render initial screen
  renderDashboard();

  // Init icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // 2. Then sync from server
  if (navigator.onLine) {
    fetchAndSyncTransactions().then(() => {
      renderDashboard();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }
});
