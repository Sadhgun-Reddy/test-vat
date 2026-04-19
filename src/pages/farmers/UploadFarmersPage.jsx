// src/pages/farmers/UploadFarmersPage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, Card, Btn, inputStyle, DataTable, Badge } from '../../components/ui';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import toast from 'react-hot-toast';

// ── Searchable district select ─────────────────────────────────
function DistrictSelect({ districts = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const rect = useDropdownPosition(open, anchorRef);

  const selected = districts.find(d => d.id === value) || null;

  const filtered = search.trim()
    ? districts.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : districts;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        anchorRef.current && !anchorRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (d) => {
    onChange(d.id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <div
        ref={anchorRef}
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputStyle(),
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '0 8px',
          height: 38,
          gap: 6,
          borderColor: open ? 'var(--blu)' : undefined,
          boxShadow: open ? '0 0 0 3px rgba(26,86,219,.12)' : undefined,
        }}
      >
        <span style={{ flex: 1, fontSize: 13, color: selected ? 'var(--txt)' : 'var(--txt4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : 'Select district…'}
        </span>
        {selected && (
          <span
            onClick={handleClear}
            style={{ color: 'var(--txt3)', fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
            title="Clear"
          >
            ×
          </span>
        )}
        <span style={{ color: 'var(--txt4)', fontSize: 11, flexShrink: 0, marginLeft: 2 }}>∨</span>
      </div>

      {open && rect && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            minWidth: rect.minWidth,
            zIndex: 9999,
            background: 'var(--bg)',
            border: '1px solid var(--bdr)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search district…"
              onClick={e => e.stopPropagation()}
              style={{ ...inputStyle(), fontSize: 12, height: 32, padding: '0 10px' }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--txt4)' }}>No districts found</div>
            ) : (
              filtered.map(d => (
                <div
                  key={d.id}
                  onMouseDown={() => handleSelect(d)}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    cursor: 'pointer',
                    background: d.id === value ? 'var(--blu-bg, #eff6ff)' : 'transparent',
                    color: d.id === value ? 'var(--blu)' : 'var(--txt)',
                  }}
                  onMouseEnter={e => { if (d.id !== value) e.currentTarget.style.background = 'var(--bg2, #f9fafb)'; }}
                  onMouseLeave={e => { if (d.id !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  {d.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function UploadFarmersPage() {
  const navigate = useNavigate();
  const { isOnline } = useSync();

  const [districtId, setDistrictId] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedRows, setUploadedRows] = useState([]);
  const [uploadSummary, setUploadSummary] = useState(null);

  const { data: districtData } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/districts');
      return data;
    },
    enabled: isOnline,
    staleTime: Infinity,
  });

  const districts = Array.isArray(districtData)
    ? districtData
    : Array.isArray(districtData?.districts)
    ? districtData.districts
    : [];

  const uploadMutation = useMutation({
    mutationFn: async ({ districtId: did, uploadFile }) => {
      const fd = new FormData();
      fd.append('file', uploadFile);
      if (did) fd.append('district_id', did);
      const { data } = await syncManager.api.post('/farmers/upload', fd);
      return data;
    },
    onSuccess: (data) => {
      const inserted = data?.inserted ?? data?.count ?? '';
      toast.success(`Upload successful${inserted ? ` — ${inserted} records` : ''}`);
      setUploadSummary({
        totalRows: data?.total_rows ?? 0,
        inserted: data?.inserted ?? 0,
        skipped: data?.skipped ?? 0,
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
      setUploadedRows(Array.isArray(data?.records) ? data.records : []);
      setFile(null);
      setDistrictId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Upload failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!districtId) { toast.error('Please select a district'); return; }
    if (!file) { toast.error('Please choose a file'); return; }
    uploadMutation.mutate({ districtId, uploadFile: file });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  return (
    <PageWrap>
      <PageHead
        title="Upload Farmers Data"
        crumbs={['Farmers', 'Upload Farmers Data']}
        actions={<Btn variant="ghost" size="sm" onClick={() => navigate('/farmers')}>← Back</Btn>}
      />

      <Card style={{ padding: '24px 28px', marginBottom: 20 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* District */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>
                District <span style={{ color: 'var(--red, #dc2626)' }}>*</span>
              </label>
              <DistrictSelect
                districts={districts}
                value={districtId}
                onChange={setDistrictId}
              />
            </div>

            {/* File */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>
                Select File (Excel/CSV) <span style={{ color: 'var(--red, #dc2626)' }}>*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                style={{ ...inputStyle(), padding: '4px 8px', height: 38, fontSize: 13, cursor: 'pointer' }}
              />
            </div>
          </div>

          <Btn
            type="submit"
            variant="primary"
            disabled={uploadMutation.isPending || !isOnline}
          >
            {uploadMutation.isPending ? 'Uploading…' : '⬆ Upload File'}
          </Btn>
        </form>
      </Card>

      {/* Instructions */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 10,
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 600, fontSize: 13, color: 'var(--blu, #1a56db)' }}>
          <span style={{ fontSize: 15 }}>ℹ</span>
          Instructions
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--txt2)', lineHeight: 2 }}>
          <li>Select a district from the dropdown menu</li>
          <li>Choose an Excel (.xlsx, .xls) or CSV (.csv) file containing farmers data</li>
          <li>
            File must have columns: <strong>name</strong>, <strong>phone</strong>, and optionally <strong>aadhar_no</strong>
          </li>
          <li>Click the &quot;Upload File&quot; button to upload the data</li>
        </ul>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <a
            href="/farmers_import_template.xlsx"
            download="farmers_import_template.xlsx"
            style={{
              fontSize: 12, fontWeight: 600, color: 'var(--grn)',
              border: '1px solid var(--grn-bdr)', borderRadius: 6,
              padding: '5px 12px', textDecoration: 'none', background: 'var(--grn-lt)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            ⬇ Download Sample .xlsx
          </a>
          <a
            href="/farmers_import_template.csv"
            download="farmers_import_template.csv"
            style={{
              fontSize: 12, color: 'var(--blu)',
              border: '1px solid var(--blu-bdr)', borderRadius: 6,
              padding: '5px 12px', textDecoration: 'none', background: 'var(--bg)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            ⬇ Download Sample .csv
          </a>
        </div>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt2)' }}>Uploaded Records</div>
          {uploadSummary && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge color="blue">Rows: {uploadSummary.totalRows}</Badge>
              <Badge color="green">Inserted: {uploadSummary.inserted}</Badge>
              <Badge color={uploadSummary.skipped ? 'amber' : 'dim'}>Skipped: {uploadSummary.skipped}</Badge>
            </div>
          )}
        </div>
        <DataTable
          loading={uploadMutation.isPending}
          data={uploadedRows}
          emptyMsg="No uploaded records yet. Upload a file to see inserted rows."
          columns={[
            { header: 'Name', key: 'name', render: (v) => <strong style={{ fontSize: 12 }}>{v || '—'}</strong> },
            { header: 'Phone', key: 'phone', render: (v) => <span style={{ fontFamily: 'var(--fm)', fontSize: 12 }}>{v || '—'}</span> },
            { header: 'Aadhar', key: 'aadhar', render: (v) => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
            { header: 'District', key: 'district', render: (v) => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
          ]}
        />
        {uploadSummary?.errors?.length ? (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bdr)', background: 'var(--amb-lt)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amb)', marginBottom: 4 }}>Import Issues</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
              {uploadSummary.errors.slice(0, 8).map((e) => `Row ${e.row}: ${e.message}`).join(' · ')}
            </div>
          </div>
        ) : null}
      </Card>
    </PageWrap>
  );
}
