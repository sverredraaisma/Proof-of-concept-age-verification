export const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:4000';
export const PROVIDER_NAME = 'Demo National ID Provider';

// Fake "logged in" users for the demo. In reality this is a login system.
export const DEMO_USERS = [
  { id: 'alice', name: 'Alice Anderson', dob: '1992-07-14' },
  { id: 'bob', name: 'Bob Baker', dob: '2010-03-22' },
  { id: 'carol', name: 'Carol Chen', dob: '1978-11-02' },
] as const;

export type DemoUser = (typeof DEMO_USERS)[number];
