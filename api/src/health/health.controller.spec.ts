import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('retorna status ok com nome do serviço', () => {
    const controller = new HealthController();

    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('mini-langgraph-legal-api');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });
});
