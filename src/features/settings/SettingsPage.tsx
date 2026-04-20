import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PageHead } from '../../components/ui';
import { PageWrap } from '../../components/ui';
import BudgetAllocationsPage from '../budget/BudgetAllocationsPage';
import CalendarHolidaysPage from '../../pages/settings/CalendarHolidaysPage';
import InstitutionSettingsPage from '../../pages/settings/InstitutionSettingsPage';
// We import the custom pages from the old locations or their respective feature folders
import PoliciesSettingsPage from '../../pages/settings/PoliciesSettingsPage';
import { CRUDPageShell } from './components/generic/CRUDPageShell';
import * as entities from './config/entities';
import { useGenericCRUD } from './hooks/useGenericCRUD';

// For simplicity, we just rebuild the grid and routing here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SETTINGS_TABS: any[] = [
  {
    key: 'districts',
    label: 'District',
    icon: '🗺',
    section: 'Settings',
    config: entities.districtsConfig,
  },
  {
    key: 'mandals',
    label: 'Mandal',
    icon: '📍',
    section: 'Settings',
    config: entities.mandalsConfig,
  },
  {
    key: 'towns',
    label: 'Town / Village',
    icon: '🏘',
    section: 'Settings',
    config: entities.townsConfig,
  },
  {
    key: 'institution-types',
    label: 'Institution Type',
    icon: '🏛',
    section: 'Settings',
    config: entities.institutionTypesConfig,
  },
  {
    key: 'institution-mapping',
    label: 'Institution Mapping',
    icon: '🏥',
    section: 'Settings',
    customPage: true,
  },
  {
    key: 'places-of-working',
    label: 'Institution',
    icon: '🏥',
    section: 'Settings',
    config: entities.placesOfWorkingConfig,
  },
  {
    key: 'posting-types',
    label: 'Posting Types',
    icon: '🏷',
    section: 'Settings',
    config: entities.postingTypesConfig,
  },
  {
    key: 'designations',
    label: 'Designation',
    icon: '🏷',
    section: 'Settings',
    config: entities.designationsConfig,
  },
  {
    key: 'animal-types',
    label: 'Species',
    icon: '🐄',
    section: 'Settings',
    config: entities.animalTypesConfig,
  },
  { key: 'breeds', label: 'Breed', icon: '🧬', section: 'Settings', config: entities.breedsConfig },
  {
    key: 'diagnostics',
    label: 'Disease / Diagnostics',
    icon: '🦠',
    section: 'Settings',
    config: entities.diagnosticsConfig,
  },
  {
    key: 'vaccination-types',
    label: 'Vaccine',
    icon: '💉',
    section: 'Settings',
    config: entities.vaccinationTypesConfig,
  },
  { key: 'items', label: 'Items', icon: '📦', section: 'Settings', config: entities.itemsConfig },
  {
    key: 'operation-types',
    label: 'Surgical Type',
    icon: '⚙',
    section: 'Settings',
    config: entities.operationTypesConfig,
  },
  {
    key: 'operations',
    label: 'Surgical',
    icon: '➕',
    section: 'Settings',
    config: entities.operationsConfig,
  },
  {
    key: 'qualifications',
    label: 'Qualification',
    icon: '📖',
    section: 'Settings',
    config: entities.qualificationsConfig,
  },
  {
    key: 'specializations',
    label: 'Specialization',
    icon: '📄',
    section: 'Settings',
    config: entities.specializationsConfig,
  },
  {
    key: 'grampanchayaths',
    label: 'Grampanchayath',
    icon: '🏠',
    section: 'Settings',
    config: entities.grampanchayathsConfig,
  },
  {
    key: 'drug-allocations',
    label: 'Allocation Form',
    icon: '📑',
    section: 'Settings',
    config: entities.drugAllocationsConfig,
  },
  { key: 'drugs', label: 'Drugs', icon: '🌿', section: 'Settings', config: entities.drugsConfig },
  {
    key: 'financial-years',
    label: 'Financial Year',
    icon: '₹',
    section: 'Settings',
    config: entities.financialYearsConfig,
  },
  {
    key: 'schemes',
    label: 'Scheme',
    icon: '📊',
    section: 'Settings',
    config: entities.schemesConfig,
  },
  {
    key: 'quarters',
    label: 'Quarter',
    icon: '⬡',
    section: 'Settings',
    config: entities.quartersConfig,
  },
  {
    key: 'form-types',
    label: 'Form Type',
    icon: '📝',
    section: 'Settings',
    config: entities.formTypesConfig,
  },
  {
    key: 'budget-allocations',
    label: 'Budget / Percentage Allocation',
    icon: '🥧',
    section: 'Settings',
    customPage: true,
  },
  { key: 'policies', label: 'Policies', icon: '📋', section: 'Settings', customPage: true },
  {
    key: 'calendar-holidays',
    label: 'Calendar',
    icon: '📅',
    section: 'Settings',
    customPage: true,
  },
  {
    key: 'farmers',
    label: 'Farmers',
    icon: '👤',
    section: 'Settings',
    config: entities.farmersConfig,
  },
  {
    key: 'sex-sorted-semens',
    label: 'Sex Sorted Semen',
    icon: '🧬',
    section: 'Settings',
    config: entities.sexSortedSemensConfig,
  },
  {
    key: 'leave-reasons',
    label: 'Leave Reasons',
    icon: '📰',
    section: 'Settings',
    config: entities.leaveReasonsConfig,
  },
  {
    key: 'seed-types',
    label: 'Type of Seed',
    icon: '🌱',
    section: 'Fodder',
    config: entities.seedTypesConfig,
  },
  {
    key: 'unit-sizes',
    label: 'Unit Size',
    icon: '📏',
    section: 'Fodder',
    config: entities.unitSizesConfig,
  },
  {
    key: 'fodder-items',
    label: 'Fodder Items',
    icon: '📖',
    section: 'Fodder',
    config: entities.fodderItemsConfig,
  },
];

