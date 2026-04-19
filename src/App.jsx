// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './store/AuthContext';
import { SyncProvider } from './store/SyncContext';
import AppShell from './components/layout/AppShell';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy-load pages for code splitting
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'));
const CasesPage          = lazy(() => import('./pages/clinical/CasesPage'));
const VaccinationsPage   = lazy(() => import('./pages/clinical/VaccinationsPage'));
const DewormingPage      = lazy(() => import('./pages/clinical/DewormingPage'));
const AIServicePage      = lazy(() => import('./pages/clinical/AIServicePage'));
const HRMSPage           = lazy(() => import('./pages/hrms/HRMSPage'));
const EmployeesPage      = lazy(() => import('./pages/hrms/EmployeesPage'));
const AttendancePage     = lazy(() => import('./pages/hrms/AttendancePage'));
const AttendanceReportPage = lazy(() => import('./pages/hrms/AttendanceReportPage'));
const LeavePage          = lazy(() => import('./pages/hrms/LeavePage'));
const DrugsPage          = lazy(() => import('./pages/drugs/DrugsPage'));
const StockPage          = lazy(() => import('./pages/drugs/StockPage'));
const IndentsPage        = lazy(() => import('./pages/drugs/IndentsPage'));
const AllocationsPage    = lazy(() => import('./pages/drugs/AllocationsPage'));
const SalePage           = lazy(() => import('./pages/drugs/SalePage'));
const FarmersPage        = lazy(() => import('./pages/farmers/FarmersPage'));
const UploadFarmersPage  = lazy(() => import('./pages/farmers/UploadFarmersPage'));
const FodderPage         = lazy(() => import('./pages/fodder/FodderPage'));
const ReportsPage        = lazy(() => import('./pages/reports/ReportsPage'));
const ReportDetailPage   = lazy(() => import('./pages/reports/ReportDetailPage'));
const IoTPage            = lazy(() => import('./pages/iot/IoTPage'));
const SyncPage           = lazy(() => import('./pages/sync/SyncPage'));
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'));
const DailyProgressPage  = lazy(() => import('./pages/dashboard/DailyProgressPage'));

// Citizen / Farmer module
const CitizenRegistrationPage   = lazy(() => import('./pages/citizen/CitizenRegistrationPage'));
const CitizenFodderSeedPage     = lazy(() => import('./pages/citizen/CitizenFodderSeedPage'));
const CitizenSexSortedSemenPage = lazy(() => import('./pages/citizen/CitizenSexSortedSemenPage'));
const CitizenDewormingPage      = lazy(() => import('./pages/citizen/CitizenDewormingPage'));
const CitizenAIPage             = lazy(() => import('./pages/citizen/CitizenAIPage'));
const CitizenGrievancesPage     = lazy(() => import('./pages/citizen/CitizenGrievancesPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

// ── Protected route wrapper ────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// ── App routes ─────────────────────────────────────────────────
function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }/>

        {/* Protected — all wrapped in AppShell */}
        <Route path="/" element={
          <ProtectedRoute>
            <SyncProvider>
              <AppShell />
            </SyncProvider>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"         element={<DashboardPage />} />
          <Route path="daily-progress"    element={<DailyProgressPage />} />

          {/* Clinical */}
          <Route path="cases"             element={<CasesPage />} />
          <Route path="vaccinations"      element={<VaccinationsPage />} />
          <Route path="deworming"         element={<DewormingPage />} />
          <Route path="ai-service"        element={<AIServicePage />} />

          {/* HRMS */}
          <Route path="hrms"              element={<HRMSPage />} />
          <Route path="employees"         element={<EmployeesPage />} />
          <Route path="attendance"        element={<AttendancePage />} />
          <Route path="attendance-report" element={<AttendanceReportPage />} />
          <Route path="leaves"            element={<LeavePage />} />

          {/* Drug management */}
          <Route path="drugs"             element={<DrugsPage />} />
          <Route path="stock"             element={<StockPage />} />
          <Route path="indents"           element={<IndentsPage />} />
          <Route path="allocations"       element={<AllocationsPage />} />
          <Route path="drug-sale"         element={<SalePage />} />

          {/* Other modules */}
          <Route path="farmers"           element={<FarmersPage />} />
          <Route path="farmers/upload"    element={<UploadFarmersPage />} />
          <Route path="fodder"            element={<FodderPage />} />
          <Route path="iot"               element={<IoTPage />} />
          <Route path="sync"              element={<SyncPage />} />
          <Route path="reports"           element={<ReportsPage />} />
          <Route path="reports/:reportId" element={<ReportDetailPage />} />
          <Route path="settings/*"        element={<SettingsPage />} />

          {/* Citizen / Farmer portal */}
          <Route path="citizen/registration"     element={<CitizenRegistrationPage />} />
          <Route path="citizen/fodder-seed"      element={<CitizenFodderSeedPage />} />
          <Route path="citizen/sex-sorted-semen" element={<CitizenSexSortedSemenPage />} />
          <Route path="citizen/deworming"        element={<CitizenDewormingPage />} />
          <Route path="citizen/ai"               element={<CitizenAIPage />} />
          <Route path="citizen/grievances"       element={<CitizenGrievancesPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="bottom-left"
            toastOptions={{
              duration: 3800,
              style: { fontSize: 13, fontFamily: 'Inter, sans-serif' },
              success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}