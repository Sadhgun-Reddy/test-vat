import React from 'react';
import { inputStyle } from '../../../components/ui';
import { InstitutionTypeMultiDropdown } from '../components/InstitutionTypeMultiDropdown';
import { FormHeaderState } from '../hooks/useBudgetReducer';
import { ID } from '../../../services/types/api.types';
import { InstitutionType, FinancialYear, Quarter, Scheme } from '../../../services/types/settings.types';

const QUARTER_ROMAN = ['I', 'II', 'III', 'IV'];

const TABLE_CTRL = {
  minHeight: 36,
  boxSizing: 'border-box' as const,
};

type BudgetFilterBarProps = {
  formHeader: FormHeaderState;
  updateFormHeader: (payload: Partial<FormHeaderState>) => void;
  setFinancialYear: (payload: ID | '') => void;
  institutionTypes: InstitutionType[];
  financialYears: FinancialYear[];
  modalQuarters: Quarter[];
  schemeSelectOptions: Scheme[];
  schemeSelectHint: string | null;
  isOnline: boolean;
};

export const BudgetFilterBar: React.FC<BudgetFilterBarProps> = ({
  formHeader,
  updateFormHeader,
  setFinancialYear,
  institutionTypes,
  financialYears,
  modalQuarters,
  schemeSelectOptions,
  schemeSelectHint,
  isOnline,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ minWidth: 0, gridColumn: '1 / -1' }}>
        <InstitutionTypeMultiDropdown
          types={institutionTypes}
          value={formHeader.institution_type_ids}
          onChange={(ids) => updateFormHeader({ institution_type_ids: ids })}
          disabled={!isOnline}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <select
          value={formHeader.financial_year_id}
          onChange={(e) => setFinancialYear(e.target.value)}
          style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px', width: '100%' }}
        >
          <option value="">Select financial year…</option>
          {financialYears.map((fy) => (
            <option key={fy.id} value={fy.id}>
              {fy.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ minWidth: 0 }}>
        <select
          value={formHeader.scheme_id}
          onChange={(e) => updateFormHeader({ scheme_id: e.target.value })}
          style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px', width: '100%' }}
          disabled={!formHeader.financial_year_id}
        >
          <option value="">
            {formHeader.financial_year_id ? '(Optional) No scheme' : 'Select financial year first…'}
          </option>
          {schemeSelectOptions.map((s: any) => {
            const fy = s.financial_year || s.financial_year_label;
            const suffix =
              fy && String(s.financial_year_id || '') !== String(formHeader.financial_year_id)
                ? ` · ${fy}`
                : '';
            return (
              <option key={s.id} value={s.id}>
                {`${s.name || 'Scheme'}${suffix}`}
              </option>
            );
          })}
        </select>
        {schemeSelectHint && (
          <div style={{ fontSize: 9, color: 'var(--txt3)', marginTop: 4, lineHeight: 1.35 }}>
            {schemeSelectHint}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <select
          value={formHeader.quarter_id}
          onChange={(e) => updateFormHeader({ quarter_id: e.target.value })}
          style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px', width: '100%' }}
          disabled={!!formHeader.financial_year_id && modalQuarters.length === 0}
        >
          <option value="">Select quarter…</option>
          {(formHeader.financial_year_id ? modalQuarters : modalQuarters).map((q: any) => (
            <option key={q.id} value={q.id}>
              Q{QUARTER_ROMAN[Number(q.quarter_no) - 1] || q.quarter_no}
              {q.fy_label ? ` · ${q.fy_label}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div style={{ minWidth: 0 }}>
        <input
          type="number"
          min={0}
          value={formHeader.total_budget_cap}
          onChange={(e) => updateFormHeader({ total_budget_cap: e.target.value })}
          placeholder="Total budget cap"
          style={{ ...inputStyle(), ...TABLE_CTRL, padding: '8px 10px', width: '100%' }}
        />
      </div>
    </div>
  );
};
