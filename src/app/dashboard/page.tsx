'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, BarChart3, PieChart, TrendingUp, Users } from 'lucide-react'
import { CalculationResult } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
)

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<CalculationResult[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
      } else {
        setUser(user)
        loadResults()
      }
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const loadResults = async () => {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false })

    if (data && !error) {
      setResults(data)
    }
  }

  const getFilteredResults = () => {
    let filtered = [...results]

    if (selectedCity) {
      filtered = filtered.filter(result => result.city_name === selectedCity)
    }

    if (selectedYear) {
      filtered = filtered.filter(result => {
        const startYear = Math.floor(result.yearmonth_start / 100)
        return startYear.toString() === selectedYear
      })
    }

    return filtered
  }

  const filteredResults = getFilteredResults()

  // 统计数据
  const totalEmployees = new Set(filteredResults.map(r => r.employee_name)).size
  const totalAmount = filteredResults.reduce((sum, r) => sum + r.company_fee, 0)
  const avgSalary = filteredResults.length > 0
    ? filteredResults.reduce((sum, r) => sum + r.avg_salary, 0) / filteredResults.length
    : 0
  const cities = new Set(filteredResults.map(r => r.city_name)).size

  // 城市费用分布数据
  const cityFeeData = filteredResults.reduce((acc, result) => {
    if (!acc[result.city_name]) {
      acc[result.city_name] = 0
    }
    acc[result.city_name] += result.company_fee
    return acc
  }, {} as Record<string, number>)

  const cityChartData = {
    labels: Object.keys(cityFeeData),
    datasets: [
      {
        label: '公司缴费总额',
        data: Object.values(cityFeeData),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(244, 63, 94, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(244, 63, 94, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // 员工费用分布数据（取前10名）
  const employeeFeeData = filteredResults
    .reduce((acc, result) => {
      if (!acc[result.employee_name]) {
        acc[result.employee_name] = 0
      }
      acc[result.employee_name] += result.company_fee
      return acc
    }, {} as Record<string, number>)

  const topEmployees = Object.entries(employeeFeeData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const employeeChartData = {
    labels: topEmployees.map(([name]) => name),
    datasets: [
      {
        label: '个人总缴费',
        data: topEmployees.map(([, fee]) => fee),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  }

  // 费用构成饼图数据
  const feeCompositionData = {
    labels: ['员工平均工资', '公司实际缴费'],
    datasets: [
      {
        data: [
          filteredResults.reduce((sum, r) => sum + r.avg_salary, 0),
          totalAmount
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // 月度趋势数据
  const monthlyTrendData = filteredResults
    .reduce((acc, result) => {
      const monthKey = result.yearmonth_start.toString()
      if (!acc[monthKey]) {
        acc[monthKey] = { total: 0, count: 0 }
      }
      acc[monthKey].total += result.company_fee
      acc[monthKey].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

  const sortedMonths = Object.keys(monthlyTrendData).sort()

  const trendChartData = {
    labels: sortedMonths.map(month => formatMonth(parseInt(month))),
    datasets: [
      {
        label: '月度缴费总额',
        data: sortedMonths.map(month => monthlyTrendData[month].total),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
      },
      {
        label: '平均单人次缴费',
        data: sortedMonths.map(month => monthlyTrendData[month].total / monthlyTrendData[month].count),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4,
      },
    ],
  }

  const getCities = () => {
    const cities = new Set(results.map(r => r.city_name))
    return Array.from(cities)
  }

  const getYears = () => {
    const years = new Set(results.map(r => Math.floor(r.yearmonth_start / 100).toString()))
    return Array.from(years).sort()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回主页
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">统计图表</h1>
          <p className="mt-2 text-lg text-gray-600">
            查看社保公积金计算的数据分析和趋势
          </p>
        </div>

        {/* 筛选器 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>数据筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="选择城市" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部城市</SelectItem>
                  {getCities().map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="选择年份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部年份</SelectItem>
                  {getYears().map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                涉及员工
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                总缴费金额
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                平均工资
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgSalary)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <PieChart className="h-4 w-4 mr-2 text-orange-600" />
                涉及城市
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cities}</div>
            </CardContent>
          </Card>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 城市费用分布 */}
          <Card>
            <CardHeader>
              <CardTitle>城市费用分布</CardTitle>
              <CardDescription>各城市公司缴费总额对比</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(cityFeeData).length > 0 ? (
                <Bar data={cityChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '¥' + value.toLocaleString()
                        }
                      }
                    }
                  }
                }} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 员工费用排名 */}
          <Card>
            <CardHeader>
              <CardTitle>员工缴费TOP10</CardTitle>
              <CardDescription>缴费金额最高的10名员工</CardDescription>
            </CardHeader>
            <CardContent>
              {topEmployees.length > 0 ? (
                <Bar data={employeeChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '¥' + value.toLocaleString()
                        }
                      }
                    }
                  }
                }} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 费用构成饼图 */}
          <Card>
            <CardHeader>
              <CardTitle>费用构成分析</CardTitle>
              <CardDescription>工资总额与缴费比例</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredResults.length > 0 ? (
                <Pie data={feeCompositionData} options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || ''
                          const value = formatCurrency(context.raw as number)
                          const percentage = ((context.raw as number) /
                            (context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
                          return `${label}: ${value} (${percentage}%)`
                        }
                      }
                    }
                  }
                }} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 月度趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle>月度缴费趋势</CardTitle>
              <CardDescription>缴费金额随时间变化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedMonths.length > 0 ? (
                <Line data={trendChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '¥' + value.toLocaleString()
                        }
                      }
                    }
                  }
                }} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}