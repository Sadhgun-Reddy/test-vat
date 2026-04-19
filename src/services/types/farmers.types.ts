import { ID } from './api.types';

export type Farmer = {
  id: ID;
  name: string;
  fatherName?: string;
  contact: string;
  village: string;
  mandal: string;
  district: string;
  landHolding?: number;
  animalCount?: number;
  aadhaarNumber?: string;
  isRegistered: boolean;
};
