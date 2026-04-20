import React, { useMemo } from 'react';
import { ID } from '../../../services/types/api.types';
import { InstitutionType } from '../../../services/types/settings.types';

const TABLE_CTRL = {
  minHeight: 36,
  boxSizing: 'border-box' as const,
};

type InstitutionTypeMultiDropdownProps = {
  types: InstitutionType[];
  value: ID[];
  onChange: (ids: ID[]) => void;
  disabled: boolean;
};

export const InstitutionTypeMultiDropdown: React.FC<InstitutionTypeMultiDropdownProps> = ({
  types,
  value,
  onChange,
  disabled,
}) => {
  const sel = useMemo(() => new Set((value || []).map(String)), [value]);
  const selectedRows = useMemo(
    () => (types || []).filter((t: any) => t.is_active !== false && sel.has(String(t.id))),
    [types, sel]
  );

  const remove = (id: ID) => onChange((value || []).filter((x) => String(x) !== String(id)));
  const add = (id: ID) => {
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
        background: disabled ? 'var(--bg2)' : 'var(--bg1)',
        cursor: disabled ? 'not-allowed' : 'default',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {selectedRows.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px 2px 8px',
            background: 'var(--bg2)',
            border: '1px solid var(--bdr)',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--txt)',
          }}
        >
          <span>{t.name}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(t.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: 'var(--txt3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
              title="Remove"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}

      <select
        value=""
        onChange={(e) => add(e.target.value)}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 120,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--txt)',
          fontSize: 13,
          padding: '4px 0',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="" disabled hidden>
          {selectedRows.length ? 'Add another type…' : 'Select institution types…'}
        </option>
        {(types || [])
          .filter((t: any) => t.is_active !== false && !sel.has(String(t.id)))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>

      {selectedRows.length > 0 && !disabled && (
        <button
          type="button"
          onClick={clearAll}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: 'var(--txt3)',
            marginLeft: 'auto',
          }}
          title="Clear all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};
