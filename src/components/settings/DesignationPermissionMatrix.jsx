import React from 'react';
import { DESIGNATION_PERMISSION_MATRIX } from '../../constants/designationPermissionMatrix';

const FLAGS = ['view', 'add', 'edit', 'delete'];

function FlagCell({ value, rowId, flag, onToggle, enabled }) {
  if (!enabled) {
    return (
      <td
        style={{
          textAlign: 'center',
          padding: '6px 4px',
          borderBottom: '1px solid var(--bdr)',
          background: 'var(--bg2)',
        }}
      />
    );
  }
  return (
    <td style={{ textAlign: 'center', padding: '6px 4px', borderBottom: '1px solid var(--bdr)' }}>
      <input
        type="checkbox"
        checked={!!value?.[rowId]?.[flag]}
        onChange={() => onToggle(rowId, flag)}
        aria-label={`${rowId} ${flag}`}
        style={{ cursor: 'pointer' }}
      />
    </td>
  );
}

export function DesignationPermissionMatrix({ value, onChange }) {
  const v = value && typeof value === 'object' ? value : {};

  const onToggle = (rowId, flag) => {
    const row = { ...(v[rowId] || {}) };
    const nextVal = !row[flag];
    row[flag] = nextVal;
    if (flag !== 'view' && nextVal) row.view = true;
    onChange({ ...v, [rowId]: row });
  };

  const anyImport = DESIGNATION_PERMISSION_MATRIX.some((s) => s.rows.some((r) => r.import));
  const colSpan = 1 + FLAGS.length + (anyImport ? 1 : 0);

  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: 'var(--bg1)' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderBottom: '2px solid var(--bdr)',
                minWidth: 200,
                position: 'sticky',
                left: 0,
                background: 'var(--bg1)',
                zIndex: 1,
              }}
            >
              Module
            </th>
            {FLAGS.map((f) => (
              <th
                key={f}
                style={{
                  padding: '8px 6px',
                  borderBottom: '2px solid var(--bdr)',
                  color: 'var(--txt2)',
                  fontWeight: 600,
                  width: 56,
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </th>
            ))}
            {anyImport && (
              <th
                style={{
                  padding: '8px 6px',
                  borderBottom: '2px solid var(--bdr)',
                  color: 'var(--txt2)',
                  fontWeight: 600,
                  width: 56,
                }}
              >
                Import
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {DESIGNATION_PERMISSION_MATRIX.map((block) => (
            <React.Fragment key={block.section}>
              <tr>
                <td
                  colSpan={colSpan}
                  style={{
                    padding: '10px 8px 6px',
                    fontWeight: 700,
                    fontSize: 11,
                    color: 'var(--blu)',
                    background: 'var(--bg2)',
                    borderTop: '1px solid var(--bdr)',
                  }}
                >
                  {block.section}
                </td>
              </tr>
              {block.rows.map((row) => (
                <tr key={row.id}>
                  <td
                    style={{
                      padding: '6px 10px',
                      borderBottom: '1px solid var(--bdr)',
                      position: 'sticky',
                      left: 0,
                      background: 'var(--bg)',
                      zIndex: 1,
                    }}
                  >
                    {row.label}
                  </td>
                  {FLAGS.map((f) => (
                    <FlagCell
                      key={f}
                      value={v}
                      rowId={row.id}
                      flag={f}
                      onToggle={onToggle}
                      enabled={row.modes.includes(f)}
                    />
                  ))}
                  {anyImport && (
                    <FlagCell
                      value={v}
                      rowId={row.id}
                      flag="import"
                      onToggle={onToggle}
                      enabled={!!row.import}
                    />
                  )}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
