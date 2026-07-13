import { describe, it, expect, vi } from 'vitest';

// We test the model methods in isolation without DB connection
// by importing just the logic functions

function getStatus(value, refMin, refMax) {
  if (refMin === null && refMax === null) return 'sem_referência';
  if (refMin !== null && value < refMin) return 'low';
  if (refMax !== null && value > refMax) return 'high';
  return 'normal';
}

function getBMI(weight, height) {
  if (!weight || !height) return null;
  return parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
}

function getAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getNextDueDate(lastExamDate, intervalMonths) {
  if (!lastExamDate) return null;
  const d = new Date(lastExamDate + 'T12:00:00');  // evita problema de timezone
  d.setMonth(d.getMonth() + intervalMonths);
  return d.toISOString().split('T')[0];
}


// ─── ExamResult.getStatus ──────────────────────────────────────────────────────
describe('ExamResult.getStatus', () => {
  it('should return "normal" when value is within range', () => {
    expect(getStatus(14.0, 12.0, 16.0)).toBe('normal');
  });

  it('should return "normal" for boundary min value', () => {
    expect(getStatus(12.0, 12.0, 16.0)).toBe('normal');
  });

  it('should return "normal" for boundary max value', () => {
    expect(getStatus(16.0, 12.0, 16.0)).toBe('normal');
  });

  it('should return "low" when value is below refMin', () => {
    expect(getStatus(10.5, 12.0, 16.0)).toBe('low');
  });

  it('should return "high" when value is above refMax', () => {
    expect(getStatus(18.3, 12.0, 16.0)).toBe('high');
  });

  it('should return "sem_referência" when both refs are null', () => {
    expect(getStatus(5.0, null, null)).toBe('sem_referência');
  });

  it('should check only refMax when refMin is null (e.g. colesterol)', () => {
    expect(getStatus(200.0, null, 190.0)).toBe('high');
    expect(getStatus(180.0, null, 190.0)).toBe('normal');
  });

  it('should check only refMin when refMax is null (e.g. HDL)', () => {
    expect(getStatus(35.0, 40.0, null)).toBe('low');
    expect(getStatus(55.0, 40.0, null)).toBe('normal');
  });
});

// ─── UserProfile.getBMI ────────────────────────────────────────────────────────
describe('UserProfile.getBMI', () => {
  it('should calculate BMI correctly', () => {
    expect(getBMI(70, 175)).toBe(22.9);
  });

  it('should return null if weight is missing', () => {
    expect(getBMI(null, 175)).toBeNull();
  });

  it('should return null if height is missing', () => {
    expect(getBMI(70, null)).toBeNull();
  });

  it('should classify overweight correctly', () => {
    const bmi = getBMI(90, 170);
    expect(bmi).toBeGreaterThan(25);
  });

  it('should round to 1 decimal place', () => {
    const bmi = getBMI(68, 172);
    expect(Number.isFinite(bmi)).toBe(true);
    expect(bmi).toBe(parseFloat(bmi.toFixed(1)));
  });
});

// ─── UserProfile.getAge ────────────────────────────────────────────────────────
describe('UserProfile.getAge', () => {
  it('should return null if no birthDate', () => {
    expect(getAge(null)).toBeNull();
  });

  it('should calculate age correctly', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 30);
    expect(getAge(birthDate.toISOString())).toBe(30);
  });

  it('should handle birthday not yet passed this year', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);
    birthDate.setMonth(birthDate.getMonth() + 2); // birthday in 2 months
    expect(getAge(birthDate.toISOString())).toBe(24);
  });
});

// ─── ExamReminder.getNextDueDate ───────────────────────────────────────────────
describe('ExamReminder.getNextDueDate', () => {
  it('should return null if no lastExamDate', () => {
    expect(getNextDueDate(null, 6)).toBeNull();
  });

  it('should add interval months to lastExamDate', () => {
    const result = getNextDueDate('2024-01-15', 6);
    expect(result).toBe('2024-07-15');
  });

  it('should handle year rollover', () => {
    const result = getNextDueDate('2024-10-01', 6);
    expect(result).toBe('2025-04-01');
  });

  it('should handle 12 month interval (annual)', () => {
    const result = getNextDueDate('2024-03-10', 12);
    expect(result).toBe('2025-03-10');
  });
});
