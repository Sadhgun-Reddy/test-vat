import { useMemo } from 'react';
import { useDrugs } from '../../../hooks/api/useDrugs';
import {
  useFinancialYears,
  useQuarters,
  useInstitutionTypes,
  useSchemes,
  useFormTypes,
} from '../../../hooks/api/useSettings';
import { ID } from '../../../services/types/api.types';

const FORM_TYPE_FALLBACK = [
  'Allopathic Medicine',
  'Ayurvedic Medicine',
  'Homoeopathic Medicine',
  'Siddha Medicine',
  'Unani Medicine',
  'Medical devices & supplies',
  'Other',
];

export const useBudgetFilters = (financialYearId: ID | '', isOnline: boolean, showForm: boolean) => {
  const financialYearsQ = useFinancialYears();
  const quartersQ = useQuarters();
  const drugsQ = useDrugs({ enabled: isOnline && showForm });
  const institutionTypesQ = useInstitutionTypes();
  const schemesQ = useSchemes();
  const formTypesQ = useFormTypes();

  const financialYears = financialYearsQ.data || [];
  const quarters = quartersQ.data || [];
  const drugs = drugsQ.data || [];
  const institutionTypes = institutionTypesQ.data || [];
  const schemesList = schemesQ.data || [];

  const formTypeOptions = useMemo(() => {
    const names = (formTypesQ.data || [])
      .map((r) => (r.name != null ? String(r.name).trim() : ''))
      .filter(Boolean);
    const uniq = [...new Set(names)].sort((a, b) => a.localeCompare(b));
    return uniq.length ? uniq : FORM_TYPE_FALLBACK;
  }, [formTypesQ.data]);

  const modalQuarters = useMemo(() => {
    if (!financialYearId) return quarters;
    return quarters.filter((q: any) => String(q.financialYearId || '') === String(financialYearId));
  }, [quarters, financialYearId]);

  const { schemeSelectOptions, schemeSelectHint } = useMemo(() => {
    if (!financialYearId) {
      return { schemeSelectOptions: schemesList, schemeSelectHint: null };
    }
    const forFy = schemesList.filter(
      (s: any) => String(s.financial_year_id || s.financialYearId || '') === String(financialYearId)
    );
    if (forFy.length > 0) {
      return { schemeSelectOptions: forFy, schemeSelectHint: null };
    }
    return {
      schemeSelectOptions: schemesList,
      schemeSelectHint: schemesList.length > 0
        ? 'No scheme is linked to this financial year in Settings → Scheme. Showing all schemes — pick one or leave blank.'
        : 'Add schemes under Settings → Scheme, or leave this blank to save without a scheme.',
    };
  }, [schemesList, financialYearId]);

  return {
    financialYears,
    quarters,
    modalQuarters,
    drugs,
    institutionTypes,
    schemesList,
    formTypeOptions,
    schemeSelectOptions,
    schemeSelectHint,
  };
};
