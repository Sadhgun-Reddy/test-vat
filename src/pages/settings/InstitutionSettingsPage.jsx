// src/pages/settings/InstitutionSettingsPage.jsx
// Institution Mapping:
//   [District ▾] | [PVC + Institution ▾] | [SC(AH) + Institution ▾] | [☑ Village checkboxes]
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, Card, DataTable, Badge, Btn, Modal } from '../../components/ui';
import toast from 'react-hot-toast';

/* ── shared styles ─────────────────────────────────────────────────────── */
const sel = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid var(--bdr2)', fontSize: 12, fontFamily: 'var(--fb)',
  color: 'var(--txt)', background: 'var(--bg)', outline: 'none', cursor: 'pointer',
};
const inp = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid var(--bdr2)', fontSize: 12, fontFamily: 'var(--fb)',
  color: 'var(--txt)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
};
const colHead = {
  fontSize: 11, fontWeight: 700, color: 'var(--txt2)',
  background: 'var(--bg1)', padding: '8px 12px',
  borderBottom: '1px solid var(--bdr)', letterSpacing: '.03em',
};
const colLbl = { fontSize: 10, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4, display: 'block' };

/* ── Village checkbox list ─────────────────────────────────────────────── */
function VillageCheckList({ villages, selected, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = villages.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
  const allChecked = filtered.length > 0 && filtered.every(v => selected.has(v.id));

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) filtered.forEach(v => next.delete(v.id));
    else filtered.forEach(v => next.add(v.id));
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search villages…"
        style={{ ...inp, marginBottom: 6, fontSize: 11 }}
      />
      {filtered.length > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'var(--blu)', cursor: 'pointer' }}>
          <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 14, height: 14 }} />
          Select All ({filtered.length})
        </label>
      )}
      <div style={{ overflowY: 'auto', flex: 1, maxHeight: 260 }}>
        {filtered.length === 0
          ? <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0' }}>
              {villages.length === 0 ? 'Select a mandal first' : 'No villages found'}
            </p>
          : filtered.map(v => (
            <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 2px', cursor: 'pointer', borderRadius: 4 }}>
              <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} style={{ width: 13, height: 13, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--txt)' }}>{v.name}</span>
            </label>
          ))
        }
      </div>
      {selected.size > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--blu)', fontWeight: 600 }}>
          {selected.size} village{selected.size > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  district_id: '', mandal_id: '',
  pvc_institution_id: '',  pvc_name: '',
  scah_institution_id: '', scah_name: '',
  villageIds: new Set(),
};

