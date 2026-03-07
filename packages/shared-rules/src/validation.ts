import type { CommandEnvelope } from '@ddp/shared-types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCommandEnvelope(
  envelope: CommandEnvelope<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  if (!envelope.type || typeof envelope.type !== 'string') {
    errors.push('Command type is required and must be a string');
  }

  if (!envelope.issuedBy) {
    errors.push('Command must have an issuedBy user ID');
  }

  if (!envelope.issuedAt) {
    errors.push('Command must have an issuedAt timestamp');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
