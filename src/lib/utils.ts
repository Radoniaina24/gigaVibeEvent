import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getCurrencySuffix } from './currency';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

export function formatAr(amount: number): string {
  return new Intl.NumberFormat('fr-MG', {
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + getCurrencySuffix();
}

export function formatDateTime(iso: string, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Date courte JJ/MM/AA (ex. 16/09/26). */
export function formatShortDate(iso: string, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(iso));
}

/** Date courte + heure JJ/MM/AA à HH:mm (ex. 16/09/26 à 14:30). */
export function formatShortDateTime(iso: string, locale = 'fr-FR'): string {
  const date = formatShortDate(iso, locale);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
  return `${date} à ${time}`;
}

/** Génère un slug URL-safe (complété côté DB par trigger si besoin). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
