// VAHD-style budget dashboard (filters, plan cards, allocation table)
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, Card, DataTable, Btn, Modal, inputStyle, EmptyState,
} from '../../components/ui';
import toast from 'react-hot-toast';

const QUARTER_ROMAN = ['I', 'II', 'III', 'IV'];
const PAGE_SIZE = 10;
const BASE = '/settings/budget-allocations';

/** Default labels if Settings → Form Type master is empty. */
const FORM_TYPE_FALLBACK = [
  'Allopathic Medicine',
  'Ayurvedic Medicine',
  'Homoeopathic Medicine',
  'Siddha Medicine',
  'Unani Medicine',
  'Medical devices & supplies',
  'Other',
];

function newLineKey() {
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyFormLine(spent = 0) {
  return {
    key: newLineKey(),
    form_type: '',
    drug_ids: [],
    allocated_pct: 0,
    budget_amount: 0,
    spent_amount: spent,
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatRs(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function utilizationPct(budget, spent) {
  const b = num(budget);
  if (b <= 0) return 0;
  return Math.min(100, Math.round((num(spent) / b) * 1000) / 10);
}

function UtilBar({ pct }) {
  const p = Math.max(0, Math.min(100, num(pct)));
  return (
    <div style={{ minWidth: 88 }}>
      <div style={{
        height: 8,
        borderRadius: 4,
        background: 'var(--bg2)',
        overflow: 'hidden',
        border: '1px solid var(--bdr)',
      }}
      >
        <div style={{
          width: `${p}%`,
          height: '100%',
          background: p >= 90 ? 'var(--amb)' : 'var(--blu)',
          transition: 'width .2s ease',
        }}
        />
      </div>
      <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{p}%</div>
    </div>
  );
}

const TABLE_CTRL = {
  minHeight: 36,
  boxSizing: 'border-box',
};

/** Utilization bar + budget (updates as you type) and spent (from record). */
function AllocatedRowIndicator({ budgetAmount, spentAmount, compact }) {
  const budget = num(budgetAmount);
  const spent = num(spentAmount);
  const pct = utilizationPct(budget, spent);
  const p = Math.max(0, Math.min(100, num(pct)));
  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
        width: '100%',
        minHeight: TABLE_CTRL.minHeight,
        fontVariantNumeric: 'tabular-nums',
      }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt)', minWidth: 32 }}>{p}%</span>
        <span style={{ fontSize: 10, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
          B <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{formatRs(budget)}</span>
          {' · '}
          U <span style={{ fontWeight: 600, color: 'var(--txt2)' }}>{formatRs(spent)}</span>
        </span>
      </div>
    );
  }
  return (
    <div style={{ width: '100%', maxWidth: 168, margin: '0 auto' }}>
      <div style={{
        position: 'relative',
        height: 30,
        borderRadius: 6,
        background: 'var(--bg2)',
        border: '1px solid var(--bdr)',
        overflow: 'hidden',
      }}
      >
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${p}%`,
          background: '#64748b',
          opacity: 0.4,
          transition: 'width .15s ease',
        }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--txt)',
        }}
        >
          {p}%
        </div>
      </div>
      <div style={{
        marginTop: 6,
        textAlign: 'center',
        width: '100%',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.45,
      }}
      >
        <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
          Budget
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
          {formatRs(budget)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4 }}>
          Utilized
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
          {formatRs(spent)}
        </div>
      </div>
    </div>
  );
}

/** Multi-select drugs grouped by category, with search. */
function DrugMultiSelect({ drugs, value, onChange, disabled }) {
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const sel = useMemo(() => new Set((value || []).map(String)), [value]);

  const activeDrugs = useMemo(
    () => (drugs || []).filter((d) => d.is_active !== false),
    [drugs],
  );

  const toggle = (id) => {
    const idStr = String(id);
    const next = new Set(sel);
    if (next.has(idStr)) next.delete(idStr); else next.add(idStr);
    onChange([...next]);
  };

  const toggleCategory = (cat) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const toggleAll = (catDrugs) => {
    const ids = catDrugs.map((d) => String(d.id));
    const allOn = ids.every((id) => sel.has(id));
    const next = new Set(sel);
    ids.forEach((id) => { if (allOn) next.delete(id); else next.add(id); });
    onChange([...next]);
  };

  // Grouped + filtered
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const sorted = [...activeDrugs].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || '')),
    );
    const map = {};
    for (const d of sorted) {
      const cat = d.category ? String(d.category) : 'other';
      if (t) {
        const match =
          String(d.name || '').toLowerCase().includes(t) ||
          String(d.code || '').toLowerCase().includes(t);
        if (!match) continue;
      }
      if (!map[cat]) map[cat] = [];
      map[cat].push(d);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [activeDrugs, q]);

  const catLabel = (cat) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, width: '100%' }}>
      <input
        type="search"
        placeholder="Search drugs…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ ...inputStyle(), fontSize: 11, padding: '5px 8px' }}
        disabled={disabled}
        autoComplete="off"
      />
      <div style={{
        border: '1px solid var(--bdr)',
        borderRadius: 6,
        maxHeight: 360,
        overflowY: 'auto',
        background: 'var(--bg)',
        padding: '4px 0',
      }}>
        {groups.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--txt3)', padding: '8px 12px' }}>No drugs match</div>
        ) : groups.map(([cat, catDrugs]) => {
          const isOpen = q.trim() ? true : !collapsed[cat];
          const allChecked = catDrugs.every((d) => sel.has(String(d.id)));
          const someChecked = !allChecked && catDrugs.some((d) => sel.has(String(d.id)));
          return (
            <div key={cat}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: 'var(--bg2)',
                borderBottom: '1px solid var(--bdr)',
                borderTop: '1px solid var(--bdr)',
                position: 'sticky', top: 0, zIndex: 1,
              }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={() => !disabled && toggleAll(catDrugs)}
                  disabled={disabled}
                  title={`Select all ${catLabel(cat)}`}
                />
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  style={{
                    flex: 1, textAlign: 'left', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    color: 'var(--blu)', padding: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span>{catLabel(cat)}</span>
                  <span style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 400 }}>
                    {catDrugs.filter((d) => sel.has(String(d.id))).length}/{catDrugs.length}
                    {' '}{isOpen ? '▲' : '▼'}
                  </span>
                </button>
              </div>
              {/* Drug rows */}
              {isOpen && catDrugs.map((d) => (
                <label
                  key={d.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, cursor: disabled ? 'default' : 'pointer',
                    padding: '4px 10px 4px 26px',
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sel.has(String(d.id))}
                    onChange={() => !disabled && toggle(d.id)}
                    disabled={disabled}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`${d.code || ''} — ${d.name || ''}`}>
                    {d.name}{d.code ? ` (${d.code})` : ''}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{sel.size} selected</div>
    </div>
  );
}

/** Multi-select institution types: removable tags + dropdown to add more. */
function InstitutionTypeMultiDropdown({ types, value, onChange, disabled }) {
  const sel = useMemo(() => new Set((value || []).map(String)), [value]);
  const selectedRows = useMemo(
    () => (types || []).filter((t) => t.is_active !== false && sel.has(String(t.id))),
    [types, sel]
  );
  const remove = (id) => onChange((value || []).filter((x) => String(x) !== String(id)));
  const add = (id) => {
    const idStr = String(id);
    if (!idStr || sel.has(idStr)) return;
    onChange([...(value || []), idStr]);
  };
  const clearAll = () => onChange([]);

  return (
    <div
      style={{
        border: '1px solid var(--bdr)',
        borderRadius: 8,
        minHeight: TABLE_CTRL.minHeight,
        padding: '4px 8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        background: 'var(--bg)',
        boxSizing: 'border-box',
      }}
    >
      {selectedRows.map((t) => (
        <span
          key={t.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: 'var(--blu-lt)',
            color: 'var(--blu)',
            border: '1px solid var(--blu-bdr)',
          }}
        >
          {t.code || t.name}
          {!disabled && (
            <button
              type="button"
              aria-label={`Remove ${t.code || t.name}`}
              onClick={() => remove(t.id)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--blu)',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
                fontSize: 14,
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) add(v);
          e.target.value = '';
        }}
        disabled={disabled}
        style={{ ...inputStyle(), ...TABLE_CTRL, flex: '1 1 100px', minWidth: 100, fontSize: 12, padding: '6px 8px' }}
      >
        <option value="">Add institution type…</option>
        {(types || [])
          .filter((t) => t.is_active !== false && !sel.has(String(t.id)))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.code ? `${t.code} — ${t.name}` : t.name}
            </option>
          ))}
      </select>
      {sel.size > 0 && !disabled && (
        <button
          type="button"
          onClick={clearAll}
          title="Clear all"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--txt3)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 4px',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

const BUDGET_HDR_LABEL = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--txt2)',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  lineHeight: 1.25,
  margin: 0,
  paddingBottom: 2,
};

export default function BudgetAllocationsPage({ config, onBack }) {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toolbarFyId, setToolbarFyId] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [formHeader, setFormHeader] = useState({
    institution_type_ids: [],
    financial_year_id: '',
    scheme_id: '',
    quarter_id: '',
    total_budget_cap: '',
  });
  const [formLines, setFormLines] = useState(() => [emptyFormLine()]);
  const [drugPickerLineKey, setDrugPickerLineKey] = useState(null);
  const [drugPickerDraft, setDrugPickerDraft] = useState([]);
  const [drugPopupDrugs, setDrugPopupDrugs] = useState(null); // { label, drugs: string[] }

  const closeForm = () => {
    setShowForm(false);
    setEditRow(null);
    setDrugPickerLineKey(null);
    setDrugPickerDraft([]);
    setFormHeader({
      institution_type_ids: [],
      financial_year_id: '',
      scheme_id: '',
      quarter_id: '',
      total_budget_cap: '',
    });
    setFormLines([emptyFormLine()]);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, toolbarFyId]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['setting', 'budget-allocations'],
    queryFn: async () => {
      const { data } = await syncManager.api.get(BASE);
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const optionKeys = ['financial-years', 'quarters', 'drugs', 'institution-types', 'schemes'];
  const fyQ = useQuery({
    queryKey: ['setting', 'financial-years'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/financial-years');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline,
    staleTime: 60_000,
  });
  const quartersQ = useQuery({
    queryKey: ['setting', 'quarters'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/quarters');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline,
    staleTime: 60_000,
  });
  const drugsQ = useQuery({
    queryKey: ['setting', 'drugs'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/drugs');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && showForm,
    staleTime: 60_000,
  });
  const institutionTypesQ = useQuery({
    queryKey: ['setting', 'institution-types'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/institution-types');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && showForm,
    staleTime: 60_000,
  });
  const schemesQ = useQuery({
    queryKey: ['setting', 'schemes'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/schemes');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && showForm,
    staleTime: 60_000,
  });
  const formTypesQ = useQuery({
    queryKey: ['setting', 'form-types'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/form-types');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && showForm,
    staleTime: 60_000,
  });

  const financialYears = fyQ.data || [];
  const quarters = quartersQ.data || [];
  const drugs = drugsQ.data || [];
  const institutionTypes = institutionTypesQ.data || [];
  const schemesList = schemesQ.data || [];
  const formTypeOptions = useMemo(() => {
    const names = (formTypesQ.data || [])
      .map((r) => (r.name != null ? String(r.name).trim() : ''))
      .filter(Boolean);
    const uniq = [...new Set(names)].sort((a, b) => a.localeCompare(b));
    return uniq.length ? uniq : FORM_TYPE_FALLBACK;
  }, [formTypesQ.data]);

  const modalQuarters = useMemo(() => {
    if (!formHeader.financial_year_id) return quarters;
    return quarters.filter((q) => String(q.financial_year_id || '') === String(formHeader.financial_year_id));
  }, [quarters, formHeader.financial_year_id]);

  /** Prefer schemes tied to the selected FY; if none, list all active schemes so save is not blocked. */
  const { schemeSelectOptions, schemeSelectHint } = useMemo(() => {
    if (!formHeader.financial_year_id) {
      return { schemeSelectOptions: schemesList, schemeSelectHint: null };
    }
    const forFy = schemesList.filter(
      (s) => String(s.financial_year_id || '') === String(formHeader.financial_year_id)
    );
    if (forFy.length > 0) {
      return { schemeSelectOptions: forFy, schemeSelectHint: null };
    }
    return {
      schemeSelectOptions: schemesList,
      schemeSelectHint: schemesList.length > 0
        ? 'No scheme is linked to this financial year in Settings → Scheme. Showing all schemes — pick one or leave blank.'
        : 'Add schemes under Settings → Scheme, or leave this blank to save without a scheme.',
    };
  }, [schemesList, formHeader.financial_year_id]);

  const linesBudgetSum = useMemo(
    () => formLines.reduce((s, L) => s + num(L.budget_amount === '' || L.budget_amount == null ? 0 : L.budget_amount), 0),
    [formLines]
  );
  const headerCapNum = formHeader.total_budget_cap === '' || formHeader.total_budget_cap == null
    ? null
    : num(formHeader.total_budget_cap);
  const headerRemaining = headerCapNum != null && Number.isFinite(headerCapNum) && headerCapNum >= 0
    ? Math.max(0, headerCapNum - linesBudgetSum)
    : null;

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (toolbarFyId && String(r.financial_year_id || '') !== String(toolbarFyId)) return false;
      if (q) {
        const blob = [
          r.district_name,
          r.scheme_name,
          r.form_type,
          r.drugs_label,
          r.fy_label,
          r.quarter_no,
          r.institution_type_name,
          r.institution_type_code,
          r.institution_types_label,
          r.division_label,
        ].map((x) => String(x ?? '').toLowerCase()).join(' ');
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, toolbarFyId, debouncedSearch]);

  const groupedRows = useMemo(() => {
    const m = new Map();
    filtered.forEach(r => {
      const instKey = r.institution_type_code || r.institution_type_name || 'Other';
      if (!m.has(instKey)) {
        m.set(instKey, {
          _key: instKey,
          _instCode: r.institution_type_code,
          _instName: r.institution_type_name,
          _instLabel: r.institution_types_label,
          formTypes: new Set(),
          drugsSet: new Set(),
          budget_amount: 0,
          spent_amount: 0,
          fy_label: r.fy_label,
          quarter_no: r.quarter_no,
          district_name: r.district_name,
          rows: [],
        });
      }
      const e = m.get(instKey);
      if (r.form_type?.trim()) e.formTypes.add(r.form_type.trim());
      if (r.drugs_label) r.drugs_label.split(',').map(d => d.trim()).filter(Boolean).forEach(d => e.drugsSet.add(d));
      e.budget_amount += num(r.budget_amount);
      e.spent_amount += num(r.spent_amount);
      e.rows.push(r);
    });
    return Array.from(m.values()).map(g => ({
      ...g,
      formTypes: Array.from(g.formTypes),
      drugs: Array.from(g.drugsSet),
    }));
  }, [filtered]);

  const schemeCards = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const inst = (r.institution_types_label && String(r.institution_types_label).trim())
        || [r.institution_type_code, r.institution_type_name].filter(Boolean).join(' ').trim();
      const k = [inst, (r.form_type && String(r.form_type).trim()) || (r.scheme_name && String(r.scheme_name).trim())]
        .filter(Boolean)
        .join(' · ') || 'Other / unassigned';
      if (!m.has(k)) m.set(k, { budget: 0, spent: 0 });
      const e = m.get(k);
      e.budget += num(r.budget_amount);
      e.spent += num(r.spent_amount);
    });
    return Array.from(m.entries()).map(([planType, { budget, spent }]) => ({
      planType,
      budget,
      spent,
      pct: utilizationPct(budget, spent),
    }));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const saveMutation = useMutation({
    mutationFn: async ({ header, lines, editRow: er }) => {
      const buildPayload = (line) => ({
        district_id: er?.id && er.district_id != null ? String(er.district_id) : null,
        scheme_id: header.scheme_id?.trim() ? header.scheme_id.trim() : null,
        financial_year_id: header.financial_year_id?.trim() ? header.financial_year_id : null,
        quarter_id: header.quarter_id?.trim() ? header.quarter_id : null,
        division_label: er?.id && er.division_label != null && String(er.division_label).trim()
          ? String(er.division_label).trim()
          : null,
        institution_type_ids: Array.isArray(header.institution_type_ids) ? header.institution_type_ids.map(String) : [],
        header_total_budget: num(header.total_budget_cap),
        form_type: line.form_type?.trim() || null,
        drug_ids: Array.isArray(line.drug_ids) ? line.drug_ids.map(String) : [],
        budget_amount: num(line.budget_amount),
        allocated_pct: num(line.allocated_pct),
        spent_amount: num(line.spent_amount),
      });
      if (er?.id) {
        await syncManager.api.put(`${BASE}/${encodeURIComponent(er.id)}`, buildPayload(lines[0]));
        return { mode: 'edit' };
      }
      let count = 0;
      for (const line of lines) {
        if (!line.form_type?.trim()) continue;
        await syncManager.api.post(BASE, buildPayload(line));
        count += 1;
      }
      return { mode: 'add', count };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['setting', 'budget-allocations'] });
      optionKeys.forEach((k) => qc.invalidateQueries({ queryKey: ['setting', k] }));
      closeForm();
      if (res?.mode === 'add') {
        toast.success(res.count ? `${res.count} allocation(s) saved` : 'Saved');
      } else {
        toast.success(`${config.label} updated`);
      }
    },
    onError: (err) => {
      const d = err.response?.data;
      const msg = (typeof d?.error === 'string' && d.error)
        || (typeof d?.detail === 'string' && d.detail)
        || err.message
        || 'Save failed';
      toast.error(msg);
    },
  });

  const handleSaveForm = () => {
    if (!formHeader.institution_type_ids?.length) {
      toast.error('Select at least one type of institution');
      return;
    }
    if (!formHeader.financial_year_id?.trim()) {
      toast.error('Financial year is required');
      return;
    }
    if (!formHeader.quarter_id?.trim()) {
      toast.error('Quarter is required');
      return;
    }
    if (formHeader.total_budget_cap === '' || formHeader.total_budget_cap == null || num(formHeader.total_budget_cap) < 0) {
      toast.error('Total budget is required');
      return;
    }
    const linesToUse = editRow ? formLines : formLines.filter((l) => l.form_type?.trim());
    if (!linesToUse.length) {
      toast.error('Select a form type on at least one row');
      return;
    }
    if (editRow && !linesToUse[0]?.form_type?.trim()) {
      toast.error('Form type is required');
      return;
    }
    if (headerCapNum != null && linesBudgetSum > headerCapNum + 0.001) {
      toast.error(`Lines total (${formatRs(linesBudgetSum)}) exceeds total budget (${formatRs(headerCapNum)})`);
      return;
    }
    saveMutation.mutate({ header: formHeader, lines: linesToUse, editRow });
  };

  const updateLine = (key, patch) => {
    const cap = num(formHeader.total_budget_cap);
    setFormLines((prev) => prev.map((L) => {
      if (L.key !== key) return L;
      const next = { ...L, ...patch };
      if ('budget_amount' in patch && cap > 0) {
        next.allocated_pct = patch.budget_amount === '' ? '' : parseFloat(((num(patch.budget_amount) / cap) * 100).toFixed(2));
      } else if ('allocated_pct' in patch && cap > 0) {
        next.budget_amount = patch.allocated_pct === '' ? '' : parseFloat(((num(patch.allocated_pct) / 100) * cap).toFixed(2));
      }
      return next;
    }));
  };

  const removeLine = (key) => {
    setFormLines((prev) => (prev.length <= 1 ? prev : prev.filter((L) => L.key !== key)));
    setDrugPickerLineKey((k) => (k === key ? null : k));
  };

  const openDrugPicker = (line) => {
    setDrugPickerLineKey(line.key);
    setDrugPickerDraft(Array.isArray(line.drug_ids) ? line.drug_ids.map(String) : []);
  };

  const closeDrugPicker = () => {
    setDrugPickerLineKey(null);
    setDrugPickerDraft([]);
  };

  const applyDrugPicker = () => {
    if (drugPickerLineKey) {
      updateLine(drugPickerLineKey, { drug_ids: [...drugPickerDraft] });
    }
    closeDrugPicker();
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await syncManager.api.delete(`${BASE}/${encodeURIComponent(id)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setting', 'budget-allocations'] });
      toast.success('Record removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Delete failed'),
  });

  const openAdd = () => {
    setDrugPickerLineKey(null);
    setDrugPickerDraft([]);
    setFormHeader({
      institution_type_ids: [],
      financial_year_id: '',
      scheme_id: '',
      quarter_id: '',
      total_budget_cap: '',
    });
    setFormLines([emptyFormLine()]);
    setEditRow(null);
    setShowForm(true);
  };

  const openEdit = (row) => {
    let instIds = [];
    if (Array.isArray(row.institution_type_ids) && row.institution_type_ids.length) {
      instIds = row.institution_type_ids.map(String);
    } else if (row.institution_type_id) {
      instIds = [String(row.institution_type_id)];
    }
    const cap = row.header_total_budget;
    setDrugPickerLineKey(null);
    setDrugPickerDraft([]);
    setFormHeader({
      institution_type_ids: instIds,
      financial_year_id: row.financial_year_id != null ? String(row.financial_year_id) : '',
      scheme_id: row.scheme_id != null ? String(row.scheme_id) : '',
      quarter_id: row.quarter_id != null ? String(row.quarter_id) : '',
      total_budget_cap: cap != null && cap !== '' ? String(cap) : '',
    });
    setFormLines([{
      key: String(row.id),
      form_type: row.form_type != null ? String(row.form_type) : (row.scheme_name ? String(row.scheme_name) : ''),
      drug_ids: Array.isArray(row.drug_ids) ? row.drug_ids.map(String) : [],
      allocated_pct: num(row.allocated_pct),
      budget_amount: num(row.budget_amount),
      spent_amount: num(row.spent_amount),
    }]);
    setEditRow(row);
    setShowForm(true);
  };

  return (
    <PageWrap>
      <PageHead
        title={config.label}
        subtitle={`${config.section} · ${filtered.length} of ${rows.length} records`}
        crumbs={['Home', 'Settings', config.label]}
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>
            <Btn variant="success" size="sm" onClick={openAdd}>+ Add new allocation</Btn>
          </>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--blu)',
          marginBottom: 10,
          fontFamily: 'var(--fd)',
        }}
        >
          A. Unit budget allocation information
        </div>
        <Card>
          {isLoading ? (
            <div style={{ padding: 'clamp(12px,1.2vw,18px)', fontSize: 12, color: 'var(--txt3)' }}>Loading summary…</div>
          ) : schemeCards.length === 0 ? (
              <div style={{ padding: 'clamp(12px,1.2vw,18px)', fontSize: 12, color: 'var(--txt3)' }}>
                {rows.length === 0
                  ? 'No allocations yet. Use Add new allocation to create records.'
                  : 'No rows match your search or financial year filter.'}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12,
                padding: 'clamp(12px,1.2vw,18px)',
              }}
              >
                {schemeCards.map((c) => (
                  <div
                    key={c.planType}
                    style={{
                      border: '1px solid var(--bdr)',
                      borderRadius: 10,
                      padding: 12,
                      background: 'var(--bg1)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blu)', marginBottom: 8, lineHeight: 1.3 }}>
                      {c.planType}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>Budget allocation (Rs)</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--fm)', marginBottom: 8 }}>{formatRs(c.budget)}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>Budget used (Rs)</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--fm)', marginBottom: 8 }}>{formatRs(c.spent)}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 4 }}>Utilization</div>
                    <UtilBar pct={c.pct} />
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--blu)',
          marginBottom: 10,
          fontFamily: 'var(--fd)',
        }}
        >
          B. Budget allocation / management
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 400 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt4)', fontSize: 13 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search district, scheme, or financial year…"
              style={{ ...inputStyle(), paddingLeft: 32, width: '100%' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt2)' }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Select financial year</span>
            <select
              value={toolbarFyId}
              onChange={(e) => setToolbarFyId(e.target.value)}
              style={{ ...inputStyle(), minWidth: 140, fontSize: 12 }}
            >
              <option value="">All years</option>
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>{fy.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Card>
        {!isOnline
          ? <EmptyState icon="📡" title="Offline" message="Go online to manage budget allocations." />
          : (
            <>
              <DataTable
                loading={isLoading}
                data={groupedRows}
                emptyMsg="No budget allocations match your search or year filter"
                columns={[
                  {
                    header: 'S.No',
                    key: '_sno',
                    render: (_, __, i) => (
                      <span style={{ color: 'var(--txt4)', fontSize: 11 }}>{(i ?? 0) + 1}</span>
                    ),
                  },
                  {
                    header: 'Institution',
                    key: '_instCode',
                    render: (_, row) => {
                      const label = row._instLabel?.trim() || [row._instCode, row._instName].filter(Boolean).join(' — ') || '—';
                      return <BadgeLike>{label}</BadgeLike>;
                    },
                  },
                  {
                    header: 'Form Types',
                    key: 'formTypes',
                    render: (v) => (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(v || []).length ? (v).map((ft, i) => <BadgeLike key={i}>{ft}</BadgeLike>) : <span style={{ fontSize: 12, color: 'var(--txt4)' }}>—</span>}
                      </div>
                    ),
                  },
                  {
                    header: 'Drugs',
                    key: 'drugs',
                    render: (drugs, row) => {
                      if (!drugs?.length) return <span style={{ fontSize: 12, color: 'var(--txt4)' }}>—</span>;
                      return (
                        <button onClick={() => setDrugPopupDrugs({ label: row._instCode, drugs })}
                          style={{ background: 'var(--blu-lt)', border: '1px solid var(--blu-bdr)', color: 'var(--blu)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fb)', whiteSpace: 'nowrap' }}>
                          {drugs.length} drug{drugs.length !== 1 ? 's' : ''} →
                        </button>
                      );
                    },
                  },
                  {
                    header: 'Financial year',
                    key: 'fy_label',
                    render: (v) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
                  },
                  {
                    header: 'Quarter',
                    key: 'quarter_no',
                    render: (v) => {
                      const roman = QUARTER_ROMAN[Number(v) - 1];
                      return <span style={{ fontSize: 12 }}>{roman != null ? roman : (v != null ? String(v) : '—')}</span>;
                    },
                  },
                  {
                    header: 'Total Budget (Rs)',
                    key: 'budget_amount',
                    render: (v) => <span style={{ fontSize: 12, fontFamily: 'var(--fm)', fontWeight: 600 }}>{formatRs(num(v))}</span>,
                  },
                  {
                    header: 'Spent (Rs)',
                    key: 'spent_amount',
                    render: (v) => <span style={{ fontSize: 12, fontFamily: 'var(--fm)' }}>{formatRs(num(v))}</span>,
                  },
                  {
                    header: 'Remaining',
                    key: '_rem',
                    render: (_, row) => {
                      const rem = num(row.budget_amount) - num(row.spent_amount);
                      const neg = rem < 0;
                      return (
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'var(--fm)', background: neg ? 'var(--red-lt)' : 'var(--grn-lt)', color: neg ? 'var(--red)' : 'var(--grn)', border: `1px solid ${neg ? 'var(--red-bdr)' : 'var(--grn-bdr)'}` }}>
                          {formatRs(rem)}
                        </span>
                      );
                    },
                  },
                  {
                    header: 'Utilization',
                    key: '_util',
                    render: (_, row) => <UtilBar pct={utilizationPct(row.budget_amount, row.spent_amount)} />,
                  },
                  {
                    header: 'Action',
                    key: '_act',
                    render: (_, row) => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {row.rows?.length === 1 && (
                          <>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(row.rows[0])}
                          style={{ width: 32, height: 28, borderRadius: 6, border: '1px solid var(--blu-bdr)', background: 'var(--blu-lt)', color: 'var(--blu)', cursor: 'pointer', fontSize: 14 }}
                        >✎</button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            const rid = row.rows[0]?.id != null ? String(row.rows[0].id).trim() : '';
                            if (!rid) {
                              toast.error('Missing record id');
                              return;
                            }
                            if (window.confirm('Delete this allocation?')) deleteMutation.mutate(rid);
                          }}
                          style={{
                            width: 32,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid var(--red-bdr)',
                            background: 'var(--red-lt)',
                            color: 'var(--red)',
                            cursor: 'pointer',
                            fontSize: 14,
                          }}
                        >
                          🗑
                        </button>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
              {groupedRows.length > 0 && (
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bdr)', background: 'var(--bg1)', fontSize: 11, color: 'var(--txt3)' }}>
                  {groupedRows.length} institution group{groupedRows.length !== 1 ? 's' : ''} · {filtered.length} total allocation{filtered.length !== 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
      </Card>

      {/* Drugs popup */}
      {drugPopupDrugs && (
        <div onClick={e => e.target === e.currentTarget && setDrugPopupDrugs(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--sh3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{drugPopupDrugs.label} — Drugs ({drugPopupDrugs.drugs.length})</div>
              <button onClick={() => setDrugPopupDrugs(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--txt3)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {drugPopupDrugs.drugs.map((d, i) => (
                  <span key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--txt)' }}>{d}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setDrugPopupDrugs(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <>
        <Modal
          title={editRow ? `Edit ${config.label}` : 'Add Budget Allocation'}
          sub={editRow ? undefined : 'Add institution types from the dropdown, then add lines. Open Select drugs in a popup to choose items. Totals and remaining budget are at the bottom.'}
          onClose={closeForm}
          closeOnEscape={!drugPickerLineKey}
          size="xl"
          footer={(
            <>
              <Btn variant="ghost" onClick={closeForm}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSaveForm} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : '✓ Save'}
              </Btn>
            </>
          )}
        >
          <div style={{
            overflowX: 'auto',
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: '1px solid var(--bdr)',
          }}
          >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.35fr) minmax(112px, 0.75fr) minmax(128px, 0.9fr) minmax(128px, 0.9fr) minmax(104px, 0.75fr)',
            columnGap: 12,
            rowGap: 6,
            minWidth: 560,
          }}
          >
            <label style={BUDGET_HDR_LABEL}>
              Type of Institution<span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <label style={BUDGET_HDR_LABEL}>
              Financial Year<span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <label style={BUDGET_HDR_LABEL}>
              Scheme
            </label>
            <label style={BUDGET_HDR_LABEL}>
              Quarter<span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <label style={BUDGET_HDR_LABEL}>
              Total Budget<span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <div style={{ minWidth: 0 }}>
              <InstitutionTypeMultiDropdown
                types={institutionTypes}
                value={formHeader.institution_type_ids}
                onChange={(ids) => setFormHeader((h) => ({ ...h, institution_type_ids: ids }))}
                disabled={!isOnline}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <select
                value={formHeader.financial_year_id}
                onChange={(e) => setFormHeader((h) => ({
                  ...h,
                  financial_year_id: e.target.value,
                  quarter_id: '',
                  scheme_id: '',
                }))}
                style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px' }}
              >
                <option value="">Select financial year…</option>
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>{fy.label}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 0 }}>
              <select
                value={formHeader.scheme_id}
                onChange={(e) => setFormHeader((h) => ({ ...h, scheme_id: e.target.value }))}
                style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px' }}
                disabled={!formHeader.financial_year_id}
              >
                <option value="">
                  {formHeader.financial_year_id ? '(Optional) No scheme' : 'Select financial year first…'}
                </option>
                {schemeSelectOptions.map((s) => {
                  const fy = s.financial_year || s.financial_year_label;
                  const suffix = fy && String(s.financial_year_id || '') !== String(formHeader.financial_year_id)
                    ? ` · ${fy}`
                    : '';
                  return (
                    <option key={s.id} value={s.id}>{`${s.name || 'Scheme'}${suffix}`}</option>
                  );
                })}
              </select>
              {schemeSelectHint ? (
                <div style={{ fontSize: 9, color: 'var(--txt3)', marginTop: 4, lineHeight: 1.35 }}>
                  {schemeSelectHint}
                </div>
              ) : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <select
                value={formHeader.quarter_id}
                onChange={(e) => setFormHeader((h) => ({ ...h, quarter_id: e.target.value }))}
                style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px' }}
                disabled={!!formHeader.financial_year_id && modalQuarters.length === 0}
              >
                <option value="">Select quarter…</option>
                {(formHeader.financial_year_id ? modalQuarters : quarters).map((q) => (
                  <option key={q.id} value={q.id}>
                    Q{QUARTER_ROMAN[Number(q.quarter_no) - 1] || q.quarter_no}{q.fy_label ? ` · ${q.fy_label}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 0 }}>
              <input
                type="number"
                min={0}
                step="any"
                value={formHeader.total_budget_cap}
                onChange={(e) => setFormHeader((h) => ({ ...h, total_budget_cap: e.target.value }))}
                placeholder="0"
                style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px' }}
              />
            </div>
          </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 10 }}>
            Budget allocation lines
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '17%' }} />
                {!editRow && formLines.length > 1 ? <col style={{ width: '7%' }} /> : null}
              </colgroup>
              <thead>
                <tr>
                  <th style={{
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '0 10px 8px 0',
                    verticalAlign: 'bottom',
                    lineHeight: 1.2,
                  }}
                  >
                    Form type
                  </th>
                  <th style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '0 8px 8px',
                    verticalAlign: 'bottom',
                    lineHeight: 1.2,
                  }}
                  >
                    Budget %
                  </th>
                  <th style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '0 8px 8px',
                    verticalAlign: 'bottom',
                    lineHeight: 1.2,
                  }}
                  >
                    Budget amount
                  </th>
                  <th style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '0 8px 8px',
                    verticalAlign: 'bottom',
                    lineHeight: 1.2,
                  }}
                  >
                    Allocated
                  </th>
                  <th style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    padding: '0 8px 8px',
                    verticalAlign: 'bottom',
                    lineHeight: 1.2,
                  }}
                  >
                    Drugs
                  </th>
                  {!editRow && formLines.length > 1 ? (
                    <th style={{ padding: '0 0 8px', verticalAlign: 'bottom', lineHeight: 1.2 }} aria-label="Row actions" />
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {formLines.map((line) => {
                  const nDrugs = Array.isArray(line.drug_ids) ? line.drug_ids.length : 0;
                  const rowPad = { verticalAlign: 'middle', padding: '10px 8px' };
                  const ctrl = { ...inputStyle(), ...TABLE_CTRL, background: 'var(--bg1)', padding: '8px 10px' };
                  return (
                    <tr key={line.key}>
                      <td style={{ ...rowPad, paddingLeft: 0, paddingRight: 10, textAlign: 'left' }}>
                        <select
                          value={line.form_type}
                          onChange={(e) => updateLine(line.key, { form_type: e.target.value })}
                          style={{ ...ctrl, width: '100%' }}
                        >
                          <option value="">Select…</option>
                          {formTypeOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...rowPad, textAlign: 'center' }}>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={line.allocated_pct}
                          onChange={(e) => updateLine(line.key, { allocated_pct: e.target.value === '' ? '' : num(e.target.value) })}
                          style={{ ...ctrl, width: '100%', maxWidth: 96, textAlign: 'center', margin: '0 auto', display: 'block' }}
                        />
                      </td>
                      <td style={{ ...rowPad, textAlign: 'center' }}>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={line.budget_amount}
                          onChange={(e) => updateLine(line.key, { budget_amount: e.target.value === '' ? '' : num(e.target.value) })}
                          style={{ ...ctrl, width: '100%', maxWidth: 112, textAlign: 'center', margin: '0 auto', display: 'block' }}
                        />
                      </td>
                      <td style={{ ...rowPad, textAlign: 'center' }}>
                        {(() => {
                          const amt = num(line.budget_amount) || 0;
                          const pctVal = line.allocated_pct === '' || line.allocated_pct == null ? 0 : num(line.allocated_pct);
                          const totalOver = headerCapNum > 0 && linesBudgetSum > headerCapNum;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, justifyContent: 'center', minHeight: TABLE_CTRL.minHeight }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: totalOver ? 'var(--red)' : 'var(--grn)' }}>
                                {pctVal}%
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>
                                {formatRs(amt)}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ ...rowPad, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openDrugPicker(line)}
                          disabled={!isOnline}
                          style={{
                            ...TABLE_CTRL,
                            padding: '0 12px',
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: 'var(--fb)',
                            borderRadius: 8,
                            border: '1px solid var(--blu-bdr)',
                            background: 'var(--bg1)',
                            color: 'var(--blu)',
                            cursor: !isOnline ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            maxWidth: 168,
                          }}
                        >
                          {nDrugs > 0 ? `Drugs (${nDrugs})` : 'Select drugs'}
                        </button>
                      </td>
                      {!editRow && formLines.length > 1 ? (
                        <td style={{ ...rowPad, paddingRight: 0, textAlign: 'center' }}>
                          <button
                            type="button"
                            title="Remove row"
                            onClick={() => removeLine(line.key)}
                            style={{
                              ...TABLE_CTRL,
                              padding: '0 10px',
                              fontSize: 11,
                              borderRadius: 6,
                              border: '1px solid var(--red-bdr)',
                              background: 'var(--red-lt)',
                              color: 'var(--red)',
                              cursor: 'pointer',
                              fontFamily: 'var(--fb)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!editRow && (
            <div style={{ marginTop: 16 }}>
              <Btn variant="outline" size="sm" type="button" onClick={() => setFormLines((prev) => [...prev, emptyFormLine()])}>
                + Add more
              </Btn>
            </div>
          )}

          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--bdr)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            alignItems: 'start',
          }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                Total amount
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--txt)' }}>{formatRs(linesBudgetSum)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                Remaining budget
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--fm)', color: headerCapNum > 0 && linesBudgetSum > headerCapNum ? 'var(--red)' : 'var(--txt)' }}>
                {headerRemaining != null ? formatRs(headerRemaining) : '—'}
              </div>
            </div>
            {headerCapNum > 0 && linesBudgetSum > headerCapNum && (
              <div style={{ gridColumn: '1 / -1', padding: '8px 12px', background: 'var(--red-lt, #fff0f0)', border: '1px solid var(--red)', borderRadius: 7, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
                Combined total ({formatRs(linesBudgetSum)}) exceeds total budget ({formatRs(headerCapNum)}) by {formatRs(linesBudgetSum - headerCapNum)}
              </div>
            )}
          </div>
        </Modal>

        {drugPickerLineKey ? (
          <Modal
            title="Select drugs"
            sub="Search and tick drugs for this line, then Apply."
            onClose={closeDrugPicker}
            zIndex={1100}
            size="md"
            footer={(
              <>
                <Btn variant="ghost" onClick={closeDrugPicker}>Cancel</Btn>
                <Btn variant="primary" onClick={applyDrugPicker}>Apply</Btn>
              </>
            )}
          >
            <DrugMultiSelect
              drugs={drugs}
              value={drugPickerDraft}
              onChange={setDrugPickerDraft}
              disabled={!isOnline}
            />
          </Modal>
        ) : null}
        </>
      )}
    </PageWrap>
  );
}

function BadgeLike({ children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      background: 'var(--blu-lt)',
      color: 'var(--blu)',
      border: '1px solid var(--blu-bdr)',
      maxWidth: 220,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
    }}
    title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  );
}
