import type { RulesProfileId } from './ids.js';

export interface RulesProfile {
  id: RulesProfileId;
  name: string;
  description: string;
  version: string;
  configBlob: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
