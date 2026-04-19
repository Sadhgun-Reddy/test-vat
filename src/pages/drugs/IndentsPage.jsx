// src/pages/drugs/IndentsPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { upsertAndEnqueue } from '../../sync/offlineStore';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn,
  Modal, Field, inputStyle,
} from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtINR  = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const STATUS_COLOR = { pending: 'amber', approved: 'blue', dispatched: 'purple', received: 'green', rejected: 'red' };
const PO_STATUS_COLOR = { draft: 'dim', confirmed: 'blue', closed: 'green', cancelled: 'red', received: 'purple' };
const TX_COLOR = { received: 'green', issued: 'amber', returned: 'blue', adjusted: 'dim' };

const TABS = [
  { id: 'indents',        label: 'Drug Indents' },
  { id: 'purchase_order', label: 'Purchase Order' },
  { id: 'purchase',       label: 'Purchase' },
  { id: 'transfer',       label: 'Transfer' },
  { id: 'sale',           label: 'Sale' },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--bdr)' }}>
      {TABS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            style={{
              padding: '8px 16px', borderRadius: '6px 6px 0 0', fontSize: 12,
              fontFamily: 'var(--fb)', fontWeight: isActive ? 700 : 500,
              border: `1px solid ${isActive ? 'var(--bdr)' : 'transparent'}`,
              borderBottom: isActive ? '1px solid var(--bg)' : '1px solid transparent',
              background: isActive ? 'var(--bg)' : 'transparent',
              color: isActive ? 'var(--blu)' : 'var(--txt3)',
              cursor: 'pointer', marginBottom: -1, transition: 'color .15s',
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Detail row for View modal ─── */
function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--bdr)' }}>
      <span style={{ fontSize: 11, color: 'var(--txt3)', width: 150, flexShrink: 0, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--txt)', wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  );
}

/* ─── Drug items detail table used in all View modals ─── */
function DrugItemsTable({ items = [], showBatch = false }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return <p style={{ fontSize: 12, color: 'var(--txt3)', margin: '8px 0' }}>No drug items.</p>;

  const th = { fontSize: 10, fontWeight: 700, color: 'var(--txt3)', padding: '6px 8px', textAlign: 'left', background: 'var(--bg2)', borderBottom: '1px solid var(--bdr)', whiteSpace: 'nowrap' };
  const td = { fontSize: 11, padding: '6px 8px', borderBottom: '1px solid var(--bdr)', color: 'var(--txt)', verticalAlign: 'top' };
  const tdR = { ...td, textAlign: 'right', fontFamily: 'var(--fm)' };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 6 }}>Drug Details</div>
      <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--bdr)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Drug Name</th>
              <th style={th}>Code</th>
              <th style={{ ...th, textAlign: 'right' }}>Qty</th>
              <th style={{ ...th, textAlign: 'right' }}>Unit Price</th>
              <th style={{ ...th, textAlign: 'right' }}>Discount</th>
              <th style={{ ...th, textAlign: 'right' }}>GST %</th>
              {showBatch && <th style={th}>Batch #</th>}
              {showBatch && <th style={th}>Expiry</th>}
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, idx) => {
              const base  = Number(item.quantity || 0) * Number(item.unit_price || 0);
              const disc  = Number(item.discount || 0);
              const gst   = Number(item.gst_pct || 0);
              const total = item.total != null ? Number(item.total) : (base - disc) * (1 + gst / 100);
              return (
                <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg2)' }}>
                  <td style={{ ...td, color: 'var(--txt3)' }}>{idx + 1}</td>
                  <td style={td}><strong style={{ fontSize: 12 }}>{item.drug_name || '—'}</strong>{item._extra || null}</td>
                  <td style={{ ...td, fontFamily: 'var(--fm)', color: 'var(--txt3)', fontSize: 10 }}>{item.drug_code || '—'}</td>
                  <td style={tdR}>{Number(item.quantity || 0).toLocaleString('en-IN')}</td>
                  <td style={tdR}>{fmtINR(item.unit_price)}</td>
                  <td style={tdR}>{disc > 0 ? fmtINR(disc) : '—'}</td>
                  <td style={tdR}>{gst > 0 ? `${gst}%` : '—'}</td>
                  {showBatch && <td style={{ ...td, fontFamily: 'var(--fm)', fontSize: 10 }}>{item.batch_no || '—'}</td>}
                  {showBatch && <td style={{ ...td, fontSize: 10 }}>{fmtDate(item.expiry_date)}</td>}
                  <td style={{ ...tdR, fontWeight: 700, color: 'var(--grn)' }}>{fmtINR(total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showBatch ? 9 : 7} style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--txt2)', background: 'var(--bg2)' }}>Grand Total</td>
              <td style={{ ...tdR, fontWeight: 800, color: 'var(--grn)', background: 'var(--bg2)', fontSize: 12 }}>
                {fmtINR(list.reduce((s, i) => {
                  const base = Number(i.quantity || 0) * Number(i.unit_price || 0);
                  const disc = Number(i.discount || 0);
                  const gst  = Number(i.gst_pct || 0);
                  return s + (i.total != null ? Number(i.total) : (base - disc) * (1 + gst / 100));
                }, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ─── Shared action buttons ─── */
function ActionBtns({ onView, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <Btn variant="ghost"  size="xs" onClick={onView}>View</Btn>
      <Btn variant="ghost"  size="xs" onClick={onEdit}>Edit</Btn>
      <Btn variant="danger" size="xs" onClick={onDelete}>Delete</Btn>
    </div>
  );
}

/* ─── Generic confirm-delete modal ─── */
function DeleteConfirm({ label, onConfirm, onClose, isPending }) {
  return (
    <Modal title="Confirm Delete" sub="This action cannot be undone" onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm} disabled={isPending}>{isPending ? 'Deleting…' : 'Delete'}</Btn>
        </>
      }
    >
      <p style={{ fontSize: 13, margin: 0 }}>Are you sure you want to delete <strong>{label}</strong>?</p>
    </Modal>
  );
}

/* ─── Purchase Order Tab ─── */
function PurchaseOrderTab({ isOnline }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [del,  setDel]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['po-tab'],
    queryFn: async () => { const { data } = await syncManager.api.get('/purchase-orders?limit=100'); return data; },
    enabled: isOnline, staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await syncManager.api.delete(`/purchase-orders/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['po-tab'] }); setDel(null); toast.success('Purchase order deleted'); },
    onError: err => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const rows = data?.purchase_orders || [];

  return (
    <>
      <Card>
        <DataTable loading={isLoading || !isOnline} data={rows}
          emptyMsg={isOnline ? 'No purchase orders found' : 'Go online to view purchase orders'}
          columns={[
            { header: 'PO #',       key: 'invoice_no',      render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700, fontSize: 11 }}>{v}</span> },
            { header: 'Place',      key: 'place_name',      render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Items',      key: 'items',           render: v => { const l = Array.isArray(v) ? v : []; return <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{l.length === 0 ? '—' : l.map(i => i.drug_name).join(', ').slice(0,60) + (l.length > 2 ? '…' : '')}</div>; } },
            { header: 'Total',      key: 'total',           render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)' }}>{fmtINR(v)}</span> },
            { header: 'Status',     key: 'status',          render: v => <Badge color={PO_STATUS_COLOR[v] || 'dim'}>{v}</Badge> },
            { header: 'Date',       key: 'sale_date',       render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Created By', key: 'created_by_name', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            {
              header: 'Actions', key: 'id',
              render: (id, row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn variant="ghost"  size="xs" onClick={() => setView(row)}>View</Btn>
                  <Btn variant="ghost"  size="xs" onClick={() => navigate('/drug-sale', { state: { editPO: row } })}>Edit</Btn>
                  <Btn variant="danger" size="xs" onClick={() => setDel(row)}>Delete</Btn>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {view && (
        <Modal title="Purchase Order Details" sub={view.invoice_no} onClose={() => setView(null)}
          footer={<Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>}
        >
          <DetailRow label="PO #"       value={view.invoice_no} />
          <DetailRow label="Place"      value={view.place_name} />
          <DetailRow label="Status"     value={<Badge color={PO_STATUS_COLOR[view.status] || 'dim'}>{view.status}</Badge>} />
          <DetailRow label="Subtotal"   value={fmtINR(view.subtotal)} />
          <DetailRow label="Tax"        value={fmtINR(view.tax)} />
          <DetailRow label="Total"      value={fmtINR(view.total)} />
          <DetailRow label="Date"       value={fmtDate(view.sale_date)} />
          <DetailRow label="Created By" value={view.created_by_name} />
          <DrugItemsTable items={view.items} />
        </Modal>
      )}

      {del && <DeleteConfirm label={del.invoice_no} isPending={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(del.id)} onClose={() => setDel(null)} />}
    </>
  );
}

/* ─── Purchase Tab ─── */
function PurchaseTab({ isOnline }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [del,  setDel]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases-tab'],
    queryFn: async () => { const { data } = await syncManager.api.get('/purchases?limit=100'); return data; },
    enabled: isOnline, staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await syncManager.api.delete(`/purchases/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases-tab'] }); setDel(null); toast.success('Purchase deleted'); },
    onError: err => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const rows = data?.purchases || [];

  return (
    <>
      <Card>
        <DataTable loading={isLoading || !isOnline} data={rows}
          emptyMsg={isOnline ? 'No purchases found' : 'Go online to view purchases'}
          columns={[
            { header: 'Invoice #',  key: 'invoice_no',      render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700, fontSize: 11 }}>{v}</span> },
            { header: 'Place',      key: 'place_name',      render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
            { header: 'Items',      key: 'items',           render: v => { const l = Array.isArray(v) ? v : []; return <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{l.length === 0 ? '—' : l.map(i => i.drug_name).join(', ').slice(0,60) + (l.length > 2 ? '…' : '')}</div>; } },
            { header: 'Subtotal',   key: 'subtotal',        render: v => <span style={{ fontFamily: 'var(--fm)' }}>{fmtINR(v)}</span> },
            { header: 'Total',      key: 'total',           render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)', fontWeight: 600 }}>{fmtINR(v)}</span> },
            { header: 'Date',       key: 'purchase_date',   render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Notes',      key: 'notes',           render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Created By', key: 'created_by_name', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            {
              header: 'Actions', key: 'id',
              render: (id, row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn variant="ghost"  size="xs" onClick={() => setView(row)}>View</Btn>
                  <Btn variant="ghost"  size="xs" onClick={() => navigate('/drug-sale', { state: { editPurchase: row } })}>Edit</Btn>
                  <Btn variant="danger" size="xs" onClick={() => setDel(row)}>Delete</Btn>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {view && (
        <Modal title="Purchase Details" sub={view.invoice_no} onClose={() => setView(null)}
          footer={<Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>}
        >
          <DetailRow label="Invoice #"  value={view.invoice_no} />
          <DetailRow label="Place"      value={view.place_name} />
          <DetailRow label="Subtotal"   value={fmtINR(view.subtotal)} />
          <DetailRow label="Tax"        value={fmtINR(view.tax)} />
          <DetailRow label="Total"      value={fmtINR(view.total)} />
          <DetailRow label="Date"       value={fmtDate(view.purchase_date)} />
          <DetailRow label="Notes"      value={view.notes} />
          <DetailRow label="Created By" value={view.created_by_name} />
          <DrugItemsTable items={view.items} showBatch />
        </Modal>
      )}

      {del && <DeleteConfirm label={del.invoice_no} isPending={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(del.id)} onClose={() => setDel(null)} />}
    </>
  );
}

/* ─── Transfer Tab ─── */
function TransferTab({ isOnline }) {
  const navigate = useNavigate();
  const [view, setView] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements-tab'],
    queryFn: async () => { const { data } = await syncManager.api.get('/stock/movements?limit=100'); return data; },
    enabled: isOnline, staleTime: 30_000,
  });
  const rows = data?.movements || [];

  return (
    <>
      <Card>
        <DataTable loading={isLoading || !isOnline} data={rows}
          emptyMsg={isOnline ? 'No stock movements found' : 'Go online to view transfers'}
          columns={[
            { header: 'Drug',         key: 'drug_name',         render: v => <strong style={{ fontSize: 12 }}>{v}</strong> },
            { header: 'Type',         key: 'tx_type',           render: v => <Badge color={TX_COLOR[v] || 'dim'}>{v}</Badge> },
            { header: 'Qty',          key: 'quantity',          render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v}</span> },
            { header: 'Batch #',      key: 'batch_no',          render: v => <span style={{ fontSize: 11, fontFamily: 'var(--fm)' }}>{v || '—'}</span> },
            { header: 'Ref #',        key: 'reference_no',      render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Notes',        key: 'notes',             render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Performed By', key: 'performed_by_name', render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            { header: 'Date',         key: 'created_at',        render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            {
              header: 'Actions', key: 'id',
              render: (id, row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn variant="ghost" size="xs" onClick={() => setView(row)}>View</Btn>
                  <Btn variant="ghost" size="xs" onClick={() => navigate('/drug-sale', { state: { editTransfer: row } })}>Edit</Btn>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {view && (
        <Modal title="Transfer / Movement Details" sub={view.drug_name} onClose={() => setView(null)}
          footer={<Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>}
        >
          <DetailRow label="Type"         value={<Badge color={TX_COLOR[view.tx_type] || 'dim'}>{view.tx_type}</Badge>} />
          <DetailRow label="Reference #"  value={view.reference_no} />
          <DetailRow label="Notes"        value={view.notes} />
          <DetailRow label="Performed By" value={view.performed_by_name} />
          <DetailRow label="Date"         value={fmtDate(view.created_at)} />
          <DrugItemsTable items={[{
            drug_name:   view.drug_name,
            drug_code:   view.drug_code || '',
            quantity:    view.quantity,
            unit_price:  view.unit_price || 0,
            discount:    0,
            gst_pct:     0,
            batch_no:    view.batch_no,
            expiry_date: view.expiry_date,
            total:       Number(view.quantity || 0) * Number(view.unit_price || 0),
          }]} showBatch />
        </Modal>
      )}
    </>
  );
}

/* ─── Sale Tab ─── */
function SaleTab({ isOnline }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [del,  setDel]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-tab'],
    queryFn: async () => { const { data } = await syncManager.api.get('/sales?limit=100'); return data; },
    enabled: isOnline, staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await syncManager.api.delete(`/sales/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-tab'] }); setDel(null); toast.success('Sale deleted'); },
    onError: err => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const rows = data?.sales || [];

  return (
    <>
      <Card>
        <DataTable loading={isLoading || !isOnline} data={rows}
          emptyMsg={isOnline ? 'No sales found' : 'Go online to view sales'}
          columns={[
            { header: 'Invoice #',  key: 'invoice_no',      render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700, fontSize: 11 }}>{v}</span> },
            { header: 'Customer',   key: 'farmer_name_ref', render: (v, r) => <span style={{ fontSize: 12 }}>{v || r.customer_name || '—'}</span> },
            { header: 'Items',      key: 'items',           render: v => { const l = Array.isArray(v) ? v : []; return <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{l.length === 0 ? '—' : l.map(i => i.drug_name).join(', ').slice(0,60) + (l.length > 2 ? '…' : '')}</div>; } },
            { header: 'Total',      key: 'total',           render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)', fontWeight: 600 }}>{fmtINR(v)}</span> },
            { header: 'Payment',    key: 'payment_method',  render: v => <Badge color={v === 'cash' ? 'green' : 'blue'}>{v || '—'}</Badge> },
            { header: 'Date',       key: 'sale_date',       render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
            { header: 'Sold By',    key: 'sold_by_name',    render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
            {
              header: 'Actions', key: 'id',
              render: (id, row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn variant="ghost"  size="xs" onClick={() => setView(row)}>View</Btn>
                  <Btn variant="ghost"  size="xs" onClick={() => navigate('/drug-sale', { state: { editSale: row } })}>Edit</Btn>
                  <Btn variant="danger" size="xs" onClick={() => setDel(row)}>Delete</Btn>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {view && (
        <Modal title="Sale Details" sub={view.invoice_no} onClose={() => setView(null)}
          footer={<Btn variant="ghost" onClick={() => setView(null)}>Close</Btn>}
        >
          <DetailRow label="Invoice #"  value={view.invoice_no} />
          <DetailRow label="Customer"   value={view.farmer_name_ref || view.customer_name} />
          <DetailRow label="Payment"    value={<Badge color={view.payment_method === 'cash' ? 'green' : 'blue'}>{view.payment_method || '—'}</Badge>} />
          <DetailRow label="Subtotal"   value={fmtINR(view.subtotal)} />
          <DetailRow label="Discount"   value={fmtINR(view.discount)} />
          <DetailRow label="Tax"        value={fmtINR(view.tax)} />
          <DetailRow label="Total"      value={fmtINR(view.total)} />
          <DetailRow label="Sale Date"  value={fmtDate(view.sale_date)} />
          <DetailRow label="Sold By"    value={view.sold_by_name} />
          <DetailRow label="Notes"      value={view.notes} />
          <DrugItemsTable items={view.items} />
        </Modal>
      )}

      {del && <DeleteConfirm label={del.invoice_no} isPending={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(del.id)} onClose={() => setDel(null)} />}
    </>
  );
}

/* ─── Main Page ─── */
export default function IndentsPage() {
  const { isOnline, refreshPending } = useSync();
  const qc = useQueryClient();

  const [activeTab, setActiveTab]       = useState('indents');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [viewIndent, setViewIndent]     = useState(null);   // row to view
  const [editIndent, setEditIndent]     = useState(null);   // row to edit
  const [deleteIndent, setDeleteIndent] = useState(null);   // row to delete

  /* ── queries ── */
  const { data, isLoading } = useQuery({
    queryKey: ['indents', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 50 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await syncManager.api.get(`/indents?${params}`);
      return data;
    },
    enabled: isOnline && activeTab === 'indents',
    staleTime: 30_000,
  });

  const { data: drugs } = useQuery({
    queryKey: ['drugs-select'],
    queryFn: async () => { const { data } = await syncManager.api.get('/drugs?limit=100'); return data.drugs || []; },
    enabled: isOnline, staleTime: 120_000,
  });

  /* ── mutations ── */
  const createMutation = useMutation({
    mutationFn: async (fd) => {
      if (isOnline) { const { data } = await syncManager.api.post('/indents', fd); return data; }
      return upsertAndEnqueue('drug_indents', fd, 'INSERT');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['indents'] }); setShowForm(false); toast.success('Indent submitted'); refreshPending(); },
    onError: err => toast.error(err.response?.data?.error || 'Submission failed'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...fd }) => {
      const { data } = await syncManager.api.patch(`/indents/${id}`, fd);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['indents'] }); setEditIndent(null); toast.success('Indent updated'); },
    onError: err => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await syncManager.api.delete(`/indents/${id}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['indents'] }); setDeleteIndent(null); toast.success('Indent deleted'); },
    onError: err => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, qty }) => {
      const { data } = await syncManager.api.patch(`/indents/${id}/status`, { status, quantity_approved: qty || null });
      return data;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['indents'] }); toast.success(`Indent ${vars.status}`); },
    onError: () => toast.error('Action failed'),
  });

  /* ── forms ── */
  const createForm = useForm({ defaultValues: { drug_id: '', quantity_requested: 1, justification: '', required_by_date: '' } });
  const editForm   = useForm();

  const openEdit = (row) => {
    setEditIndent(row);
    editForm.reset({
      drug_id:            row.drug_id,
      quantity_requested: row.quantity_requested,
      justification:      row.justification || '',
      required_by_date:   row.required_by_date ? row.required_by_date.slice(0, 10) : '',
    });
  };

  const indents = data?.indents || [];
  const total   = data?.total   || 0;

  /* ── action cell for the table ── */
  const renderActions = (id, row) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {/* View — always visible */}
      <Btn variant="ghost" size="xs" onClick={() => setViewIndent(row)}>View</Btn>

      {/* Workflow actions — status-gated */}
      {row.status === 'pending' && (
        <>
          <Btn variant="ghost" size="xs" onClick={() => openEdit(row)}>Edit</Btn>
          <Btn variant="danger" size="xs" onClick={() => setDeleteIndent(row)}>Delete</Btn>
          <Btn variant="success" size="xs" onClick={() => approveMutation.mutate({ id, status: 'approved', qty: row.quantity_requested })}>✓ Approve</Btn>
          <Btn variant="danger"  size="xs" onClick={() => approveMutation.mutate({ id, status: 'rejected' })}>✕ Reject</Btn>
        </>
      )}
      {row.status === 'approved'   && <Btn variant="ghost" size="xs" onClick={() => approveMutation.mutate({ id, status: 'dispatched' })}>→ Dispatch</Btn>}
      {row.status === 'dispatched' && <Btn variant="ghost" size="xs" onClick={() => approveMutation.mutate({ id, status: 'received' })}>✓ Received</Btn>}
    </div>
  );

  return (
    <PageWrap>
      <PageHead
        title="Drug Indents"
        subtitle="Drug requisition, procurement and sales workflow"
        crumbs={['Home', 'Drugs', 'Indents']}
        actions={activeTab === 'indents' && <Btn variant="primary" size="sm" onClick={() => setShowForm(true)}>+ New Indent</Btn>}
      />

      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Drug Indents Tab ── */}
      {activeTab === 'indents' && (
        <>
          <KPIGrid>
            {['pending', 'approved', 'dispatched', 'received'].map((s, i) => (
              <KPICard key={s} label={s.charAt(0).toUpperCase() + s.slice(1)}
                value={indents.filter(x => x.status === s).length}
                color={['amber','blue','purple','green'][i]}
                onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              />
            ))}
          </KPIGrid>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {['', 'pending', 'approved', 'dispatched', 'received', 'rejected'].map(s => (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12,
                  border: `1px solid ${statusFilter === s ? 'var(--blu)' : 'var(--bdr)'}`,
                  background: statusFilter === s ? 'var(--blu)' : 'var(--bg)',
                  color: statusFilter === s ? '#fff' : 'var(--txt2)',
                  cursor: 'pointer', fontFamily: 'var(--fb)',
                  fontWeight: statusFilter === s ? 600 : 400,
                }}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>

          <Card>
            <DataTable
              loading={isLoading || !isOnline}
              data={indents}
              emptyMsg={isOnline ? 'No indent records' : 'Go online to view indents'}
              columns={[
                {
                  header: 'Indent ID', key: 'indent_no',
                  render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--blu)', fontWeight: 700, fontSize: 11 }}>{v}</span>,
                },
                {
                  header: 'Drug', key: 'drug_name',
                  render: (v, r) => <div><strong style={{ fontSize: 12 }}>{v}</strong><div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.drug_code}</div></div>,
                },
                { header: 'Qty Req.',  key: 'quantity_requested', render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v}</span> },
                { header: 'Qty App.',  key: 'quantity_approved',  render: v => <span style={{ fontFamily: 'var(--fm)', color: 'var(--grn)' }}>{v ?? '—'}</span> },
                { header: 'District',  key: 'district_name',      render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
                { header: 'Req. By',   key: 'requested_by_name',  render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{v || '—'}</span> },
                { header: 'Date',      key: 'created_at',         render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtDate(v)}</span> },
                { header: 'Status',    key: 'status',             render: v => <Badge color={STATUS_COLOR[v] || 'dim'}>{v}</Badge> },
                { header: 'Actions',   key: 'id',                 render: renderActions },
              ]}
            />
          </Card>
        </>
      )}

      {activeTab === 'purchase_order' && <PurchaseOrderTab isOnline={isOnline} />}
      {activeTab === 'purchase'       && <PurchaseTab      isOnline={isOnline} />}
      {activeTab === 'transfer'       && <TransferTab      isOnline={isOnline} />}
      {activeTab === 'sale'           && <SaleTab          isOnline={isOnline} />}

      {/* ══════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════ */}
      {viewIndent && (
        <Modal title="Indent Details" sub={viewIndent.indent_no} onClose={() => setViewIndent(null)}
          footer={<Btn variant="ghost" onClick={() => setViewIndent(null)}>Close</Btn>}
        >
          <DetailRow label="Indent No."       value={viewIndent.indent_no} />
          <DetailRow label="Status"           value={<Badge color={STATUS_COLOR[viewIndent.status] || 'dim'}>{viewIndent.status}</Badge>} />
          <DetailRow label="District"         value={viewIndent.district_name} />
          <DetailRow label="Place of Working" value={viewIndent.place_of_working_name} />
          <DetailRow label="Requested By"     value={viewIndent.requested_by_name} />
          <DetailRow label="Approved By"      value={viewIndent.approved_by_name} />
          <DetailRow label="Financial Year"   value={viewIndent.fy_label} />
          <DetailRow label="Scheme"           value={viewIndent.scheme_name} />
          <DetailRow label="Required By"      value={fmtDate(viewIndent.required_by_date)} />
          <DetailRow label="Justification"    value={viewIndent.justification} />
          <DetailRow label="Created"          value={fmtDate(viewIndent.created_at)} />
          <DetailRow label="Last Updated"     value={fmtDate(viewIndent.updated_at)} />
          <DrugItemsTable items={[{
            drug_name:  viewIndent.drug_name,
            drug_code:  viewIndent.drug_code,
            quantity:   viewIndent.quantity_requested,
            unit_price: 0,
            discount:   0,
            gst_pct:    0,
            total:      0,
            _extra: (
              <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>
                Unit: {viewIndent.drug_unit || '—'} &nbsp;·&nbsp;
                Approved: {viewIndent.quantity_approved ?? '—'} &nbsp;·&nbsp;
                Dispatched: {viewIndent.quantity_dispatched ?? '—'} &nbsp;·&nbsp;
                Received: {viewIndent.quantity_received ?? '—'}
              </div>
            ),
          }]} />
        </Modal>
      )}

      {/* ══════════════════════════════════════════
          EDIT MODAL (pending only)
      ══════════════════════════════════════════ */}
      {editIndent && (
        <Modal title="Edit Indent" sub={`Editing ${editIndent.indent_no} — pending indents only`}
          onClose={() => setEditIndent(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setEditIndent(null)}>Cancel</Btn>
              <Btn variant="primary"
                onClick={editForm.handleSubmit(d => editMutation.mutate({ id: editIndent.id, ...d }))}
                disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving…' : '✓ Save Changes'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Drug" required error={editForm.formState.errors.drug_id?.message}>
                <select {...editForm.register('drug_id', { required: 'Required' })} style={inputStyle(editForm.formState.errors.drug_id)}>
                  <option value="">Select drug…</option>
                  {(drugs || []).map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </Field>
            </div>
            <Field label="Quantity Requested" required error={editForm.formState.errors.quantity_requested?.message}>
              <input type="number" min={1}
                {...editForm.register('quantity_requested', { required: 'Required', min: 1, valueAsNumber: true })}
                style={inputStyle(editForm.formState.errors.quantity_requested)} />
            </Field>
            <Field label="Required By Date">
              <input type="date" {...editForm.register('required_by_date')} style={inputStyle()} />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Justification">
                <textarea rows={3} {...editForm.register('justification')} placeholder="Reason for the indent request…"
                  style={{ ...inputStyle(), resize: 'vertical', minHeight: 70 }} />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════
          DELETE CONFIRM MODAL
      ══════════════════════════════════════════ */}
      {deleteIndent && (
        <Modal title="Delete Indent" sub="This action cannot be undone" onClose={() => setDeleteIndent(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setDeleteIndent(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => deleteMutation.mutate(deleteIndent.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Btn>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--txt)', margin: 0 }}>
            Are you sure you want to delete indent <strong>{deleteIndent.indent_no}</strong> for{' '}
            <strong>{deleteIndent.drug_name}</strong> (Qty: {deleteIndent.quantity_requested})?
          </p>
          <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 8 }}>
            Only pending indents can be deleted.
          </p>
        </Modal>
      )}

      {/* ══════════════════════════════════════════
          NEW INDENT MODAL
      ══════════════════════════════════════════ */}
      {showForm && (
        <Modal title="New Drug Indent" sub="Drug requisition form" onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={createForm.handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting…' : '✓ Submit Indent'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Drug" required error={createForm.formState.errors.drug_id?.message}>
                <select {...createForm.register('drug_id', { required: 'Required' })} style={inputStyle(createForm.formState.errors.drug_id)}>
                  <option value="">Select drug…</option>
                  {(drugs || []).map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </Field>
            </div>
            <Field label="Quantity Requested" required error={createForm.formState.errors.quantity_requested?.message}>
              <input type="number" min={1}
                {...createForm.register('quantity_requested', { required: 'Required', min: 1 })}
                style={inputStyle(createForm.formState.errors.quantity_requested)} />
            </Field>
            <Field label="Required By Date">
              <input type="date" {...createForm.register('required_by_date')} style={inputStyle()} />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Justification">
                <textarea rows={3} {...createForm.register('justification')} placeholder="Reason for the indent request…"
                  style={{ ...inputStyle(), resize: 'vertical', minHeight: 70 }} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
