import { ID } from './api.types';

export type LoginCredentials = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: ID;
  name: string;
  username: string;
  designation: string;
  district?: string;
  mandal?: string;
  permissions: string[];
  token: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  refreshToken?: string;
};
