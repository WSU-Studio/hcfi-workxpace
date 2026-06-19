import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDate = (date: Date | string): string => {
  if (!date) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatDateTime = (date: Date | string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (date: Date | string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatISODate = (date: string | Date | null): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/,/g, '.');
};

export const getInitials = (name: string) => {
  const words = name.split(' ');
  return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : (words[0]?.[0] ?? '?').toUpperCase();
};

export const stripHtmlTags = (html: string | null | undefined) => {
  if (!html) return '-';
  return html.replace(/<[^>]*>/g, '').trim() || '-';
};
