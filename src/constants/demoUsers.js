// Shared demo accounts shown on the login screen — used for local demo sessions when the API is unavailable.
/** `role` must match API `user_role_enum` (lowercase). `roleLabel` is for UI only. */
export const DEMO_USERS = [
  { email: 'director@vahd.gov.in', password: 'Admin@123', name: 'Dr. K. Suresh Kumar', role: 'director', roleLabel: 'Director', initials: 'SK' },
  { email: 'dvaho@vahd.gov.in', password: 'Admin@123', name: 'Dr. Padma Lakshmi', role: 'dvaho', roleLabel: 'DVAHO', initials: 'PL' },
  { email: 'vo@vahd.gov.in', password: 'Admin@123', name: 'Dr. Ramesh Naidu', role: 'vo', roleLabel: 'Vet Officer', initials: 'RN' },
];

/** @returns {typeof DEMO_USERS[0] | null} */
export function findDemoCredential(email, password) {
  const e = (email || '').trim().toLowerCase();
  const row = DEMO_USERS.find(u => u.email.toLowerCase() === e && u.password === password);
  return row || null;
}

export function buildDemoSessionUser(demo) {
  return {
    id: `demo-${demo.email.replace(/[^a-z0-9]+/gi, '-')}`,
    email: demo.email,
    name: demo.name,
    username: demo.email,
    designation: demo.roleLabel,
    role: demo.role,
    permissions: [],
    token: 'demo-token',
  };
}
