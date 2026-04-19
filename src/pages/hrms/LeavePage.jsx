// src/pages/hrms/LeavePage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, DataTable, Badge, Btn, Modal, Field, inputStyle } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function LeavePage() {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await syncManager.api.get(`/leaves?${params}&limit=50`);
      return data;
    },
    enabled: isOnline,
    staleTime: 30_000,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'select'],
    queryFn: async () => { const { data } = await syncManager.api.get('/employees?limit=200'); return data.employees || []; },
    enabled: isOnline, staleTime: 120_000,
  });

  const { data: leaveReasons } = useQuery({
    queryKey: ['leave-reasons'],
    queryFn: async () => { const { data } = await syncManager.api.get('/settings/leave-reasons'); return data; },
    enabled: isOnline, staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await syncManager.api.post('/leaves', fd);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setShowForm(false); toast.success('Leave application submitted'); },
    onError: err => toast.error(err.response?.data?.error || 'Submission failed'),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await syncManager.api.patch(`/leaves/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success(`Leave ${vars.status}`); },
    onError: () => toast.error('Action failed'),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { employee_id: '', leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '', alternate_arrangement: '' },
  });

  const leaves = data?.leaves || [];
  const pending  = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;

  return (
    <PageWrap>
      <PageHead
        title="Leave Management"
        subtitle="Apply for leave and track approval status"
        crumbs={['Home', 'HRMS', 'Leave Form']}
        actions={<Btn variant="primary" size="sm" onClick={() => setShowForm(true)}>+ Apply Leave</Btn>}
      />

      <KPIGrid>
        <KPICard label="Total Applications" value={leaves.length} color="blue"  />
        <KPICard label="Pending Approval"   value={pending}       color="amber" />
        <KPICard label="Approved"           value={approved}      color="green" />
        <KPICard label="Rejected"           value={leaves.filter(l => l.status === 'rejected').length} color="red" />
      </KPIGrid>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${statusFilter === v ? 'var(--blu)' : 'var(--bdr)'}`,
              background: statusFilter === v ? 'var(--blu)' : 'var(--bg)',
              color: statusFilter === v ? '#fff' : 'var(--txt2)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--fb)', fontWeight: statusFilter === v ? 600 : 400,
            }}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        <DataTable
          loading={isLoading || !isOnline}
          data={leaves}
          emptyMsg={isOnline ? 'No leave applications' : 'Go online to view leave applications'}
          columns={[
            {
              header: 'Employee', key: 'employee_name',
              render: (v, r) => <div><strong style={{ fontSize: 12 }}>{v}</strong><div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.employee_no}</div></div>,
            },
            { header: 'Type',    key: 'leave_type',    render: v => <Badge>{v}</Badge> },
            { header: 'From',    key: 'from_date',     render: v => <span style={{ fontSize: 11 }}>{fmtDate(v)}</span> },
            { header: 'To',      key: 'to_date',       render: v => <span style={{ fontSize: 11 }}>{fmtDate(v)}</span> },
            { header: 'Days',    key: 'total_days',    render: v => <span style={{ fontFamily: 'var(--fm)', fontWeight: 700 }}>{v}</span> },
            { header: 'Reason',  key: 'reason',        render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{String(v || '').slice(0, 35)}{v?.length > 35 ? '…' : ''}</span> },
            {
              header: 'Status', key: 'status',
              render: v => <Badge color={v === 'approved' ? 'green' : v === 'rejected' ? 'red' : 'amber'}>{v}</Badge>,
            },
            {
              header: 'Actions', key: 'id',
              render: (id, r) => r.status === 'pending' ? (
                <div style={{ display: 'flex', gap: 5 }}>
                  <Btn variant="success" size="xs" onClick={() => approveMutation.mutate({ id, status: 'approved' })}>✓ Approve</Btn>
                  <Btn variant="danger"  size="xs" onClick={() => approveMutation.mutate({ id, status: 'rejected' })}>✕ Reject</Btn>
                </div>
              ) : <span style={{ fontSize: 11, color: 'var(--txt4)' }}>—</span>,
            },
          ]}
        />
      </Card>

      {showForm && (
        <Modal
          title="Leave Application"
          sub="Submit a leave request for approval"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting…' : '📄 Submit Application'}
              </Btn>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Employee" required error={errors.employee_id?.message}>
                <select {...register('employee_id', { required: 'Required' })} style={inputStyle(errors.employee_id)}>
                  <option value="">Select employee…</option>
                  {(employees || []).map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.employee_no}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Leave Type" required>
              <select {...register('leave_type')} style={inputStyle()}>
                {(leaveReasons || []).map(r => <option key={r.id}>{r.name}</option>)}
                {['Casual Leave','Medical Leave','Earned Leave','Maternity Leave','On Duty'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Leave Reason">
              <select {...register('leave_reason_id')} style={inputStyle()}>
                <option value="">Select reason…</option>
                {(leaveReasons || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="From Date" required error={errors.from_date?.message}>
              <input type="date" {...register('from_date', { required: 'Required' })} style={inputStyle(errors.from_date)} />
            </Field>
            <Field label="To Date" required error={errors.to_date?.message}>
              <input type="date" {...register('to_date', { required: 'Required' })} style={inputStyle(errors.to_date)} />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Reason" required error={errors.reason?.message}>
                <textarea rows={3} {...register('reason', { required: 'Required' })} placeholder="Reason for leave…"
                  style={{ ...inputStyle(errors.reason), resize: 'vertical', minHeight: 72 }} />
              </Field>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Alternate Arrangement">
                <input {...register('alternate_arrangement')} placeholder="Who will cover during absence?" style={inputStyle()} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}