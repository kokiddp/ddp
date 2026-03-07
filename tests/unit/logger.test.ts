import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Structured logger', () => {
  let stdoutWrite: ReturnType<typeof vi.fn>;
  let stderrWrite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function loadLogger() {
    // Dynamic import to pick up fresh env
    const mod = await import('../../apps/colyseus-server/src/logger.js');
    return mod.log;
  }

  it('emits JSON to stdout for info level', async () => {
    const log = await loadLogger();
    log.info('test message', { key: 'value' });

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    const output = stdoutWrite.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('test message');
    expect(parsed.service).toBe('colyseus-server');
    expect(parsed.key).toBe('value');
    expect(parsed.ts).toBeDefined();
  });

  it('emits JSON to stderr for error level', async () => {
    const log = await loadLogger();
    log.error('something broke', { code: 500 });

    expect(stderrWrite).toHaveBeenCalledTimes(1);
    const output = stderrWrite.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('error');
    expect(parsed.msg).toBe('something broke');
    expect(parsed.code).toBe(500);
  });

  it('emits warn to stdout', async () => {
    const log = await loadLogger();
    log.warn('careful');

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
    expect(parsed.level).toBe('warn');
  });

  it('outputs newline-delimited JSON', async () => {
    const log = await loadLogger();
    log.info('line1');
    log.info('line2');

    expect(stdoutWrite).toHaveBeenCalledTimes(2);
    for (const call of stdoutWrite.mock.calls) {
      const str = call[0] as string;
      expect(str.endsWith('\n')).toBe(true);
    }
  });
});
