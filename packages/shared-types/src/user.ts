import type { UserId } from './ids.js';

export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  preferences: Record<string, unknown>;
  status: UserStatus;
}
