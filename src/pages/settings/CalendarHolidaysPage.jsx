// src/pages/settings/CalendarHolidaysPage.jsx — Year grid + institution filter + holiday list
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { endOfMonth, format, getDay } from 'date-fns';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, Card, Btn, Modal, Field, inputStyle, EmptyState,
} from '../../components/ui';
import toast from 'react-hot-toast';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.split('T')[0].slice(0, 10);
  try {
    return format(new Date(raw), 'yyyy-MM-dd');
  } catch {
    return String(raw);
  }
}

function buildHolidayDateSet(rows) {
  const s = new Set();
  (rows || []).forEach((h) => {
    const k = dateKey(h.date);
    if (k) s.add(k);
  });
  return s;
}

function buildIndiaHolidayDateSet(rows) {
  const s = new Set();
  (rows || []).forEach((h) => {
    const inst = String(h?.institution_type || '').trim().toLowerCase();
    const isIndiaHoliday = inst === 'all' || inst === 'india' || inst === 'national';
    if (!isIndiaHoliday) return;
    const k = dateKey(h.date);
    if (k) s.add(k);
  });
  return s;
}

function MiniMonth({ year, monthIndex, holidayDates, indiaHolidayDates }) {
  const monthStart = new Date(year, monthIndex, 1);
  const label = format(monthStart, 'MMMM');
  const lastDay = endOfMonth(monthStart).getDate();
  const startPad = getDay(monthStart);
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= lastDay; d += 1) {
    const ds = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, ds });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      style={{
        border: '1px solid var(--bdr2)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--bg)',
        minHeight: 0,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--blu)',
          padding: '6px 4px',
          borderBottom: '1px solid var(--bdr2)',
          background: 'var(--bg1)',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {WEEK.map((w, wi) => (
          <div
            key={`w-${wi}`}
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--txt4)',
              textAlign: 'center',
              padding: '4px 0',
              borderBottom: '1px solid var(--bdr2)',
            }}
          >
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          if (c == null) {
            return (
              <div
                key={`e-${i}`}
                style={{ minHeight: 22, borderRight: '1px solid var(--bdr2)', borderBottom: '1px solid var(--bdr2)', background: 'var(--bg1)' }}
              />
            );
          }
          const hasIndiaHoliday = indiaHolidayDates.has(c.ds);
          const hasHoliday = holidayDates.has(c.ds);
          return (
            <div
              key={c.ds}
              style={{
                minHeight: 22,
                fontSize: 10,
                textAlign: 'center',
                padding: '3px 0',
                borderRight: '1px solid var(--bdr2)',
                borderBottom: '1px solid var(--bdr2)',
                color: 'var(--txt)',
                background: hasIndiaHoliday ? 'var(--gld-mid)' : (hasHoliday ? 'rgba(26,86,219,.12)' : 'transparent'),
                fontWeight: hasHoliday ? 600 : 400,
              }}
            >
              {c.d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarHolidaysPage({ config, onBack }) {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const y0 = new Date().getFullYear();
  const [year, setYear] = useState(y0);
  const [institutionType, setInstitutionType] = useState('');
  const [fetchGen, setFetchGen] = useState(0);

  const { data: instTypes = [] } = useQuery({
    queryKey: ['setting', 'institution-types'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/institution-types');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const {
    data: holidays = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['calendar-holidays', year, institutionType, fetchGen],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/calendar-holidays', {
        params: { year, institution_type: institutionType },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && fetchGen > 0 && !!institutionType,
    staleTime: 15_000,
  });

  const holidayDates = useMemo(() => buildHolidayDateSet(holidays), [holidays]);
  const indiaHolidayDates = useMemo(() => buildIndiaHolidayDateSet(holidays), [holidays]);

  const [showForm, setShowForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const {
    register: registerHoliday,
    handleSubmit: handleSubmitHoliday,
    reset: resetHoliday,
    formState: { errors: holidayErrors },
  } = useForm();
  const {
    register: registerUpload,
    handleSubmit: handleSubmitUpload,
    reset: resetUpload,
    formState: { errors: uploadErrors },
  } = useForm({
    defaultValues: {
      institution_type: '',
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ file, institution_type, name, date }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('institution_type', institution_type);
      fd.append('name', name);
      fd.append('date', date);
      const { data } = await syncManager.api.post('/settings/calendar-holidays/import', fd);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['calendar-holidays'] });
      toast.success(`${data.inserted ?? 0} row(s) imported`);
      if (data.errors?.length) {
        toast.error(
          data.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join(' · '),
          { duration: 6000 }
        );
      }
      setShowUploadModal(false);
      resetUpload();
      if (fetchGen > 0 && institutionType) setFetchGen((g) => g + 1);
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Import failed'),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ payload, isEdit, id }) => {
      if (isEdit && id) {
        const { data } = await syncManager.api.put(`/settings/calendar-holidays/${encodeURIComponent(id)}`, payload);
        return data;
      }
      const { data } = await syncManager.api.post('/settings/calendar-holidays', payload);
      return data;
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['calendar-holidays'] });
      if (fetchGen > 0 && institutionType) setFetchGen((g) => g + 1);
      setShowForm(false);
      setEditRow(null);
      toast.success(variables?.isEdit ? 'Holiday updated' : 'Holiday added');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await syncManager.api.delete(`/settings/calendar-holidays/${encodeURIComponent(id)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-holidays'] });
      if (fetchGen > 0 && institutionType) setFetchGen((g) => g + 1);
      toast.success('Holiday removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Delete failed'),
  });

  const handleGetList = () => {
    if (!institutionType) {
      toast.error('Please select institution type');
      return;
    }
    setFetchGen((g) => g + 1);
  };

  const yearOptions = useMemo(() => {
    const out = [];
    for (let y = y0 - 1; y <= y0 + 3; y += 1) out.push(y);
    return out;
  }, [y0]);

  const tplBase = `${('' || '').replace(/\/$/, '')}/calendar_holidays_import_template.csv`;

  return (
    <PageWrap>
      <PageHead
        title="Calendar"
        subtitle="Holidays by institution type"
        crumbs={['Home', 'Settings', 'Calendar']}
        actions={<Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>}
      />

      {!isOnline && (
        <EmptyState icon="📡" title="Offline" message="Go online to manage the holiday calendar." />
      )}

      {isOnline && (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: 14,
              marginBottom: 18,
              padding: '14px 16px',
              background: 'var(--bg)',
              border: '1px solid var(--bdr)',
              borderRadius: 10,
              boxShadow: 'var(--sh1)',
            }}
          >
            <div style={{ minWidth: 200 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', display: 'block', marginBottom: 6 }}>
                Institution type <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <select
                value={institutionType}
                onChange={(e) => setInstitutionType(e.target.value)}
                style={{ ...inputStyle(), maxWidth: 300 }}
              >
                <option value="">Select institution type…</option>
                <option value="*">All holidays (any institution)</option>
                <option value="All">Global only (institution = All)</option>
                {instTypes.map((it) => (
                  <option key={it.id} value={it.name}>{it.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', display: 'block', marginBottom: 6 }}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                style={{ ...inputStyle(), width: 120 }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Btn variant="primary" size="sm" type="button" onClick={handleGetList} disabled={isFetching}>
                {isFetching ? 'Loading…' : '🔍 Get Holidays List'}
              </Btn>
              <Btn
                variant="outline"
                size="sm"
                type="button"
                disabled={importMutation.isPending}
                onClick={() => {
                  resetUpload({
                    institution_type: '',
                    name: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                  });
                  setShowUploadModal(true);
                }}
              >
                {importMutation.isPending ? 'Uploading…' : '📤 Upload Holidays'}
              </Btn>
              <a
                href={tplBase}
                download="calendar_holidays_import_template.csv"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--blu)',
                  border: '1px solid var(--blu-bdr)',
                  borderRadius: 6,
                  textDecoration: 'none',
                  background: 'var(--bg)',
                }}
              >
                ⬇ Download Template
              </a>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
              gap: 16,
              alignItems: 'start',
            }}
            className="calendar-holidays-layout"
          >
            <Card style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Calendar {year}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>
                  <span style={{ background: 'var(--gld-mid)', border: '1px solid var(--gld-bdr)', padding: '1px 6px', borderRadius: 999 }}>India holiday</span>
                  <span style={{ marginLeft: 8, background: 'rgba(26,86,219,.12)', border: '1px solid var(--blu-bdr)', padding: '1px 6px', borderRadius: 999 }}>Other holiday</span>
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
                className="calendar-year-grid"
              >
                {Array.from({ length: 12 }, (_, m) => (
                  <MiniMonth
                    key={m}
                    year={year}
                    monthIndex={m}
                    holidayDates={holidayDates}
                    indiaHolidayDates={indiaHolidayDates}
                  />
                ))}
              </div>
            </Card>

            <Card style={{ padding: 0 }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--bdr)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--txt2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>📋</span> Holidays List
              </div>
              <div style={{ padding: 12, maxHeight: 'min(70vh, 640px)', overflowY: 'auto' }}>
                {fetchGen === 0 || !institutionType ? (
                  <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--txt3)', fontSize: 13 }}>
                    <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>📅</div>
                    Select institution type and click &quot;Get Holidays List&quot;
                  </div>
                ) : isLoading ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--txt3)' }}>Loading…</div>
                ) : holidays.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--txt3)', fontSize: 13 }}>
                    No holidays for this selection.
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {holidays.map((h) => (
                      <li
                        key={h.id}
                        style={{
                          padding: '10px 8px',
                          borderBottom: '1px solid var(--bdr2)',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--txt)', marginBottom: 4 }}>{h.name}</div>
                        <div style={{ color: 'var(--txt3)', fontSize: 11 }}>{dateKey(h.date)}</div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                          <Btn variant="outline" size="xs" type="button" onClick={() => {
                            resetHoliday({
                              institution_type: h.institution_type || 'All',
                              name: h.name,
                              date: dateKey(h.date),
                            });
                            setEditRow(h);
                            setShowForm(true);
                          }}
                          >
                            ✎ Edit
                          </Btn>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Remove this holiday?')) deleteMutation.mutate(h.id);
                            }}
                            style={{
                              padding: '3px 8px', fontSize: 10, background: 'var(--red-lt)', color: 'var(--red)',
                              border: '1px solid var(--red-bdr)', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--fb)',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {fetchGen > 0 && institutionType && (
                <div style={{ padding: 12, borderTop: '1px solid var(--bdr)' }}>
                  <Btn variant="primary" size="sm" type="button" onClick={() => {
                    resetHoliday({
                      institution_type: institutionType === 'All' ? 'All' : institutionType,
                      name: '',
                      date: '',
                    });
                    setEditRow(null);
                    setShowForm(true);
                  }}
                  >
                    + Add holiday
                  </Btn>
                </div>
              )}
            </Card>
          </div>

          <style>{`
            @media (max-width: 960px) {
              .calendar-holidays-layout {
                grid-template-columns: 1fr !important;
              }
              .calendar-year-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 520px) {
              .calendar-year-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </>
      )}

      {showUploadModal && (
        <Modal
          title="Upload Holidays"
          onClose={() => { if (!importMutation.isPending) setShowUploadModal(false); }}
          size="lg"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="holiday-upload-grid">
            <Field label="Institution type" required error={uploadErrors.institution_type?.message}>
              <select
                {...registerUpload('institution_type', { required: 'Required' })}
                style={inputStyle(uploadErrors.institution_type)}
              >
                <option value="">Select institution type...</option>
                <option value="*">All holidays (any institution)</option>
                <option value="All">Global only (institution = All)</option>
                {instTypes.map((it) => (
                  <option key={it.id} value={it.name}>{it.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Select File (Excel/CSV)" required error={uploadErrors.file?.message}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.ods"
                {...registerUpload('file', { required: 'File is required' })}
                style={{ ...inputStyle(uploadErrors.file), padding: '6px 8px', fontSize: 12 }}
              />
            </Field>
            <Field label="Date" required error={uploadErrors.date?.message}>
              <input type="date" {...registerUpload('date', { required: 'Required' })} style={inputStyle(uploadErrors.date)} />
            </Field>
            <Field label="Name" required error={uploadErrors.name?.message}>
              <input
                {...registerUpload('name', { required: 'Required' })}
                style={inputStyle(uploadErrors.name)}
                placeholder="Enter name (e.g., Annual Holidays 2026)"
              />
            </Field>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Btn
              variant="primary"
              size="sm"
              disabled={importMutation.isPending}
              onClick={handleSubmitUpload((d) => {
                const raw = d.file;
                const file = raw?.[0] ?? (raw instanceof File ? raw : null);
                if (!file) {
                  toast.error('Please choose an Excel file');
                  return;
                }
                importMutation.mutate({
                  file,
                  institution_type: d.institution_type,
                  name: (d.name || '').trim(),
                  date: d.date,
                });
              })}
            >
              {importMutation.isPending ? 'Uploading…' : '📤 Upload File'}
            </Btn>
            <a
              href={tplBase}
              download="calendar_holidays_import_template.csv"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--blu)',
                border: '1px solid var(--blu-bdr)',
                borderRadius: 6,
                textDecoration: 'none',
                background: 'var(--bg)',
              }}
            >
              ⬇ Download Template
            </a>
            <Btn
              variant="ghost"
              size="sm"
              disabled={importMutation.isPending}
              onClick={() => setShowUploadModal(false)}
            >
              ✕ Cancel
            </Btn>
          </div>
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--blu-lt)',
              border: '1px solid var(--blu-bdr)',
              fontSize: 12,
              color: 'var(--txt2)',
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--blu2)' }}>ⓘ Instructions</div>
            <div>- Select an institution type from the dropdown.</div>
            <div>- Choose an Excel (.xlsx, .xls) or CSV (.csv) file containing holidays.</div>
            <div>- Ensure holiday dates in Excel are in DD/MM/YYYY format (e.g., 01/01/2026).</div>
            <div>- Click the "Upload File" button to import the data.</div>
          </div>
          <style>{`
            @media (max-width: 760px) {
              .holiday-upload-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </Modal>
      )}

      {showForm && (
        <Modal
          title={editRow ? 'Edit holiday' : 'Add holiday'}
          onClose={() => { setShowForm(false); setEditRow(null); }}
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditRow(null); }}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={handleSubmitHoliday((d) => {
                  const base = {
                    institution_type: d.institution_type || 'All',
                    name: d.name?.trim(),
                    date: d.date,
                  };
                  if (editRow?.id) {
                    saveMutation.mutate({
                      isEdit: true,
                      id: editRow.id,
                      payload: { ...base, is_active: true },
                    });
                  } else {
                    saveMutation.mutate({ isEdit: false, payload: base });
                  }
                })}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Btn>
            </>
          }
        >
          <Field label="Institution type" required error={holidayErrors.institution_type?.message}>
            <input {...registerHoliday('institution_type', { required: 'Required' })} style={inputStyle(holidayErrors.institution_type)} placeholder="All or institution name" />
          </Field>
          <Field label="Holiday name" required error={holidayErrors.name?.message}>
            <input {...registerHoliday('name', { required: 'Required' })} style={inputStyle(holidayErrors.name)} />
          </Field>
          <Field label="Date" required error={holidayErrors.date?.message}>
            <input type="date" {...registerHoliday('date', { required: 'Required' })} style={inputStyle(holidayErrors.date)} />
          </Field>
        </Modal>
      )}
    </PageWrap>
  );
}
