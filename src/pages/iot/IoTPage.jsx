// src/pages/iot/IoTPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import { PageWrap, PageHead, KPIGrid, KPICard, Card, CardHead, DataTable, Badge, Btn } from '../../components/ui';

const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

export default function IoTPage() {
  const { isOnline } = useSync();
  const [liveReadings, setLiveReadings] = useState({});

  const { data: summary, refetch } = useQuery({
    queryKey: ['iot-summary'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/iot/summary');
      return data;
    },
    enabled: isOnline,
    refetchInterval: 5_000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['iot-alerts'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/iot/alerts?limit=30');
      return data;
    },
    enabled: isOnline,
    refetchInterval: 10_000,
  });

  const sensors      = summary?.sensors || [];
  const alertCount   = summary?.alert_count || 0;
  const coldChain    = sensors.filter(s => s.sensor_type === 'cold_chain');
  const dispensary   = sensors.filter(s => s.sensor_type !== 'cold_chain');

  const SensorTile = ({ s }) => {
    const isAlert = s.is_alert;
    const temp    = s.temperature != null ? parseFloat(s.temperature).toFixed(1) : '—';
    const humid   = s.humidity != null ? parseInt(s.humidity) : '—';
    return (
      <div style={{
        border: `1px solid ${isAlert ? 'var(--red-bdr)' : 'var(--bdr)'}`,
        background: isAlert ? 'var(--red-lt)' : 'var(--bg)',
        borderRadius: 10, padding: '12px 14px',
        boxShadow: 'var(--sh1)', transition: 'var(--t)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: isAlert ? 'var(--red)' : 'var(--txt3)' }}>
            {s.sensor_type === 'cold_chain' ? '❄ Cold Storage' : '🏥 Dispensary'}
          </span>
          <span style={{ fontSize: 9, color: isAlert ? 'var(--red)' : 'var(--grn)', fontWeight: 700 }}>
            {isAlert ? '⚠ ALERT' : '● OK'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--txt4)', marginBottom: 8 }}>{s.sensor_id}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 700, color: isAlert ? 'var(--red)' : 'var(--txt)', lineHeight: 1 }}>
              {temp}°
            </div>
            <div style={{ fontSize: 9, color: 'var(--txt4)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>Temperature</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>{humid}%</div>
            <div style={{ fontSize: 9, color: 'var(--txt4)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>Humidity</div>
          </div>
        </div>
        {s.sensor_type === 'cold_chain' && (
          <div style={{
            padding: '3px 10px', borderRadius: 20, textAlign: 'center',
            background: isAlert ? 'var(--red)' : 'var(--grn-lt)',
            color: isAlert ? '#fff' : 'var(--grn)',
            fontSize: 10, fontWeight: 700, marginBottom: 6,
          }}>
            {isAlert ? '⚠ OUT OF RANGE (2–8°C)' : '✓ Safe Range 2–8°C'}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--txt4)', marginTop: 4 }}>
          <span>{s.location || '—'}</span>
          <span>{fmtTime(s.recorded_at)}</span>
        </div>
        {s.battery_pct != null && (
          <div style={{ fontSize: 9, color: 'var(--txt4)', marginTop: 2 }}>
            🔋 {s.battery_pct}% · 📶 {s.signal || 'Unknown'}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageWrap>
      <PageHead
        title="IoT Sensors"
        subtitle={`Real-time cold-chain monitoring · ${sensors.length} sensors online`}
        crumbs={['Home', 'IoT Sensors']}
        actions={
          <>
            <Badge color="green" style={{ animation: 'pulse 1.5s infinite' }}>● LIVE</Badge>
            <Btn variant="ghost" size="sm" onClick={() => refetch()}>↻ Refresh</Btn>
          </>
        }
      />

      {alertCount > 0 && (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#991b1b' }}>
          ⚠ <strong>Cold-chain Alert ({alertCount} sensor{alertCount > 1 ? 's' : ''}):</strong>{' '}
          Temperature outside safe range 2–8°C. Vaccine integrity may be compromised. Immediate action required.
        </div>
      )}

      <KPIGrid>
        <KPICard label="Sensors Online" value={sensors.length}    color="green" />
        <KPICard label="In Alert"       value={alertCount}         color={alertCount > 0 ? 'red' : 'green'} />
        <KPICard label="Cold Chain"     value={coldChain.length}  color="blue"  />
        <KPICard label="Dispensaries"   value={dispensary.length} color="teal"  />
      </KPIGrid>

      {/* Cold chain sensors */}
      {coldChain.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 10, fontFamily: 'var(--fd)' }}>❄ Cold Chain Storage</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
            {coldChain.map(s => <SensorTile key={s.sensor_uuid} s={s} />)}
          </div>
        </>
      )}

      {/* Dispensary sensors */}
      {dispensary.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 10, fontFamily: 'var(--fd)' }}>🏥 Dispensary / Clinic Sensors</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
            {dispensary.map(s => <SensorTile key={s.sensor_uuid} s={s} />)}
          </div>
        </>
      )}

      {!sensors.length && (
        <Card>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
            {isOnline ? 'No sensors registered. Add sensors from Settings.' : 'Go online to view sensor data.'}
          </div>
        </Card>
      )}

      {/* Alert history */}
      {(alerts || []).length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <CardHead title="⚠ Cold-Chain Alert History" sub={`${(alerts || []).length} alerts recorded`} />
          <DataTable
            data={alerts || []}
            columns={[
              { header: 'Sensor',      key: 'sensor_code',    render: v => <span style={{ fontFamily: 'var(--fm)', fontWeight: 700 }}>{v}</span> },
              { header: 'Location',    key: 'location_name',  render: v => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
              { header: 'Temp. (°C)',  key: 'temperature',    render: v => <span style={{ color: 'var(--red)', fontWeight: 700, fontFamily: 'var(--fm)' }}>{v}°C</span> },
              { header: 'Humidity',   key: 'humidity',        render: v => <span style={{ fontFamily: 'var(--fm)' }}>{v}%</span> },
              { header: 'Time',       key: 'recorded_at',     render: v => <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmtTime(v)}</span> },
              { header: 'Status',     key: 'is_alert',        render: v => <Badge color="red">⚠ OUT OF RANGE</Badge> },
            ]}
          />
        </Card>
      )}
    </PageWrap>
  );
}