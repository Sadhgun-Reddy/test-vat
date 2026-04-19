// src/components/bot/InternalBot.jsx
// VAHD Internal Information Bot — full API coverage
// Resolves natural-language queries to backend endpoints using the authenticated user's JWT.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { botFetch } from './botApi';

// ─────────────────────────────────────────────────────────────────
// INTENT REGISTRY
// Each entry: { patterns, resolve }
//   patterns  – array of RegExp / strings (lowercased match)
//   resolve   – async (match, raw) => string answer
// Evaluated in order; first match wins.
// ─────────────────────────────────────────────────────────────────

// Utility: extract trailing location hint "in <name>"
const locationHint = q => { const m = q.match(/\bin\s+([a-z\s]{2,30}?)(?:\s*\?|$)/); return m ? m[1].trim() : ''; };
const numHint      = q => { const m = q.match(/(\d+)/); return m ? +m[1] : null; };
const dateHint     = q => { const m = q.match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };

// Format number with commas
const fmt = n => (n ?? '—').toLocaleString?.() ?? n;

// Build a bullet list from array
const bullets = (arr, fn) => arr.length ? arr.map(fn).join('\n') : '(none)';

// ─────────────────────────────────────────────────────────────────
// INTENTS
// ─────────────────────────────────────────────────────────────────
const INTENTS = [

  // ── DASHBOARD ──────────────────────────────────────────────────
  {
    id: 'dashboard',
    patterns: [/\bdashboard\b/, /\bkpi\b/, /\boverview\b/, /\bsummary\b/],
    async resolve() {
      const r = await botFetch('/dashboard');
      if (!r.ok) return `Dashboard error: ${r.message}`;
      const d = r.data;
      const k = d.kpis || {};
      return [
        '📊 Dashboard KPIs',
        `• Cases treated  : ${fmt(k.cases_today ?? k.cases)}`,
        `• Vaccinations   : ${fmt(k.vaccinations_today ?? k.vaccinations)}`,
        `• AI services    : ${fmt(k.ai_today ?? k.ai_services)}`,
        `• Deworming      : ${fmt(k.deworming_today ?? k.deworming)}`,
        `• Active employees: ${fmt(k.active_employees ?? k.employees)}`,
        `• Pending sync   : ${fmt(k.pending_sync ?? d.sync_health?.pending)}`,
      ].join('\n');
    },
  },

  // ── EMPLOYEES ──────────────────────────────────────────────────
  {
    id: 'employee_count',
    patterns: [/how many (employees|staff|officers)/, /total (employees|staff)/, /employee count/],
    async resolve(_, q) {
      const loc = locationHint(q);
      const url = `/employees?limit=1${loc ? `&search=${encodeURIComponent(loc)}` : ''}`;
      const r = await botFetch(url);
      if (!r.ok) return `Employees error: ${r.message}`;
      return `Total employees${loc ? ` matching "${loc}"` : ''}: ${fmt(r.data?.total ?? r.data?.stats?.total ?? (Array.isArray(r.data) ? r.data.length : '?'))}`;
    },
  },
  {
    id: 'employee_list',
    patterns: [/list (employees|staff)/, /show (employees|staff)/, /employees? in/, /staff in/],
    async resolve(_, q) {
      const loc = locationHint(q);
      const url = `/employees?limit=8${loc ? `&search=${encodeURIComponent(loc)}` : ''}`;
      const r = await botFetch(url);
      if (!r.ok) return `Employees error: ${r.message}`;
      const emps = r.data?.employees || r.data || [];
      if (!emps.length) return `No employees found${loc ? ` in "${loc}"` : ''}.`;
      return `Employees${loc ? ` in "${loc}"` : ''} (${r.data?.total ?? emps.length} total):\n` +
        bullets(emps.slice(0, 8), e => `• ${e.name} — ${e.designation_name || e.designation || 'N/A'} (${e.district_name || e.place_name || 'N/A'})`);
    },
  },

  // ── ATTENDANCE ─────────────────────────────────────────────────
  {
    id: 'attendance',
    patterns: [/attendance/, /present today/, /absent today/],
    async resolve(_, q) {
      const date = dateHint(q) || new Date().toISOString().slice(0, 10);
      const r = await botFetch(`/attendance?date=${date}&limit=1`);
      if (!r.ok) return `Attendance error: ${r.message}`;
      const s = r.data?.stats || {};
      return [
        `📋 Attendance for ${date}`,
        `• Total    : ${fmt(s.total ?? r.data?.total)}`,
        `• Present  : ${fmt(s.present)}`,
        `• Absent   : ${fmt(s.absent)}`,
        `• On leave : ${fmt(s.on_leave)}`,
      ].join('\n');
    },
  },

  // ── LEAVES ─────────────────────────────────────────────────────
  {
    id: 'leaves',
    patterns: [/leave/],
    async resolve() {
      const r = await botFetch('/leaves?limit=5&status=pending');
      if (!r.ok) return `Leaves error: ${r.message}`;
      const leaves = r.data?.leaves || r.data || [];
      const total  = r.data?.total ?? leaves.length;
      if (!leaves.length) return 'No pending leave applications.';
      return `Pending leaves (${total} total):\n` +
        bullets(leaves.slice(0, 5), l => `• ${l.employee_name || 'N/A'} — ${l.leave_type || 'N/A'} (${l.from_date} → ${l.to_date})`);
    },
  },

  // ── FARMERS ────────────────────────────────────────────────────
  {
    id: 'farmers',
    patterns: [/farmer/, /registered farmer/],
    async resolve(_, q) {
      const loc = locationHint(q);
      const url = `/farmers?limit=5${loc ? `&search=${encodeURIComponent(loc)}` : ''}`;
      const r = await botFetch(url);
      if (!r.ok) return `Farmers error: ${r.message}`;
      const farmers = r.data?.farmers || r.data || [];
      const total   = r.data?.total ?? farmers.length;
      return `Farmers${loc ? ` in "${loc}"` : ''} (${total} total):\n` +
        bullets(farmers.slice(0, 5), f => `• ${f.name} — ${f.mobile || 'N/A'} (${f.district_name || f.village_name || 'N/A'})`);
    },
  },

  // ── DRUGS / STOCK ──────────────────────────────────────────────
  {
    id: 'drug_stock',
    patterns: [/stock level/, /drug stock/, /medicine stock/, /inventory/, /low stock/, /out of stock/],
    async resolve(_, q) {
      const low = /low|out/.test(q);
      const r   = await botFetch('/stock/levels?limit=8');
      if (!r.ok) return `Stock error: ${r.message}`;
      let items = r.data?.drugs || r.data || [];
      if (low) items = items.filter(d => (d.stock_qty ?? 0) <= (d.min_stock ?? 0));
      if (!items.length) return low ? 'No drugs below minimum stock level.' : 'No stock data found.';
      return `${low ? '⚠️ Low/Out-of-stock drugs' : 'Drug stock levels'} (${items.length} shown):\n` +
        bullets(items.slice(0, 8), d => `• ${d.name || d.drug_name} — Qty: ${fmt(d.stock_qty)} (min: ${fmt(d.min_stock)}) [${d.status || 'N/A'}]`);
    },
  },
  {
    id: 'drug_search',
    patterns: [/drug/, /medicine/, /ivermectin/, /albendazole/, /vaccine stock/],
    async resolve(_, q) {
      const search = q.replace(/(?:search|show|find|drug|medicine|for|stock)\s*/gi, '').replace(/\?/, '').trim() || '';
      const r = await botFetch(`/drugs?limit=5${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      if (!r.ok) return `Drugs error: ${r.message}`;
      const drugs = r.data?.drugs || r.data || [];
      if (!drugs.length) return `No drugs found matching "${search}".`;
      return `Drugs (${r.data?.total ?? drugs.length} total):\n` +
        bullets(drugs.slice(0, 5), d => `• ${d.name} — Category: ${d.category || 'N/A'} | Stock: ${fmt(d.stock_qty ?? '?')} | Exp: ${d.expiry_date || 'N/A'}`);
    },
  },

  // ── INDENTS ────────────────────────────────────────────────────
  {
    id: 'indents',
    patterns: [/indent/, /drug indent/, /pending indent/],
    async resolve(_, q) {
      const status = /approve|dispatch|receiv/.test(q) ? undefined : 'pending';
      const url    = `/indents?limit=5${status ? `&status=${status}` : ''}`;
      const r      = await botFetch(url);
      if (!r.ok) return `Indents error: ${r.message}`;
      const items = r.data?.indents || r.data || [];
      return `Drug indents${status ? ` (${status})` : ''} — ${r.data?.total ?? items.length} total:\n` +
        bullets(items.slice(0, 5), i => `• ${i.drug_name || 'N/A'} — ${i.quantity} units | ${i.district_name || 'N/A'} | Status: ${i.status}`);
    },
  },

  // ── PURCHASE ORDERS ────────────────────────────────────────────
  {
    id: 'purchase_orders',
    patterns: [/purchase order/, /\bpo\b/, /pending po/],
    async resolve() {
      const r = await botFetch('/purchase-orders?limit=5');
      if (!r.ok) return `Purchase orders error: ${r.message}`;
      const items = r.data?.purchase_orders || r.data || [];
      return `Purchase orders — ${r.data?.total ?? items.length} total:\n` +
        bullets(items.slice(0, 5), p => `• PO #${p.id || p.po_number || 'N/A'} — ${p.vendor_name || 'N/A'} | ₹${fmt(p.total_amount)} | ${p.status}`);
    },
  },

  // ── SALES ─────────────────────────────────────────────────────
  {
    id: 'sales',
    patterns: [/sale/, /drug sale/, /revenue/],
    async resolve(_, q) {
      const from = dateHint(q);
      const url  = `/sales?limit=5${from ? `&from=${from}` : ''}`;
      const r    = await botFetch(url);
      if (!r.ok) return `Sales error: ${r.message}`;
      const items = r.data?.sales || r.data || [];
      const total = r.data?.total ?? items.length;
      const amt   = items.reduce((s, i) => s + +(i.total_amount || 0), 0);
      return `Drug sales — ${total} records | Total: ₹${fmt(amt)} (current page):\n` +
        bullets(items.slice(0, 5), s => `• ${s.farmer_name || 'N/A'} — ₹${fmt(s.total_amount)} | ${s.payment_method || 'N/A'} | ${s.sale_date || 'N/A'}`);
    },
  },

  // ── CASES ─────────────────────────────────────────────────────
  {
    id: 'cases',
    patterns: [/case/, /treated/, /clinical case/, /animal case/],
    async resolve(_, q) {
      const loc  = locationHint(q);
      const from = dateHint(q);
      let url    = '/cases?limit=5';
      if (loc)  url += `&search=${encodeURIComponent(loc)}`;
      if (from) url += `&from=${from}`;
      const r = await botFetch(url);
      if (!r.ok) return `Cases error: ${r.message}`;
      const cases = r.data?.cases || r.data || [];
      return `Cases treated — ${r.data?.total ?? cases.length} total:\n` +
        bullets(cases.slice(0, 5), c => `• ${c.farmer_name || 'N/A'} | ${c.animal_type_name || 'N/A'} | ${c.diagnosis_name || 'N/A'} | ${c.outcome || 'N/A'} | ${c.treated_date || 'N/A'}`);
    },
  },

  // ── VACCINATIONS ──────────────────────────────────────────────
  {
    id: 'vaccinations',
    patterns: [/vaccination/, /vaccine/],
    async resolve(_, q) {
      const from = dateHint(q);
      const url  = `/vaccinations?limit=5${from ? `&from=${from}` : ''}`;
      const r    = await botFetch(url);
      if (!r.ok) return `Vaccinations error: ${r.message}`;
      const items = r.data?.vaccinations || r.data || [];
      return `Vaccinations — ${r.data?.total ?? items.length} total:\n` +
        bullets(items.slice(0, 5), v => `• ${v.farmer_name || 'N/A'} | ${v.vaccine_name || 'N/A'} | ${v.animal_count} animals | ${v.vaccination_date || 'N/A'}`);
    },
  },

  // ── DEWORMING ─────────────────────────────────────────────────
  {
    id: 'deworming',
    patterns: [/deworming/, /deworm/],
    async resolve(_, q) {
      const from = dateHint(q);
      const url  = `/deworming?limit=5${from ? `&from=${from}` : ''}`;
      const r    = await botFetch(url);
      if (!r.ok) return `Deworming error: ${r.message}`;
      const items = r.data?.deworming || r.data || [];
      const total = r.data?.total ?? items.length;
      const animals = items.reduce((s, i) => s + +(i.animal_count || 0), 0);
      return `Deworming records — ${total} total | ${animals} animals (current page):\n` +
        bullets(items.slice(0, 5), d => `• ${d.farmer_name || 'N/A'} | ${d.animal_type_name || 'N/A'} | ${d.drug_name || 'N/A'} | ${d.date_of_deworming || 'N/A'}`);
    },
  },

  // ── AI SERVICES ───────────────────────────────────────────────
  {
    id: 'ai_services',
    patterns: [/artificial insemination/, /\bai service/, /semen/, /pregnancy/],
    async resolve(_, q) {
      const from = dateHint(q);
      const url  = `/ai-services?limit=5${from ? `&from=${from}` : ''}`;
      const r    = await botFetch(url);
      if (!r.ok) return `AI services error: ${r.message}`;
      const items = r.data?.ai_services || r.data || [];
      return `AI services — ${r.data?.total ?? items.length} total:\n` +
        bullets(items.slice(0, 5), a => `• ${a.farmer_name || 'N/A'} | ${a.animal_type_name || 'N/A'} | ${a.semen_type || 'N/A'} | Pregnancy: ${a.pregnancy_status || 'Pending'} | ${a.service_date || 'N/A'}`);
    },
  },

  // ── FODDER ────────────────────────────────────────────────────
  {
    id: 'fodder',
    patterns: [/fodder/],
    async resolve(_, q) {
      const loc = locationHint(q);
      const url = `/fodder?limit=5${loc ? `&search=${encodeURIComponent(loc)}` : ''}`;
      const r   = await botFetch(url);
      if (!r.ok) return `Fodder error: ${r.message}`;
      const items = r.data?.fodder || r.data || [];
      return `Fodder distribution — ${r.data?.total ?? items.length} total:\n` +
        bullets(items.slice(0, 5), f => `• ${f.farmer_name || 'N/A'} | ${f.fodder_type || 'N/A'} | ${f.quantity_kg} kg | ${f.distribution_date || 'N/A'}`);
    },
  },

  // ── PLACES / INSTITUTIONS ─────────────────────────────────────
  {
    id: 'places',
    patterns: [/institution/, /place of work/, /clinic/, /hospital/, /\bvet\b/, /places in/],
    async resolve(_, q) {
      const loc = locationHint(q);
      const url = `/places-of-working?limit=6&is_active=true${loc ? `&search=${encodeURIComponent(loc)}` : ''}`;
      const r   = await botFetch(url);
      if (!r.ok) return `Institutions error: ${r.message}`;
      const places = r.data?.places || r.data || [];
      return `Active institutions${loc ? ` in "${loc}"` : ''} — ${r.data?.total ?? places.length} total:\n` +
        bullets(places.slice(0, 6), p => `• ${p.name} | ${p.institution_type_name || 'N/A'} | ${p.district_name || 'N/A'} › ${p.mandal_name || 'N/A'}`);
    },
  },

  // ── DISTRICTS ─────────────────────────────────────────────────
  {
    id: 'districts',
    patterns: [/district/, /how many district/],
    async resolve() {
      const r = await botFetch('/districts?limit=50');
      if (!r.ok) return `Districts error: ${r.message}`;
      const list = r.data?.districts || r.data || [];
      return `${list.length} districts: ${list.map(d => d.name).join(', ')}`;
    },
  },

  // ── MANDALS ───────────────────────────────────────────────────
  {
    id: 'mandals',
    patterns: [/mandal/, /how many mandal/],
    async resolve(_, q) {
      const loc = locationHint(q);
      const url = `/mandals?limit=1${loc ? `&search=${encodeURIComponent(loc)}` : ''}`;
      const r   = await botFetch(url);
      if (!r.ok) return `Mandals error: ${r.message}`;
      return `Total mandals${loc ? ` matching "${loc}"` : ''}: ${fmt(r.data?.total ?? (Array.isArray(r.data) ? r.data.length : '?'))}`;
    },
  },

  // ── IOT ───────────────────────────────────────────────────────
  {
    id: 'iot',
    patterns: [/iot/, /sensor/, /cold.?chain/, /temperature/, /alert/],
    async resolve() {
      const [s, a] = await Promise.all([
        botFetch('/iot/summary'),
        botFetch('/iot/alerts'),
      ]);
      const summary = s.ok ? (s.data?.sensors || s.data || []) : [];
      const alerts  = a.ok ? (a.data?.alerts  || a.data || []) : [];
      return [
        `🌡️ IoT Summary — ${summary.length} sensor(s)`,
        ...summary.slice(0, 4).map(s => `• ${s.sensor_name || s.id} | Temp: ${s.temperature ?? '—'}°C | Hum: ${s.humidity ?? '—'}%`),
        alerts.length ? `⚠️ Active alerts: ${alerts.length}` : '✓ No active alerts',
      ].join('\n');
    },
  },

  // ── REPORTS ───────────────────────────────────────────────────
  {
    id: 'report_district',
    patterns: [/district.*abstract/, /abstract report/, /district.*report/],
    async resolve() {
      const r = await botFetch('/reports/district-abstract?limit=5');
      if (!r.ok) return `Report error: ${r.message}`;
      const rows = r.data?.data || r.data || [];
      return `District abstract (top 5):\n` +
        bullets(rows.slice(0, 5), d => `• ${d.district_name} | Cases:${d.cases ?? 0} Vax:${d.vaccinations ?? 0} DW:${d.deworming ?? 0} AI:${d.ai_services ?? 0}`);
    },
  },
  {
    id: 'report_inventory',
    patterns: [/inventory report/, /stock report/],
    async resolve() {
      const r = await botFetch('/reports/inventory?limit=5');
      if (!r.ok) return `Report error: ${r.message}`;
      const rows = r.data?.drugs || r.data || [];
      return `Inventory report (${rows.length} drugs shown):\n` +
        bullets(rows.slice(0, 5), d => `• ${d.name} | Stock:${fmt(d.stock_qty)} | Min:${d.min_stock} | Status:${d.status}`);
    },
  },
  {
    id: 'report_ai',
    patterns: [/ai.*report/, /insemination.*report/, /success rate/],
    async resolve() {
      const r = await botFetch('/reports/ai');
      if (!r.ok) return `Report error: ${r.message}`;
      const rows = r.data?.data || r.data || [];
      return `AI services report:\n` +
        bullets(rows.slice(0, 5), d => `• ${d.district_name || 'N/A'} | Total:${d.total ?? 0} | Pregnant:${d.pregnant ?? 0} | Rate:${d.success_rate ?? '—'}%`);
    },
  },
  {
    id: 'report_farmers',
    patterns: [/farmer.*report/, /farmer.*statistic/],
    async resolve() {
      const r = await botFetch('/reports/farmers');
      if (!r.ok) return `Report error: ${r.message}`;
      const rows = r.data?.data || r.data || [];
      return `Farmer registry stats:\n` +
        bullets(rows.slice(0, 5), d => `• ${d.district_name || 'N/A'} | Farmers:${fmt(d.total_farmers)} | Owners:${d.owners ?? 0} | Tenants:${d.tenants ?? 0}`);
    },
  },

  // ── SYNC STATUS ───────────────────────────────────────────────
  {
    id: 'sync',
    patterns: [/sync/, /offline.*queue/, /pending.*sync/],
    async resolve() {
      const r = await botFetch('/sync/status');
      if (!r.ok) return `Sync error: ${r.message}`;
      const d = r.data || {};
      return [
        '⇄ Sync Status',
        `• Queue size     : ${fmt(d.queue_size ?? d.total)}`,
        `• Unresolved     : ${fmt(d.unresolved_conflicts)}`,
        `• Last processed : ${d.last_processed_at || 'N/A'}`,
      ].join('\n');
    },
  },

  // ── USERS ─────────────────────────────────────────────────────
  {
    id: 'users',
    patterns: [/\buser\b/, /\badmin user\b/, /who has access/],
    async resolve() {
      const r = await botFetch('/users?limit=10');
      if (!r.ok) {
        if (r.status === 403) return '🔒 Access denied — user list requires director or admin role.';
        return `Users error: ${r.message}`;
      }
      const users = r.data?.users || r.data || [];
      return `System users (${r.data?.total ?? users.length} total):\n` +
        bullets(users.slice(0, 8), u => `• ${u.name} — ${u.email} [${u.role}]`);
    },
  },

  // ── ALLOCATIONS ───────────────────────────────────────────────
  {
    id: 'allocations',
    patterns: [/allocation/],
    async resolve() {
      const r = await botFetch('/allocations?limit=5');
      if (!r.ok) return `Allocations error: ${r.message}`;
      const items = r.data?.allocations || r.data || [];
      return `Drug allocations — ${r.data?.total ?? items.length} total:\n` +
        bullets(items.slice(0, 5), a => `• ${a.drug_name || 'N/A'} | ${a.district_name || 'N/A'} | Alloc:${fmt(a.allocated_qty)} | Used:${fmt(a.consumed_qty)}`);
    },
  },

  // ── HELP / FALLBACK ───────────────────────────────────────────
  {
    id: 'help',
    patterns: [/help/, /what can you/, /what do you know/, /capabilities/],
    async resolve() {
      return [
        '🤖 I can answer questions about:',
        '• 📊 Dashboard KPIs',
        '• 👤 Employees — list, count, by district',
        '• 📋 Attendance — daily summary',
        '• 📄 Leaves — pending applications',
        '• 🌾 Farmers — registry & stats',
        '• 💊 Drugs & Stock — levels, low stock',
        '• 📦 Indents, Allocations, Purchase Orders',
        '• 🧾 Sales — drug sales & revenue',
        '• 🩺 Cases, Vaccinations, Deworming, AI services',
        '• 🌿 Fodder distribution',
        '• 🏥 Institutions / Places of working',
        '• 🌡️ IoT sensors & cold-chain alerts',
        '• 📈 Reports — district abstract, inventory, AI, farmers',
        '• ⇄ Sync queue status',
        '',
        'Try: "Show low stock drugs" or "Attendance today" or "AI services report"',
      ].join('\n');
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// QUERY RESOLVER — finds first matching intent
// ─────────────────────────────────────────────────────────────────
async function resolveQuery(text) {
  const q = text.toLowerCase().trim();
  for (const intent of INTENTS) {
    const matched = intent.patterns.some(p =>
      p instanceof RegExp ? p.test(q) : q.includes(p)
    );
    if (matched) {
      try {
        return await intent.resolve(null, q);
      } catch (e) {
        return `Error fetching data: ${e.message}`;
      }
    }
  }
  return "I didn't understand that query. Type 'help' to see what I can answer.";
}

// ─────────────────────────────────────────────────────────────────
// SUGGESTION CHIPS
// ─────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Dashboard KPIs',
  'Show low stock drugs',
  'Attendance today',
  'Pending indents',
  'Cases treated',
  'AI services report',
  'List employees in Karimnagar',
  'IoT sensor alerts',
];

// ─────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isBot = msg.role === 'bot';
  return (
    <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
      {isBot && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, marginRight: 7, marginTop: 1,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: '80%', padding: '8px 12px',
        borderRadius: isBot ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isBot ? '#f1f5f9' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
        color: isBot ? '#1e293b' : '#fff',
        fontSize: 12, lineHeight: 1.6,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      }}>
        {msg.text}
        {msg.loading && <span style={{ opacity: 0.5, animation: 'blink 1s step-start infinite' }}>▋</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function InternalBot() {
  const [open, setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I can query live VAHD data — employees, stock, cases, reports, IoT sensors, and more.\n\nType a question or tap a suggestion below.' },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages.length]);

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const answer = await resolveQuery(q);
      setMessages(m => [...m, { role: 'bot', text: answer }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `Unexpected error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const hasUserMsg = messages.some(m => m.role === 'user');

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="VAHD Info Bot"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: open ? '#1e3a8a' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
          color: '#fff', fontSize: open ? 18 : 22, cursor: 'pointer',
          boxShadow: '0 4px 22px rgba(29,78,216,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .2s, background .2s',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
        aria-label="Toggle VAHD Info Bot"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 86, right: 24, zIndex: 8999,
          width: 380, maxWidth: 'calc(100vw - 32px)',
          height: 520, maxHeight: 'calc(100vh - 130px)',
          background: '#fff',
          border: '1px solid rgba(226,232,240,0.9)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(15,23,42,0.2), 0 6px 20px rgba(29,78,216,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'dropIn .18s ease',
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px', flexShrink: 0,
            background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🤖</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>VAHD Info Bot</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>Live data · {INTENTS.length - 1} query types</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 16 }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', minHeight: 0 }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {loading && <Bubble msg={{ role: 'bot', text: 'Fetching data…', loading: true }} />}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {!hasUserMsg && !loading && (
            <div style={{ padding: '4px 12px 8px', flexShrink: 0, borderTop: '1px solid var(--bdr)' }}>
              <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, marginBottom: 5 }}>Quick queries:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    padding: '4px 9px', borderRadius: 20,
                    border: '1px solid #bfdbfe', background: '#eff6ff',
                    color: '#1d4ed8', fontSize: 10.5, cursor: 'pointer',
                    fontFamily: 'inherit', lineHeight: 1.4,
                    transition: 'background .12s',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input row */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--bdr)', display: 'flex', gap: 6, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about any app data…"
              disabled={loading}
              style={{
                flex: 1, padding: '7px 12px', borderRadius: 20,
                border: '1.5px solid var(--bdr)', fontSize: 12,
                fontFamily: 'inherit', outline: 'none', background: '#fff',
                transition: 'border .15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--bdr)'; }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                background: input.trim() && !loading ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : '#e2e8f0',
                color: input.trim() && !loading ? '#fff' : '#94a3b8',
                fontSize: 15, cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}
              aria-label="Send"
            >➤</button>
          </div>
        </div>
      )}
    </>
  );
}
