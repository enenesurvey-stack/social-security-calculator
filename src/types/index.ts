export interface City {
  id: number
  city_name: string
  year: number
  rate: number
  base_min: number
  base_max: number
  company_id?: string
  created_at?: string
  updated_at?: string
}

export interface Salary {
  id: number
  employee_id: string
  employee_name: string
  yearmonth: number
  salary_amount: number
  company_id?: string
  created_at?: string
  updated_at?: string
}

export interface CalculationResult {
  id: string
  city_name: string
  yearmonth_start: number
  yearmonth_end: number
  employee_name: string
  avg_salary: number
  contribution_base: number
  company_fee: number
  rate: number
  created_at?: string
  created_by?: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: City
        Insert: Omit<City, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<City>
      }
      salaries: {
        Row: Salary
        Insert: Omit<Salary, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Salary>
      }
      results: {
        Row: CalculationResult
        Insert: Omit<CalculationResult, 'id' | 'created_at'>
        Update: Partial<CalculationResult>
      }
    }
  }
}

export interface CalculationParams {
  cityName: string
  startMonth: number
  endMonth: number
  companyId: string
}

export interface UploadedFile {
  file: File
  type: 'cities' | 'salaries'
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
    borderWidth?: number
  }[]
}