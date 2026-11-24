import { dateAndTime, greeting, longDate, modifiedWhen, shortDate } from './dates';

const NOW = new Date(2026, 10, 22, 15, 30); // dimanche 22 novembre 2026, 15 h 30

describe('dates', () => {
  it('écrit la date de l’accueil', () => {
    expect(longDate(NOW)).toBe('Dimanche 22 novembre');
    expect(longDate(new Date(2026, 4, 1))).toBe('Vendredi 1er mai');
  });
  it('écrit la date courte d’une note', () => {
    expect(shortDate(new Date(2026, 10, 22, 9, 5).getTime(), NOW)).toBe('09:05');
    expect(shortDate(new Date(2026, 10, 21, 23, 0).getTime(), NOW)).toBe('Hier');
    expect(shortDate(new Date(2026, 10, 12).getTime(), NOW)).toBe('12 nov.');
    expect(shortDate(new Date(2025, 1, 3).getTime(), NOW)).toBe('3 févr. 2025');
  });
  it('dit quand une note a été modifiée', () => {
    expect(modifiedWhen(new Date(2026, 10, 22, 9, 5).getTime(), NOW)).toBe('aujourd’hui à 09:05');
    expect(modifiedWhen(new Date(2026, 10, 21).getTime(), NOW)).toBe('hier');
    expect(modifiedWhen(new Date(2026, 10, 12).getTime(), NOW)).toBe('le 12\u00a0nov.');
  });
  it('salue selon l’heure', () => {
    expect(greeting(NOW)).toBe('Bonjour');
    expect(greeting(new Date(2026, 10, 22, 19))).toBe('Bonsoir');
  });

  it('écrit la date complète d’une sauvegarde', () => {
    expect(dateAndTime(new Date(2026, 10, 23, 14, 5).getTime())).toBe('23\u00a0novembre 2026 à 14:05');
    expect(dateAndTime(new Date(2026, 0, 1, 9, 0).getTime())).toBe('1er\u00a0janvier 2026 à 09:00');
  });
});
