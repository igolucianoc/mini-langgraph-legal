import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { ResearchObservability } from './observability';

describe('ResearchObservability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loga metadados sem vazar campos undefined', () => {
    const spy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const obs = new ResearchObservability();

    obs.event({
      correlationId: 'cid-1',
      model: 'fake',
      node: 'retrieving',
      evidenceCount: 3,
      attempts: 1,
    });

    expect(spy).toHaveBeenCalledOnce();
    const message = spy.mock.calls[0][0] as string;
    expect(message).toContain('cid-1');
    expect(message).toContain('node=retrieving');
    expect(message).toContain('evidenceCount=3');
    expect(message).not.toContain('undefined');
  });

  it('nunca inclui a palavra token no log de evento', () => {
    const spy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const obs = new ResearchObservability();

    obs.event({ correlationId: 'cid', model: 'fake', outcome: 'ANSWERED' });

    const message = spy.mock.calls[0][0] as string;
    expect(message.toLowerCase()).not.toContain('token');
  });

  it('registra falha com correlationId e modelo', () => {
    const spy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const obs = new ResearchObservability();

    obs.failure('cid-2', 'fake', 'algo falhou');

    const message = spy.mock.calls[0][0] as string;
    expect(message).toContain('cid-2');
    expect(message).toContain('error=algo falhou');
  });
});
