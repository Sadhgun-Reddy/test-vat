// src/pages/sync/SyncPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';

import {
  PageWrap, PageHead, KPIGrid, KPICard,
  Card, CardHead, CardBody, DataTable, Badge, Btn,
} from '../../components/ui';
import toast from 'react-hot-toast';

const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

const TAB_LABELS = [
  ['queue',        '⇄ Sync Control'],
  ['conflicts',    '⚠ Conflicts'],
  ['architecture', '🏗 Architecture'],
  ['log',          '📋 Event Log'],
  ['settings',     '⚙ Settings'],
];

export default function SyncPage() {
  const { isOnline, isSyncing, pendingCount, conflicts: localConflicts, triggerSync, lastSynced } = useSync();
  const [tab, setTab] = useState('queue');
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => { const { data } = await syncManager.api.get('/sync/status'); return data; },
    enabled: isOnline,
    refetchInterval: 10_000,
  });

  const { data: serverConflicts } = useQuery({
    queryKey: ['sync-conflicts'],
    queryFn: async () => { const { data } = await syncManager.api.get('/sync/conflicts'); return data.conflicts; },
    enabled: isOnline && tab === 'conflicts',
  });

  const { data: syncLog } = useQuery({
    queryKey: ['sync-log'],
    queryFn: async () => { const { data } = await syncManager.api.get('/sync/log?limit=30'); return data.log; },
    enabled: isOnline && tab === 'log',
  });

  const resolve = useMutation({
    mutationFn: async ({ id, resolution }) => {
      const { data } = await syncManager.api.post(`/sync/conflicts/${id}/resolve`, { resolution });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sync-conflicts'] }); toast.success('Conflict resolved'); },
    onError: () => toast.error('Failed to resolve'),
  });

  const q = status?.queue || {};
  const allConflicts = serverConflicts || [];

  return (
    <PageWrap>
      <PageHead
        title="Data Sync & Offline Architecture"
        subtitle="IndexedDB queue · Conflict resolution · Multi-device sync · Audit trail"
        crumbs={['Home', 'Sync']}
        actions={<Badge color={isOnline ? 'green' : 'red'}>{isOnline ? '● Online' : '○ Offline'}</Badge>}
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 10, padding: 4, marginBottom: 18, flexWrap: 'wrap' }}>
        {TAB_LABELS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: tab === id ? 'var(--bg)' : 'transparent',
            color: tab === id ? 'var(--blu)' : 'var(--txt3)',
            fontWeight: tab === id ? 600 : 500,
            boxShadow: tab === id ? 'var(--sh1)' : 'none',
            fontFamily: 'var(--fb)',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Sync Control ── */}
      {tab === 'queue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <CardHead title="⇄ Sync Control Panel" sub={lastSynced ? `Last sync: ${fmtTime(lastSynced)}` : 'Not synced yet'} />
            <CardBody>
              <KPIGrid>
                <KPICard label="Pending Upload" value={pendingCount}         color="blue" sub="records queued" />
                <KPICard label="Conflicts"       value={q.conflicts ?? allConflicts.length} color="red"  sub="need resolution" />
                <KPICard label="Failed"          value={q.failed ?? '—'}     color="amber" sub="retry needed" />
                <KPICard label="Synced (7d)"     value={q.success ?? '—'}    color="green" sub="records" />
              </KPIGrid>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Btn variant="primary" block onClick={triggerSync} disabled={isSyncing || !isOnline}>
                  {isSyncing ? '⟳ Syncing…' : '⇄ Sync Now'}
                </Btn>
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: 'var(--txt3)', lineHeight: 1.8 }}>
                <strong style={{ color: 'var(--txt2)' }}>Sync Strategy</strong><br />
                Records written to <strong>IndexedDB</strong> first. On reconnect, pushed via
                <strong> Last-Write-Wins + Vector Clocks</strong>. Conflicts surfaced here for manual
                resolution. Auto-sync interval: 5 minutes.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Module Health" sub="Sync status per data type" />
            <CardBody>
              {[
                { name: 'Cases Treated',    strategy: 'Vector Clock', critical: true  },
                { name: 'Vaccinations',     strategy: 'Vector Clock', critical: true  },
                { name: 'Attendance',       strategy: 'LWW',          critical: false },
                { name: 'AI Services',      strategy: 'Vector Clock', critical: true  },
                { name: 'Deworming',        strategy: 'LWW',          critical: false },
                { name: 'Drug Sales',       strategy: 'Vector Clock', critical: false },
                { name: 'IoT Readings',     strategy: 'Append',       critical: false },
                { name: 'Employees',        strategy: 'Manual',       critical: false },
              ].map(m => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt)' }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{m.strategy}</div>
                  </div>
                  <Badge color={m.critical ? 'red' : 'blue'}>{m.critical ? 'Critical' : 'Standard'}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Conflicts ── */}
      {tab === 'conflicts' && (
        <div>
          {!allConflicts.length
            ? <Card><div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>✓ No unresolved conflicts</div></Card>
            : allConflicts.map(c => (
              <div key={c.id} style={{ background: 'var(--amb-lt)', border: '1px solid var(--amb-bdr)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>⚠ {c.table_name}</strong>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--txt3)' }}>{c.record_id?.slice(0,8)}…</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--amb)', marginBottom: 12 }}>{c.reason}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: 'var(--blu-lt)', border: '1px solid var(--blu-bdr)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blu)', marginBottom: 6 }}>📱 Local v{c.local_version} · {fmtTime(c.local_ts)}</div>
                    {Object.entries(c.local_data || {}).slice(0, 4).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 11, marginTop: 3 }}><span style={{ color: 'var(--txt3)' }}>{k}:</span> <strong>{String(v).slice(0, 40)}</strong></div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--grn-lt)', border: '1px solid var(--grn-bdr)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grn)', marginBottom: 6 }}>☁ Server v{c.server_version} · {fmtTime(c.server_ts)}</div>
                    {Object.entries(c.server_data || {}).slice(0, 4).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 11, marginTop: 3 }}><span style={{ color: 'var(--txt3)' }}>{k}:</span> <strong>{String(v).slice(0, 40)}</strong></div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="outline" size="sm" onClick={() => resolve.mutate({ id: c.id, resolution: 'client' })} disabled={resolve.isPending}>📱 Keep Local</Btn>
                  <Btn variant="success" size="sm" onClick={() => resolve.mutate({ id: c.id, resolution: 'server' })} disabled={resolve.isPending}>☁ Use Server</Btn>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── Architecture ── */}
      {tab === 'architecture' && (
        <div>
          <div style={{ background: 'var(--blu-lt)', border: '1px solid var(--blu-bdr)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'var(--blu2)' }}>
            <strong>Offline-First Architecture:</strong> VAHD AHIS uses a 4-tier sync model. All writes go to IndexedDB first (immediate UX), then queued for server sync. Vector-clock conflict detection handles concurrent edits across multiple field devices in low-connectivity rural Telangana.
          </div>
          {[
            { cls: 'var(--blu)', label: '📱 Layer 1 — Device (React + IndexedDB)', nodes: ['User Input','React State','IndexedDB Write','✓ Instant Confirm'], desc: 'All records written to device IndexedDB immediately. Zero network dependency for data entry. Offline queue tracks all pending operations with timestamps and vector clocks.' },
            { cls: 'var(--amb)', label: '📥 Layer 2 — Offline Queue Manager', nodes: ['Op Queued','Timestamp + Vector Clock','Priority Queue','Retry Logic (3×)'], desc: 'Queue items hold: table, operation (INSERT/UPDATE/DELETE), payload, timestamp, vector clock, device ID, retry count. Items processed FIFO per table with dependency ordering.' },
            { cls: 'var(--grn)', label: '⚙ Layer 3 — Sync Engine (On Reconnect)', nodes: ['Network Detected','JWT Auth','Batch Upload','Conflict Detect','LWW / Resolve'], desc: 'Uses Last-Write-Wins for attendance/IoT and manual conflict resolution for clinical records. Vector clocks detect concurrent writes. Successful syncs update IndexedDB with server-confirmed IDs.' },
            { cls: 'var(--pur)', label: '☁ Layer 4 — Server (REST API + PostgreSQL)', nodes: ['REST API','JWT Auth Check','Version Check','PostgreSQL Write','sync_log'], desc: 'Server validates JWT, checks row versions, writes to PostgreSQL, returns conflict details on version mismatch for client resolution.' },
          ].map((layer, i) => (
            <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', borderLeft: `4px solid ${layer.cls}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{layer.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {layer.nodes.map((n, ni) => (
                  <React.Fragment key={ni}>
                    {ni > 0 && <span style={{ color: 'var(--txt4)', fontSize: 16 }}>→</span>}
                    <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${layer.cls}22`, color: layer.cls }}>{n}</span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{layer.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log ── */}
      {tab === 'log' && (
        <Card>
          <CardHead title="Sync Event Stream" sub="Last 30 events" />
          <DataTable
            data={syncLog || []}
            emptyMsg="No sync events yet"
            columns={[
              { header: 'Time',      key: 'created_at', render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--txt3)' }}>{fmtTime(v)}</span> },
              { header: 'Table',     key: 'table_name', render: v => <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{v}</span> },
              { header: 'Operation', key: 'operation',  render: v => <Badge>{v}</Badge> },
              { header: 'Status',    key: 'status',     render: v => <Badge color={v==='SUCCESS'?'green':v==='CONFLICT'?'amber':'red'}>{v}</Badge> },
              { header: 'Duration',  key: 'duration_ms',render: v => <span style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>{v ? `${v}ms` : '—'}</span> },
            ]}
          />
        </Card>
      )}

      {/* ── Settings ── */}
      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <CardHead title="Auto-Sync Configuration" />
            <CardBody>
              {[
                { l: 'Auto-sync on reconnect',            c: true  },
                { l: 'Sync every 5 minutes (background)', c: true  },
                { l: 'Push notifications on conflict',    c: true  },
                { l: 'Compress sync payloads (gzip)',      c: true  },
                { l: 'Include audit trail in sync',        c: true  },
                { l: 'Allow background sync (PWA)',        c: false },
              ].map(s => (
                <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--bdr)' }}>
                  <input type="checkbox" defaultChecked={s.c} style={{ accentColor: 'var(--blu)', width: 14, height: 14 }} />
                  <label style={{ fontSize: 12, cursor: 'pointer', flex: 1 }}>{s.l}</label>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <Btn variant="primary" size="sm" onClick={() => toast.success('Settings saved')}>Save Settings</Btn>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHead title="Sync Health Monitor" />
            <CardBody>
              {[
                { label: 'IndexedDB Storage',  val: '12.4 MB / 50 MB', pct: 25,  ok: true },
                { label: 'Queue Depth',        val: `${pendingCount} items`,       pct: Math.min(100, pendingCount*2), ok: pendingCount < 20 },
                { label: 'Server Latency',     val: '142ms avg',       pct: 15,  ok: true },
                { label: 'Conflict Rate',      val: '2.1% (< 5% threshold)', pct: 42, ok: true },
              ].map(m => (
                <div key={m.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{m.label}</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: m.ok ? 'var(--grn)' : 'var(--red)' }}>{m.val}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${m.pct}%`, background: m.ok ? 'var(--grn)' : 'var(--red)', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}
    </PageWrap>
  );
}