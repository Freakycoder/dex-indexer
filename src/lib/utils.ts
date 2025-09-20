import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  if (value > 999) {
    return `${(value / 1).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}%`;
  }
  return `${value.toFixed(2)}%`;
}

export function getPercentageColor(value: number | undefined): string {
  if (value === undefined || value === null) return 'text-gray-500';
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}

export function formatPrice(price: number): string {
  if (price < 0.00001) return price.toExponential(2);
  if (price < 0.001) return price.toFixed(7);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}