import React from 'react';

import { ID } from '../../../services/types/api.types';
import { SALE_TYPES } from './constants';

const filterSelectStyle = {
  padding: '6px 24px 6px 8px',
  borderRadius: 6,
  border: '1px solid var(--bdr2)',
  fontSize: 12,
  fontFamily: 'var(--fb)',
  color: 'var(--txt)',
  background: 'var(--bg)',
  minWidth: 120,
  maxWidth: 200,
  cursor: 'pointer',
  outline: 'none',
};

function FilterField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
        {label}
        {required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </span>
      {children}
    </div>
  );
}

const Q_ROMAN = ['I', 'II', 'III', 'IV'];

export function FilterBar({
  isOnline,
  saleType,
  setSaleType,
  financialYearId,
  setFinancialYearId,
  fyData,
  schemeId,
  setSchemeId,
  schemes,
  quarterId,
  setQuarterId,
  quartersForFy,
  districtId,
  setDistrictId,
  districts,
  institutionTypeId,
  setInstitutionTypeId,
  institutionTypes,
  placeOfWorkingId,
  setPlaceOfWorkingId,
  filteredPlaces,
  activeTab,
  toPlaceOfWorkingId,
  setToPlaceOfWorkingId,
  onSearch,
}: {
  isOnline: boolean;
  saleType: string;
  setSaleType: (t: string) => void;
  financialYearId: any;
  setFinancialYearId: (id: any) => void;
  fyData: any[];
  schemeId: any;
  setSchemeId: (id: any) => void;
  schemes: any[];
  quarterId: any;
  setQuarterId: (id: any) => void;
  quartersForFy: any[];
  districtId: any;
  setDistrictId: (id: any) => void;
  districts: any[];
  institutionTypeId: any;
  setInstitutionTypeId: (id: any) => void;
  institutionTypes: any[];
  placeOfWorkingId: any;
  setPlaceOfWorkingId: (id: any) => void;
  filteredPlaces: any[];
  activeTab: string;
  toPlaceOfWorkingId: any;
  setToPlaceOfWorkingId: (id: any) => void;
  onSearch: () => void;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid var(--bdr)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <FilterField label="Category type" required>
        <select
          value={saleType}
          onChange={(e) => setSaleType(e.target.value)}
          aria-label="Category type"
          disabled={!isOnline}
          style={{ ...filterSelectStyle, minWidth: 160 }}
        >
          {SALE_TYPES.map(({ id, label }: any) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Financial Year" required>
        <select
          value={financialYearId}
          onChange={(e) => setFinancialYearId(e.target.value)}
          disabled={!isOnline}
          style={filterSelectStyle}
        >
          <option value="">Select…</option>
          {(fyData || []).map((f: any) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Scheme" required>
        <select
          value={schemeId}
          onChange={(e) => setSchemeId(e.target.value)}
          disabled={!isOnline}
          style={filterSelectStyle}
        >
          <option value="">Select…</option>
          {(schemes || []).map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Quarter" required>
        <select
          value={quarterId}
          onChange={(e) => setQuarterId(e.target.value)}
          disabled={!isOnline}
          style={filterSelectStyle}
        >
          <option value="">Select…</option>
          {(quartersForFy || []).map((q: any) => (
            <option key={q.id} value={q.id}>
              {Q_ROMAN[q.quarter_no - 1] || q.quarter_no}
              {q.fy_label ? ` · ${q.fy_label}` : ''}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="District" required>
        <select
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          disabled={!isOnline}
          style={{ ...filterSelectStyle, minWidth: 140 }}
        >
          <option value="">Select…</option>
          {(districts || []).map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Institution Type" required>
        <select
          value={institutionTypeId}
          onChange={(e) => setInstitutionTypeId(e.target.value)}
          disabled={!isOnline}
          style={filterSelectStyle}
        >
          <option value="">Select…</option>
          {(institutionTypes || []).map((it: any) => (
            <option key={it.id} value={it.id}>
              {it.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Place of Working" required>
        <select
          value={placeOfWorkingId}
          onChange={(e) => setPlaceOfWorkingId(e.target.value)}
          disabled={!isOnline}
          style={{ ...filterSelectStyle, maxWidth: 260 }}
        >
          <option value="">Select…</option>
          {(filteredPlaces || []).map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FilterField>

      {activeTab === 'transfer' && (
        <FilterField label="To Place of Working" required>
          <select
            value={toPlaceOfWorkingId}
            onChange={(e) => setToPlaceOfWorkingId(e.target.value)}
            disabled={!isOnline}
            style={{
              ...filterSelectStyle,
              maxWidth: 260,
              borderColor: 'var(--blu-bdr)',
              background: 'var(--blu-lt)',
            }}
          >
            <option value="">Select destination…</option>
            {(filteredPlaces || [])
              .filter((p: any) => p.id !== placeOfWorkingId)
              .map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </FilterField>
      )}

      <button
        type="button"
        onClick={onSearch}
        disabled={!isOnline}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 6,
          border: 'none',
          background: !isOnline ? 'var(--bdr2)' : 'var(--blu)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: !isOnline ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--fb)',
          marginBottom: 1,
        }}
      >
        🔍 Search
      </button>
    </div>
  );
}
