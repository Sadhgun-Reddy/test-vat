import React from 'react';
import { DashboardDistrictActivity } from '../services/types/dashboard.types';

declare module '*/TelanganaMap' {
  const TelanganaMap: React.ComponentType<{
    districtActivity?: DashboardDistrictActivity[];
  }>;
  export default TelanganaMap;
}
