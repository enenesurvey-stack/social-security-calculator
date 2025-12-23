import { City, Salary, CalculationResult } from '@/types'

export interface AverageSalaryData {
  employee_name: string
  avg_salary: number
  month_count: number
}

export interface CalculationInput {
  city: City
  salaries: Salary[]
  startMonth: number
  endMonth: number
}

export function calculateAverageSalaries(
  salaries: Salary[],
  startMonth: number,
  endMonth: number
): AverageSalaryData[] {
  const filteredSalaries = salaries.filter(
    s => s.yearmonth >= startMonth && s.yearmonth <= endMonth
  )

  const salaryMap = new Map<string, { total: number; count: number }>()

  filteredSalaries.forEach(salary => {
    const existing = salaryMap.get(salary.employee_name) || { total: 0, count: 0 }
    salaryMap.set(salary.employee_name, {
      total: existing.total + salary.salary_amount,
      count: existing.count + 1
    })
  })

  return Array.from(salaryMap.entries()).map(([employee_name, data]) => ({
    employee_name,
    avg_salary: data.total / data.count,
    month_count: data.count
  }))
}

export function calculateContributionBase(
  avgSalary: number,
  baseMin: number,
  baseMax: number
): number {
  if (avgSalary < baseMin) return baseMin
  if (avgSalary > baseMax) return baseMax
  return avgSalary
}

export function calculateCompanyFee(
  contributionBase: number,
  rate: number
): number {
  return contributionBase * rate
}

export function generateCalculationResults(
  input: CalculationInput
): Omit<CalculationResult, 'id' | 'created_at' | 'created_by'>[] {
  const { city, salaries, startMonth, endMonth } = input

  const averageSalaries = calculateAverageSalaries(salaries, startMonth, endMonth)

  return averageSalaries.map(data => {
    const contribution_base = calculateContributionBase(
      data.avg_salary,
      city.base_min,
      city.base_max
    )

    const company_fee = calculateCompanyFee(contribution_base, city.rate)

    return {
      city_name: city.city_name,
      yearmonth_start: startMonth,
      yearmonth_end: endMonth,
      employee_name: data.employee_name,
      avg_salary: data.avg_salary,
      contribution_base,
      company_fee,
      rate: city.rate
    }
  })
}

export function validateCalculationParams(
  startMonth: number,
  endMonth: number
): { isValid: boolean; error?: string } {
  // 检查格式
  if (!validateYearmonth(startMonth) || !validateYearmonth(endMonth)) {
    return {
      isValid: false,
      error: '月份格式不正确，请使用YYYYMM格式'
    }
  }

  // 检查范围
  if (startMonth > endMonth) {
    return {
      isValid: false,
      error: '起始月份不能大于结束月份'
    }
  }

  // 检查是否跨年（如果业务要求）
  const startYear = Math.floor(startMonth / 100)
  const endYear = Math.floor(endMonth / 100)

  if (startYear !== endYear) {
    return {
      isValid: false,
      error: '暂不支持跨年度计算，请在同一年度内选择月份范围'
    }
  }

  return { isValid: true }
}

// 导入工具函数
function validateYearmonth(yearmonth: number): boolean {
  const year = Math.floor(yearmonth / 100)
  const month = yearmonth % 100
  return year >= 2020 && year <= 2030 && month >= 1 && month <= 12
}