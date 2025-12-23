import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

export function formatMonth(yearmonth: number): string {
  const year = Math.floor(yearmonth / 100)
  const month = yearmonth % 100
  return `${year}年${month.toString().padStart(2, '0')}月`
}

export function validateYearmonth(yearmonth: number): boolean {
  const year = Math.floor(yearmonth / 100)
  const month = yearmonth % 100
  return year >= 2020 && year <= 2030 && month >= 1 && month <= 12
}

export function getMonthRange(startMonth: number, endMonth: number): number[] {
  const months: number[] = []
  let current = startMonth

  while (current <= endMonth) {
    months.push(current)
    const year = Math.floor(current / 100)
    const month = current % 100
    if (month === 12) {
      current = (year + 1) * 100 + 1
    } else {
      current++
    }
  }

  return months
}