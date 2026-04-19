import { ID } from './api.types';

export type ClinicalCase = {
  id: ID;
  animalType: string;
  breed?: string;
  ownerName: string;
  ownerContact: string;
  village: string;
  mandal: string;
  district: string;
  diagnosis?: string;
  treatment?: string;
  status: 'open' | 'in-progress' | 'closed';
  createdAt: string;
  updatedAt: string;
};

export type CreateCasePayload = Omit<ClinicalCase, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
