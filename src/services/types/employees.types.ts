import { ID } from './api.types';

export type Employee = {
  id: ID;
  name: string;
  designation: string;
  department: string;
  district: string;
  mandal?: string;
  phoneNumber?: string;
  email?: string;
  joiningDate: string;
  isActive: boolean;
};

export type AttendanceRecord = {
  id: ID;
  employeeId: ID;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'half-day';
  checkIn?: string;
  checkOut?: string;
};