export default function InstitutionSettingsPage({ onBack }) {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const cardRef = useRef(null); // scroll-to ref for edit

  /* form state */
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editRow, setEditRow] = useState(null);
  const [delRow, setDelRow]   = useState(null);
  /* table filters */
  const [fDistrict, setFDistrict] = useState('');
  const [fType,     setFType]     = useState('');
  const [fSearch,   setFSearch]   = useState('');
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 50;

  /* ── master queries ─────────────────────────────────────────────────── */
  const { data: districts = [] } = useQuery({
    queryKey: ['inst-districts'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/districts?limit=100');
      return data.districts || data || [];
    },
    enabled: isOnline, staleTime: 120_000,
  });

  const { data: allMandals = [] } = useQuery({
    queryKey: ['inst-mandals'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/mandals?limit=2000');
      return data.mandals || data || [];
    },
    enabled: isOnline, staleTime: 120_000,
  });

  const { data: allTowns = [] } = useQuery({
    queryKey: ['inst-towns'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/towns?limit=20000');
      return data.towns || data || [];
    },
    enabled: isOnline, staleTime: 120_000,
  });

  const { data: instTypes = [] } = useQuery({
    queryKey: ['inst-types'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/institution-types');
      return Array.isArray(data) ? data : (data.institution_types || []);
    },
    enabled: isOnline, staleTime: 120_000,
  });

  const { data: allPlaces = [] } = useQuery({
    queryKey: ['inst-places-all'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/places-of-working?limit=2000');
      return data.places_of_working || data.data || [];
    },
    enabled: isOnline, staleTime: 30_000,
  });

  /* ── paginated list query ───────────────────────────────────────────── */
  const { data: listData, isLoading } = useQuery({
    queryKey: ['institutions-list', page, fSearch, fDistrict, fType],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (fSearch.trim()) p.set('search', fSearch.trim());
      if (fDistrict)      p.set('district_id', fDistrict);
      if (fType)          p.set('institution_type_id', fType);
      const { data } = await syncManager.api.get(`/places-of-working?${p}`);
      return data;
    },
    enabled: isOnline, staleTime: 30_000,
  });

  const rows       = listData?.places_of_working || listData?.data || [];
  const total      = listData?.total || rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── institution type lookups ───────────────────────────────────────── */
  const pvcType  = useMemo(() => instTypes.find(t => (t.code || '').toUpperCase() === 'PVC'),           [instTypes]);
  const scahType = useMemo(() => instTypes.find(t => (t.code || '').toUpperCase().includes('SC')),      [instTypes]);

  /* ── derived options for form ───────────────────────────────────────── */
  const formMandals = useMemo(() =>
    form.district_id ? allMandals.filter(m => m.district_id === form.district_id) : [],
    [allMandals, form.district_id]
  );

  const formVillages = useMemo(() =>
    form.mandal_id ? allTowns.filter(t => t.mandal_id === form.mandal_id) : [],
    [allTowns, form.mandal_id]
  );

  // PVC places: when mandal selected → filter by mandal; else filter by district
  const pvcPlaces = useMemo(() => {
    if (!form.district_id || !pvcType) return [];
    return allPlaces.filter(p => {
      if (p.institution_type_id !== pvcType.id) return false;
      if (form.mandal_id) return p.mandal_id === form.mandal_id;
      return p.district_id === form.district_id;
    });
  }, [allPlaces, form.district_id, form.mandal_id, pvcType]);

  // SC(AH) places: same mandal-first logic
  const scahPlaces = useMemo(() => {
    if (!form.district_id || !scahType) return [];
    return allPlaces.filter(p => {
      if (p.institution_type_id !== scahType.id) return false;
      if (form.mandal_id) return p.mandal_id === form.mandal_id;
      return p.district_id === form.district_id;
    });
  }, [allPlaces, form.district_id, form.mandal_id, scahType]);

  /* ── mutations ──────────────────────────────────────────────────────── */
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['institutions-list'] });
    qc.invalidateQueries({ queryKey: ['inst-places-all'] });
    qc.invalidateQueries({ queryKey: ['places-of-working'] });
    qc.invalidateQueries({ queryKey: ['places-of-working-sale'] });
  }, [qc]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editRow) {
        const { data } = await syncManager.api.patch(`/places-of-working/${editRow.id}`, payload);
        return data;
      }
      const { data } = await syncManager.api.post('/places-of-working', payload);
      return data;
    },
    onSuccess: () => {
      invalidate();
      closeForm();
      toast.success(editRow ? 'Institution updated' : 'Institution added');
    },
    onError: err => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await syncManager.api.delete(`/places-of-working/${id}`); },
    onSuccess: () => { invalidate(); setDelRow(null); toast.success('Institution deleted'); },
    onError:   err => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  /* ── form helpers ───────────────────────────────────────────────────── */
  // Cascading reset: district change → clear everything; mandal change → clear villages + institution selections
  const setF = (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v };
    if (k === 'district_id') {
      next.mandal_id = '';
      next.pvc_institution_id = ''; next.pvc_name = '';
      next.scah_institution_id = ''; next.scah_name = '';
      next.villageIds = new Set();
    }
    if (k === 'mandal_id') {
      next.pvc_institution_id = ''; next.pvc_name = '';
      next.scah_institution_id = ''; next.scah_name = '';
      next.villageIds = new Set();
    }
    return next;
  });

  const closeForm = () => { setEditRow(null); setForm(EMPTY_FORM); };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      district_id:         row.district_id || '',
      mandal_id:           row.mandal_id   || '',
      pvc_institution_id:  row.institution_type_id === pvcType?.id  ? row.id : '',
      scah_institution_id: row.institution_type_id === scahType?.id ? row.id : '',
      pvc_name:            row.institution_type_id === pvcType?.id  ? row.name : '',
      scah_name:           row.institution_type_id === scahType?.id ? row.name : '',
      villageIds:          row.town_id ? new Set([row.town_id]) : new Set(),
    });
    // Scroll the mapping card into view
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleSave = () => {
    if (!form.district_id) { toast.error('Select a District'); return; }

    const isPVC  = !!form.pvc_name.trim();
    const isSCAH = !!form.scah_name.trim();

    // In edit mode: allow saving with whichever name field is filled
    if (!isPVC && !isSCAH) {
      toast.error('Enter a PVC or SC(AH) institution name');
      return;
    }

    // If both are filled, save PVC first (or let user do two saves)
    const typeId = isPVC ? pvcType?.id : scahType?.id;
    const name   = isPVC ? form.pvc_name.trim() : form.scah_name.trim();
    const townId = form.villageIds.size === 1 ? [...form.villageIds][0] : null;

    saveMutation.mutate({
      name,
      district_id:         form.district_id,
      mandal_id:           form.mandal_id || null,
      town_id:             townId,
      institution_type_id: typeId || null,
    });
  };

  /* ── type badge color ───────────────────────────────────────────────── */
  const typeBadgeColor = (code) => {
    if (!code) return 'dim';
    const c = code.toUpperCase();
    if (c === 'PVC')        return 'blue';
    if (c.includes('SC'))   return 'green';
    if (c === 'DVH')        return 'purple';
    return 'amber';
  };

  /* ── shared institution column renderer ─────────────────────────────── */
  const InstitutionCol = ({ typeLabel, color, places, idKey, nameKey, placeholder, borderColor, bgColor }) => (
    <div style={{ padding: 16, borderRight: '1px solid var(--bdr)', background: form.district_id ? 'var(--bg)' : 'var(--bg1)' }}>
      <label style={colLbl}>
        <span style={{ background: color, color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700, marginRight: 5 }}>
          {typeLabel}
        </span>
        Institution Name
      </label>

      {!form.district_id ? (
        <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0' }}>← Select a District first</p>
      ) : !form.mandal_id ? (
        <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0' }}>← Select a Mandal to filter</p>
      ) : (
        <>
          {/* Dropdown: existing institutions for this mandal */}
          <label style={{ ...colLbl, marginBottom: 4 }}>
            {places.length > 0
              ? `${typeLabel} in ${formMandals.find(m => m.id === form.mandal_id)?.name || 'Mandal'} (${places.length})`
              : `No existing ${typeLabel} in this Mandal`}
          </label>
          <select
            style={{ ...sel, marginBottom: 8, borderColor: form[idKey] ? color : undefined }}
            value={form[idKey]}
            onChange={e => {
              const id    = e.target.value;
              const found = places.find(p => p.id === id);
              setForm(prev => ({ ...prev, [idKey]: id, [nameKey]: found?.name || '' }));
            }}
            disabled={places.length === 0}
          >
            <option value="">{places.length === 0 ? `— No ${typeLabel} in mandal —` : `— Select existing ${typeLabel} —`}</option>
            {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div style={{ fontSize: 10, color: 'var(--txt3)', textAlign: 'center', margin: '4px 0', letterSpacing: '.02em' }}>
            — or enter new name —
          </div>

          {/* Text input: new / override name */}
          <input
            style={{
              ...inp,
              borderColor: form[nameKey] && !form[idKey] ? color : undefined,
            }}
            value={form[nameKey]}
            onChange={e => setForm(prev => ({ ...prev, [nameKey]: e.target.value, [idKey]: '' }))}
            placeholder={placeholder}
          />

          {/* Existing list preview */}
          {places.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, marginBottom: 4 }}>
                Existing {typeLabel} in mandal
              </div>
              <div style={{ maxHeight: 130, overflowY: 'auto' }}>
                {places.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setForm(prev => ({ ...prev, [idKey]: p.id, [nameKey]: p.name }))}
                    style={{
                      fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      color: form[idKey] === p.id ? color : 'var(--txt2)',
                      borderLeft: `3px solid ${borderColor}`,
                      marginBottom: 3,
                      background: form[idKey] === p.id ? bgColor : 'var(--bg1)',
                      fontWeight: form[idKey] === p.id ? 700 : 400,
                    }}
                  >
                    {p.name}
                    {p.town_name && <span style={{ fontSize: 9, marginLeft: 6, color: 'var(--txt3)' }}>{p.town_name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <PageWrap>
      <PageHead
        title="Institution"
        subtitle="Map institutions (PVC, SC(AH)) to districts, mandals and villages"
        crumbs={['Home', 'Settings', 'Institution']}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>
          </div>
        }
      />

      {/* ═══════════════════════════════════════════════════════════
          HORIZONTAL MAPPING CARD  (4 columns)
      ═══════════════════════════════════════════════════════════ */}
      <div
        ref={cardRef}
        style={{
          background: 'var(--bg)',
          border: editRow ? '2px solid var(--blu)' : '2px solid var(--bdr)',
          borderRadius: 14,
          overflow: 'hidden', marginBottom: 20, boxShadow: 'var(--sh2)',
          scrollMarginTop: 80,
        }}
      >
        {/* Edit mode banner */}
        {editRow && (
          <div style={{
            padding: '8px 16px', background: 'var(--blu)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 12, fontWeight: 600,
          }}>
            <span>✎ Editing: <strong>{editRow.name}</strong></span>
            <button
              onClick={closeForm}
              style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}
            >
              ✕ Cancel Edit
            </button>
          </div>
        )}

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', borderBottom: '2px solid var(--bdr)' }}>
          {[
            { label: 'District Name',             dot: 'var(--blu)'   },
            { label: 'PVC + Institution Name',    dot: 'var(--grn)'   },
            { label: 'SC(AH) + Institution Name', dot: '#8b5cf6'      },
            { label: 'Village Name',              dot: 'var(--amber)' },
          ].map(({ label, dot }, i) => (
            <div key={label} style={{
              ...colHead,
              borderRight: i < 3 ? '1px solid var(--bdr)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        {/* Column bodies */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', minHeight: 340 }}>

          {/* ── Col 1: District + Mandal ────────────────────────── */}
          <div style={{ padding: 16, borderRight: '1px solid var(--bdr)' }}>
            <label style={colLbl}>Select District</label>
            <select style={sel} value={form.district_id} onChange={e => setF('district_id', e.target.value)}>
              <option value="">— Select District —</option>
              {districts.map(d => (
                <option key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ''}</option>
              ))}
            </select>

            {form.district_id && (
              <>
                <label style={{ ...colLbl, marginTop: 12 }}>Select Mandal</label>
                <select style={sel} value={form.mandal_id} onChange={e => setF('mandal_id', e.target.value)}>
                  <option value="">— Select Mandal —</option>
                  {formMandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </>
            )}

            {/* Selection summary pill */}
            {form.district_id && (
              <div style={{
                marginTop: 14, padding: '8px 10px',
                background: 'var(--blu-lt)', borderRadius: 6, border: '1px solid var(--blu-bdr)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 4, fontWeight: 600 }}>Selected</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blu)' }}>
                  {districts.find(d => d.id === form.district_id)?.name}
                </div>
                {form.mandal_id ? (
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>
                    {formMandals.find(m => m.id === form.mandal_id)?.name}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2, fontStyle: 'italic' }}>
                    No mandal selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Col 2: PVC Institution ──────────────────────────── */}
          <InstitutionCol
            typeLabel="PVC"
            color="var(--blu)"
            borderColor="var(--blu)"
            bgColor="var(--blu-lt)"
            places={pvcPlaces}
            idKey="pvc_institution_id"
            nameKey="pvc_name"
            placeholder="Enter PVC name, e.g. PVC Allapalli"
          />

          {/* ── Col 3: SC(AH) Institution ───────────────────────── */}
          <InstitutionCol
            typeLabel="SC(AH)"
            color="var(--grn)"
            borderColor="var(--grn)"
            bgColor="#f0fdf4"
            places={scahPlaces}
            idKey="scah_institution_id"
            nameKey="scah_name"
            placeholder="Enter SC(AH) name, e.g. SC(AH) Wagapur"
          />

          {/* ── Col 4: Village checkboxes ────────────────────────── */}
          <div style={{ padding: 16, background: form.mandal_id ? 'var(--bg)' : 'var(--bg1)', display: 'flex', flexDirection: 'column' }}>
            <label style={colLbl}>Village Name</label>
            {!form.district_id ? (
              <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0' }}>← Select a District first</p>
            ) : !form.mandal_id ? (
              <p style={{ fontSize: 11, color: 'var(--txt3)', margin: '8px 0' }}>← Select a Mandal first</p>
            ) : (
              <VillageCheckList
                villages={formVillages}
                selected={form.villageIds}
                onChange={ids => setForm(prev => ({ ...prev, villageIds: ids }))}
              />
            )}
          </div>
        </div>

        {/* Save strip */}
        <div style={{
          padding: '12px 20px', background: 'var(--bg1)', borderTop: '1px solid var(--bdr)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
            {form.district_id
              ? [
                  districts.find(d => d.id === form.district_id)?.name,
                  formMandals.find(m => m.id === form.mandal_id)?.name,
                  form.villageIds.size > 0 ? `${form.villageIds.size} village(s) selected` : null,
                ].filter(Boolean).join(' · ')
              : 'Select a district to begin mapping institutions'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={closeForm}>
              {editRow ? '✕ Cancel' : 'Reset'}
            </Btn>
            <Btn
              variant="primary" size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || !form.district_id}
            >
              {saveMutation.isPending ? 'Saving…' : editRow ? '✓ Update Institution' : '✓ Save Institution'}
            </Btn>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TABLE — all saved institutions
      ═══════════════════════════════════════════════════════════ */}
      <Card>
        {/* Filter bar */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={fSearch} onChange={e => { setFSearch(e.target.value); setPage(1); }}
            placeholder="Search institution name…"
            style={{ ...inp, width: 200 }}
          />
          <select style={{ ...sel, width: 180 }} value={fDistrict} onChange={e => { setFDistrict(e.target.value); setPage(1); }}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select style={{ ...sel, width: 160 }} value={fType} onChange={e => { setFType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {instTypes.map(t => <option key={t.id} value={t.id}>{t.code ? `${t.code} — ${t.name}` : t.name}</option>)}
          </select>
          {(fSearch || fDistrict || fType) && (
            <Btn variant="ghost" size="sm" onClick={() => { setFSearch(''); setFDistrict(''); setFType(''); setPage(1); }}>✕ Clear</Btn>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>{total} records</span>
        </div>

        <DataTable
          loading={isLoading || !isOnline}
          data={rows}
          emptyMsg="No institutions yet. Use the mapping card above to add one."
          columns={[
            {
              header: 'Institution Name', key: 'name',
              render: (v, r) => (
                <div>
                  <strong style={{ fontSize: 12 }}>{v}</strong>
                  {r.address && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{r.address}</div>}
                </div>
              ),
            },
            {
              header: 'Type', key: 'institution_type_name',
              render: (v, r) => {
                const code = instTypes.find(t => t.id === r.institution_type_id)?.code;
                return v
                  ? <Badge color={typeBadgeColor(code)}>{code || v}</Badge>
                  : <span style={{ fontSize: 11, color: 'var(--txt3)' }}>—</span>;
              },
            },
            { header: 'District', key: 'district_name', render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Mandal',   key: 'mandal_name',   render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Village',  key: 'town_name',     render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            {
              header: 'Status', key: 'is_active',
              render: v => <Badge color={v ? 'green' : 'dim'}>{v ? 'Active' : 'Inactive'}</Badge>,
            },
            {
              header: 'Actions', key: 'id',
              render: (_, row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn
                    variant={editRow?.id === row.id ? 'primary' : 'outline'}
                    size="xs"
                    onClick={() => openEdit(row)}
                  >
                    ✎ Edit
                  </Btn>
                  <button
                    onClick={() => setDelRow(row)}
                    style={{
                      padding: '3px 8px', fontSize: 10,
                      background: 'var(--red-lt)', color: 'var(--red)',
                      border: '1px solid var(--red-bdr)', borderRadius: 4,
                      cursor: 'pointer', fontFamily: 'var(--fb)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ),
            },
          ]}
        />

        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, padding: '10px 14px', borderTop: '1px solid var(--bdr)',
            background: 'var(--bg1)', fontSize: 11, color: 'var(--txt3)',
          }}>
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Page {page} of {totalPages}</span>
              <Btn variant="outline" size="xs" disabled={page <= 1}           onClick={() => setPage(p => p - 1)}>Previous</Btn>
              <Btn variant="outline" size="xs" disabled={page >= totalPages}  onClick={() => setPage(p => p + 1)}>Next</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* ── Delete Confirm Modal ──────────────────────────────── */}
      {delRow && (
        <Modal
          title="Delete Institution"
          sub="This action cannot be undone"
          onClose={() => setDelRow(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setDelRow(null)}>Cancel</Btn>
              <Btn
                variant="danger"
                onClick={() => deleteMutation.mutate(delRow.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Btn>
            </>
          }
        >
          <p style={{ fontSize: 13, margin: 0 }}>
            Delete <strong>{delRow.name}</strong>
            {delRow.district_name && <> from <strong>{delRow.district_name}</strong></>}?
          </p>
        </Modal>
      )}
    </PageWrap>
  );
}
