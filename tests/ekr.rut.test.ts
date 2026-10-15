import { describe, it, expect } from 'vitest';
import { limpiarRut, validarRut, formatRut } from '../src/lib/ekr';

describe('limpiarRut', () => {
  it('quita puntos y guiones', () => {
    expect(limpiarRut('12.345.678-9')).toBe('123456789');
  });

  it('convierte K a mayúscula', () => {
    expect(limpiarRut('12.345.678-k')).toBe('12345678K');
  });

  it('elimina caracteres no alfanuméricos', () => {
    expect(limpiarRut('12 345 678 9')).toBe('123456789');
  });

  it('funciona con string vacío', () => {
    expect(limpiarRut('')).toBe('');
  });
});

describe('validarRut', () => {
    it('acepta RUT válido con puntos y guion', () => {
    expect(validarRut('12.345.678-5')).toBe(true);
  });

  it('acepta RUT válido sin formato', () => {
    expect(validarRut('123456785')).toBe(true);
  });

  it('acepta RUT con dígito K', () => {
    expect(validarRut('7.290.687-K')).toBe(true);
  });

  it('acepta RUT con k minúscula', () => {
    expect(validarRut('7.290.687-k')).toBe(true);
  });

  it('rechaza RUT con dígito verificador incorrecto', () => {
    expect(validarRut('12.345.678-1')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(validarRut('')).toBe(false);
  });

  it('rechaza string muy corto', () => {
    expect(validarRut('1')).toBe(false);
  });

  it('rechaza caracteres no numéricos en el cuerpo', () => {
    expect(validarRut('ABC123-9')).toBe(false);
  });
    it('rechaza 12.345.678-9 (DV incorrecto)', () => {
    expect(validarRut('12.345.678-9')).toBe(false);
  });
});

describe('formatRut', () => {
  it('formatea RUT sin puntos', () => {
    expect(formatRut('123456789')).toBe('12.345.678-9');
  });

  it('formatea RUT con puntos', () => {
    expect(formatRut('12.345.678-9')).toBe('12.345.678-9');
  });

  it('formatea RUT con K', () => {
    expect(formatRut('7290687K')).toBe('7.290.687-K');
  });

  it('retorna vacío para null', () => {
    expect(formatRut(null)).toBe('');
  });

  it('retorna vacío para undefined', () => {
    expect(formatRut(undefined)).toBe('');
  });

  it('retorna el string original si es muy corto', () => {
    expect(formatRut('1')).toBe('1');
  });
});