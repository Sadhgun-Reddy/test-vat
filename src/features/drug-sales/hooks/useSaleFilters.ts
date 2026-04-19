import { useEffect, useMemo, useRef, useState } from 'react';

import {
  useBudgetAllocationsForIndent,
  useDistricts,
  useFinancialYears,
  useInstitutionTypes,
  usePlacesOfWorking,
  usePurchaseOrders,
  usePurchasesForPO,
  useQuarters,
  useSchemes,
} from '../../../hooks/api';
import { ID } from '../../../services/types/api.types';

export type UseSaleFiltersProps = {
  isOnline: boolean;
  seedTab?: string;
  editFilterSeed?: any;
  userDistrictId?: ID;
  saleType: string;
};

export function useSaleFilters({
  isOnline,
  seedTab = 'purchase_order',
  editFilterSeed,
  userDistrictId,
  saleType,
}: UseSaleFiltersProps) {
  const [financialYearId, setFinancialYearId] = useState<ID>(
    editFilterSeed?.financial_year_id || ''
  );
  const [schemeId, setSchemeId] = useState<ID>(editFilterSeed?.scheme_id || '');
  const [quarterId, setQuarterId] = useState<ID>(editFilterSeed?.quarter_id || '');
  const [districtId, setDistrictId] = useState<ID>(editFilterSeed?.district_id || '');
  const [institutionTypeId, setInstitutionTypeId] = useState<ID>(
    editFilterSeed?.institution_type_id || ''
  );
  const [placeOfWorkingId, setPlaceOfWorkingId] = useState<ID>(
    editFilterSeed?.place_of_working_id || ''
  );

  const [toPlaceOfWorkingId, setToPlaceOfWorkingId] = useState<ID>('');

  const fyInitRef = useRef(false);
  const districtInitRef = useRef(false);

  // Queries
  const { data: fyData = [] } = useFinancialYears();
  const { data: schemes = [] } = useSchemes();
  const { data: quarters = [] } = useQuarters();
  const { data: districts = [] } = useDistricts();

  const institutionTypesRaw = useInstitutionTypes();

  const { data: allocDataRaw, isFetching: allocFetching } = useBudgetAllocationsForIndent({
    financial_year_id: financialYearId as ID,
    scheme_id: schemeId as ID,
    quarter_id: quarterId as ID,
    institution_type_id: institutionTypeId as ID,
  }, {
    enabled: isOnline && !!financialYearId && saleType === 'drug_indent'
  });

  const allocationsForIndent = Array.isArray((allocDataRaw as any)?.data) ? (allocDataRaw as any).data : (Array.isArray(allocDataRaw) ? allocDataRaw : []);
  const institutionTypes = Array.isArray((institutionTypesRaw as any).data)
    ? (institutionTypesRaw as any).data
    : (institutionTypesRaw as any).data?.data || [];

  const { data: placesRaw } = usePlacesOfWorking({ district_id: districtId as string });
  // Handle case where places is an array or paginated response. The old code expected an array.
  const places = Array.isArray(placesRaw) ? placesRaw : (placesRaw as any)?.data || [];
  const filteredPlaces = Array.isArray(places) ? places : [];

  // Filter quarters for selected financial year
  const quartersForFy = useMemo(() => {
    if (!financialYearId || !quarters?.length) return [];
    return quarters.filter((q: any) => q.financial_year_id === financialYearId);
  }, [quarters, financialYearId]);

  // Initialization effects
  useEffect(() => {
    if (!isOnline || fyInitRef.current || !fyData?.length || !schemes?.length || !quarters?.length)
      return;
    const fy = fyData.find((f: any) => f.is_current) || fyData[0];
    setFinancialYearId(fy.id);
    setSchemeId(schemes[0].id);
    const fq = quarters.filter((q: any) => q.financial_year_id === fy.id);
    if (fq.length) setQuarterId(fq[0].id);
    fyInitRef.current = true;
  }, [isOnline, fyData, schemes, quarters]);

  useEffect(() => {
    if (!financialYearId || !quarters?.length) return;
    const fq = quarters.filter((q: any) => q.financial_year_id === financialYearId);
    if (!fq.length) return;
    if (!quarterId || !fq.some((q: any) => q.id === quarterId)) setQuarterId(fq[0].id);
  }, [financialYearId, quarters, quarterId]);

  useEffect(() => {
    if (!isOnline || districtInitRef.current || !districts?.length) return;
    const list = districts;
    const preferred =
      userDistrictId && list.some((d: any) => d.id === userDistrictId)
        ? userDistrictId
        : list[0].id;
    setDistrictId(preferred);
    districtInitRef.current = true;
  }, [isOnline, districts, userDistrictId]);

  useEffect(() => {
    if (!institutionTypes.length) return;
    setInstitutionTypeId((prev) => {
      if (prev && institutionTypes.some((i: any) => i.id === prev)) return prev;
      return institutionTypes[0].id;
    });
  }, [institutionTypes]);

  useEffect(() => {
    if (!filteredPlaces.length) return;
    setPlaceOfWorkingId((prev) => {
      if (prev && filteredPlaces.some((p: any) => p.id === prev)) return prev;
      return filteredPlaces[0].id;
    });
  }, [filteredPlaces]);

  return {
    financialYearId,
    setFinancialYearId,
    schemeId,
    setSchemeId,
    quarterId,
    setQuarterId,
    districtId,
    setDistrictId,
    institutionTypeId,
    setInstitutionTypeId,
    placeOfWorkingId,
    setPlaceOfWorkingId,
    toPlaceOfWorkingId,
    setToPlaceOfWorkingId,

    // Data
    fyData,
    schemes,
    quartersForFy,
    districts,
    institutionTypes,
    filteredPlaces,
    allocationsForIndent,
    allocFetching,
  };
}
