import { describe, it, expect } from 'vitest';
import { norm, truncar, iniciales } from '../src/lib/ekr';

describe('norm', () => {
  it('convierte a minúsculas', () => {
    expect(norm('HOLA')).toBe('hola');
  });

  it('quita tildes', () => {
    expect(norm('José')).toBe('jose');
    expect(norm('María')).toBe('maria');
    expect(norm('Corazón')).toBe('corazon');
  });

  it('maneja string vacío', () => {
    expect(norm('')).toBe('');
  });

  it('funciona con espacios', () => {
    expect(norm('José María')).toBe('jose maria');
  });
});

describe('truncar', () => {
  it('no trunca si es corto', () => {
    expect(truncar('hola', 10)).toBe('hola');
  });

  it('trunca si es largo', () => {
    expect(truncar('abcdefghij', 5)).toBe('abcd…');
  });

  it('retorna vacío para null', () => {
    expect(truncar(null)).toBe('');
  });

  it('usa 90 por defecto', () => {
    const larga = 'a'.repeat(100);
    expect(truncar(larga).length).toBe(90);
  });
});

describe('iniciales', () => {
  it('retorna primeras letras de las 2 primeras palabras', () => {
    expect(iniciales('José María Pérez')).toBe('JM');
  });

  it('retorna 1 letra si solo hay 1 palabra', () => {
    expect(iniciales('José')).toBe('J');
  });

  it('retorna ? para null', () => {
    expect(iniciales(null)).toBe('?');
  });

  it('convierte a mayúsculas', () => {
    expect(iniciales('juan perez')).toBe('JP');
  });
});