import { ID } from './api.types';

export type DashboardKPIs = {
  cases_today?: number;
  cases_total?: number;
  vacc_today?: number;
  ai_today?: number;
  deworming_today?: number;
  staff_present?: number;
  staff_total?: number;
};

export type DashboardDistrictActivity = {
  district: string;
  cases: number;
  vacc: number;
  ai_done: number;
  [key: string]: any; // Added for any Leaflet mapping compatibility
};

export type DashboardOutcome = {
  outcome: string;
  cnt: number | string;
};

export type DashboardRecentCase = {
  id?: ID;
  case_number: string;
  farmer_name: string;
  district: string;
  animal_type: string;
  outcome: string;
  date_of_treatment: string;
  sync_status: string;
};

export type DashboardResponse = {
  kpis: DashboardKPIs;
  district_activity: DashboardDistrictActivity[];
  outcomes: DashboardOutcome[];
  recent_cases: DashboardRecentCase[];
};