const SECTION_ORDER = ['Settings', 'Fodder'];

const grouped = SECTION_ORDER.map((sec) => ({
  section: sec,
  items: SETTINGS_TABS.filter((c) => c.section === sec),
}));

function settingKeyFromPathname(pathname: string) {
  const path = (pathname || '').replace(/\/+$/, '') || '/';
  if (path === '/settings') return null;
  const prefix = '/settings/';
  if (!path.startsWith(prefix)) return null;
  const first = path.slice(prefix.length).split('/').filter(Boolean)[0];
  return first ? decodeURIComponent(first) : null;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const urlKey = useMemo(() => settingKeyFromPathname(location.pathname), [location.pathname]);

  const activeTab = useMemo(() => {
    return SETTINGS_TABS.find((t) => t.key === urlKey) || null;
  }, [urlKey]);

  useEffect(() => {
    if (urlKey && !activeTab) {
      navigate('/settings', { replace: true });
    }
  }, [urlKey, activeTab, navigate]);

  // Handle custom pages routing like old behavior
  if (activeTab?.customPage) {
    if (activeTab.key === 'policies')
      return (
        <PoliciesSettingsPage onBack={() => navigate('/settings')} config={activeTab.config} />
      );
    if (activeTab.key === 'calendar-holidays')
      return (
        <CalendarHolidaysPage onBack={() => navigate('/settings')} config={activeTab.config} />
      );
    if (activeTab.key === 'budget-allocations')
      return (
        <BudgetAllocationsPage onBack={() => navigate('/settings')} config={activeTab.config} />
      );
    if (activeTab.key === 'institution-mapping')
      return <InstitutionSettingsPage onBack={() => navigate('/settings')} />;
  }

  // Active generic CRUD tab
  if (activeTab && activeTab.config) {
    return <SettingSubPage activeTab={activeTab} onBack={() => navigate('/settings')} />;
  }

  // Main Grid View
  return (
    <PageWrap>
      <PageHead
        actions={[]}
        title="Settings"
        subtitle="Master data — geography, clinical, HR, finance, pharmacy, and fodder"
        crumbs={['Home', 'Settings']}
      />

      {grouped.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--blu)',
              marginBottom: 14,
              fontFamily: 'var(--fd)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 3,
                height: 16,
                background: 'var(--blu)',
                borderRadius: 2,
                display: 'inline-block',
              }}
            />
            {section}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
              gap: 12,
            }}
          >
            {items.map((item) => (
              <div
                key={item.key}
                onClick={() => navigate(`/settings/${encodeURIComponent(item.key)}`)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--bdr)',
                  borderRadius: 10,
                  padding: '20px 12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  boxShadow: 'var(--sh1)',
                  transition: 'transform .12s, box-shadow .12s, border-color .12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,86,219,.13)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--blu-bdr)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--sh1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--bdr)';
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#e8f0fe,#c7d7fc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: 'var(--txt2)',
                    textAlign: 'center',
                    lineHeight: 1.35,
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </PageWrap>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SettingSubPage({ activeTab, onBack }: { activeTab: any; onBack: () => void }) {
  const config = activeTab.config;
  const basePath = config.apiPath || `/settings/${activeTab.key}`;

  const handlers = useGenericCRUD({
    endpoint: basePath,
    queryKey: ['setting', activeTab.key],
    paginated: config.paginated,
    softDeletePut: config.softDeletePut,
  });

  return (
    <PageWrap>
      <CRUDPageShell config={config} handlers={handlers} onBack={onBack} />
    </PageWrap>
  );
}

export default SettingsPage;
