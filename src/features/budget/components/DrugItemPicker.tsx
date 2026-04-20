import React, { useState, useMemo } from 'react';
import { inputStyle } from '../../../components/ui';
import { ID } from '../../../services/types/api.types';
import { Drug } from '../../../services/types/drugs.types';

type DrugItemPickerProps = {
  drugs: Drug[];
  value: ID[];
  onChange: (ids: ID[]) => void;
  disabled: boolean;
};

export const DrugItemPicker: React.FC<DrugItemPickerProps> = ({ drugs, value, onChange, disabled }) => {
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sel = useMemo(() => new Set((value || []).map(String)), [value]);

  const activeDrugs = useMemo(() => (drugs || []).filter((d: any) => d.is_active !== false), [drugs]);

  const groups = useMemo(() => {
    const list = activeDrugs.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (d.code || '').toLowerCase().includes(q.toLowerCase())
    );
    const m = new Map<string, typeof list>();
    list.forEach((d) => {
      const c = d.category || 'Other';
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(d);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeDrugs, q]);

  const toggleCat = (cat: string) => {
    setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));
  };

  const selectCat = (catDrugs: any[], add: boolean) => {
    const next = new Set(sel);
    catDrugs.forEach((d) => {
      if (add) next.add(String(d.id));
      else next.delete(String(d.id));
    });
    onChange(Array.from(next));
  };

  const toggleDrug = (id: ID) => {
    const s = String(id);
    const next = new Set(sel);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange(Array.from(next));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search drugs by name or code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...inputStyle(), width: '100%', padding: '10px 12px' }}
        />
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid var(--bdr)',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        {groups.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
            No drugs found.
          </div>
        ) : null}
        {groups.map(([cat, list]) => {
          const isCol = collapsed[cat];
          const catSel = list.filter((d) => sel.has(String(d.id))).length;
          const allSel = catSel === list.length && list.length > 0;
          const someSel = catSel > 0 && catSel < list.length;
          return (
            <div key={cat} style={{ borderBottom: '1px solid var(--bdr)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg1)',
                  padding: '8px 12px',
                }}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={allSel}
                  ref={(el) => {
                    if (el) el.indeterminate = someSel;
                  }}
                  onChange={() => selectCat(list, !allSel)}
                  style={{ marginRight: 12 }}
                />
                <button
                  type="button"
                  onClick={() => toggleCat(cat)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--txt)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {cat} <span style={{ color: 'var(--txt3)', fontWeight: 400 }}>({list.length})</span>
                  </span>
                  <span style={{ fontSize: 18, color: 'var(--txt3)' }}>{isCol ? '+' : '−'}</span>
                </button>
              </div>
              {!isCol && (
                <div style={{ padding: '6px 12px 6px 36px', display: 'flex', flexDirection: 'column' }}>
                  {list.map((d) => (
                    <label
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '6px 0',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={sel.has(String(d.id))}
                        onChange={() => toggleDrug(d.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ lineHeight: 1.3 }}>
                        <div style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 500 }}>{d.name}</div>
                        {d.code && <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{d.code}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
