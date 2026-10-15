import { describe, it, expect, vi } from 'vitest';
import { edad, fmtDate, fmtDateTime, hoy, diasDesde, hace } from '../src/lib/ekr';

describe('edad', () => {
  it('retorna null para null', () => {
    expect(edad(null)).toBeNull();
  });

  it('retorna null para fecha inválida', () => {
    expect(edad('no-es-fecha')).toBeNull();
  });

  it('calcula edad correctamente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    expect(edad('2000-06-15')).toBe(26);
    expect(edad('2000-06-16')).toBe(25);
    expect(edad('2000-06-14')).toBe(26);

    vi.useRealTimers();
  });
});

describe('fmtDate', () => {
  it('retorna guion para null', () => {
    expect(fmtDate(null)).toBe('—');
  });

  it('retorna guion para inválido', () => {
    expect(fmtDate('no-es-fecha')).toBe('—');
  });

  it('formatea fecha ISO', () => {
    expect(fmtDate('2026-06-15')).toBe('15-06-2026');
  });
});

describe('fmtDateTime', () => {
  it('retorna guion para null', () => {
    expect(fmtDateTime(null)).toBe('—');
  });

  it('formatea timestamp ISO', () => {
    const s = fmtDateTime('2026-06-15T14:30:00Z');
    expect(s).toMatch(/15-06-2026/);
    expect(s).toMatch(/\d{2}:\d{2}/);
  });
});

describe('hoy', () => {
  it('retorna string en formato yyyy-mm-dd', () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('diasDesde', () => {
  it('retorna 0 para null', () => {
    expect(diasDesde(null)).toBe(0);
  });

  it('retorna días correctos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(diasDesde('2026-06-10T12:00:00Z')).toBe(5);
    vi.useRealTimers();
  });
});

describe('hace', () => {
  it('retorna guion para null', () => {
    expect(hace(null)).toBe('—');
  });

  it('dice "justo ahora"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(hace('2026-06-15T11:59:30Z')).toBe('justo ahora');
    vi.useRealTimers();
  });

  it('dice "hace X min"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(hace('2026-06-15T11:45:00Z')).toBe('hace 15 min');
    vi.useRealTimers();
  });

  it('dice "hace X h"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(hace('2026-06-15T09:00:00Z')).toBe('hace 3 h');
    vi.useRealTimers();
  });

  it('dice "hace X días"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(hace('2026-06-12T12:00:00Z')).toBe('hace 3 días');
    vi.useRealTimers();
  });
});