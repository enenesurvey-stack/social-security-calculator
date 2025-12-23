'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Search, Download, Eye, Edit, Trash2 } from 'lucide-react'
import { CalculationResult } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { CSVLink } from 'react-csv'

export function ResultsContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<CalculationResult[]>([])
  const [filteredResults, setFilteredResults] = useState<CalculationResult[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  // URL 参数筛选
  const [urlFilter, setUrlFilter] = useState<{
    city: string | null
    startMonth: number | null
    endMonth: number | null
  }>({
    city: null,
    startMonth: null,
    endMonth: null
  })
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
      } else {
        setUser(user)
        // 读取 URL 参数
        const cityParam = searchParams.get('city')
        const startParam = searchParams.get('start')
        const endParam = searchParams.get('end')

        if (cityParam || startParam || endParam) {
          setUrlFilter({
            city: cityParam,
            startMonth: startParam ? parseInt(startParam.replace('-', '')) : null,
            endMonth: endParam ? parseInt(endParam.replace('-', '')) : null
          })
          // 如果有 URL 参数，设置城市筛选
          if (cityParam) {
            setSelectedCity(cityParam)
          }
        }
        // 直接传入 user 对象，不依赖状态
        loadResultsDirect(user)
      }
      setLoading(false)
    }

    checkUser()
  }, [supabase, router, searchParams])

  useEffect(() => {
    filterAndSortResults()
  }, [results, searchTerm, selectedCity, selectedYear, sortBy, sortOrder, urlFilter])

  const loadResults = async (userParam?: any) => {
    const currentUser = userParam || user
    if (!currentUser) return

    console.log('加载结果 - 用户 ID:', currentUser.id)

    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('created_by', currentUser.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    console.log('查询结果:', { data, error })

    if (data && !error) {
      setResults(data)
    }
  }

  // 别名函数，用于直接传入 user
  const loadResultsDirect = (userParam: any) => loadResults(userParam)

  const filterAndSortResults = () => {
    let filtered = [...results]

    // URL 参数筛选（优先级最高）
    if (urlFilter.city) {
      filtered = filtered.filter(result => result.city_name === urlFilter.city)
    }
    if (urlFilter.startMonth !== null && urlFilter.endMonth !== null) {
      filtered = filtered.filter(result =>
        result.yearmonth_start === urlFilter.startMonth &&
        result.yearmonth_end === urlFilter.endMonth
      )
    }

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.city_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 城市过滤（如果 URL 参数没有指定城市，则使用下拉选择）
    if (!urlFilter.city && selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(result => result.city_name === selectedCity)
    }

    // 年份过滤
    if (selectedYear && selectedYear !== 'all') {
      filtered = filtered.filter(result => {
        const startYear = Math.floor(result.yearmonth_start / 100)
        return startYear.toString() === selectedYear
      })
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CalculationResult]
      let bValue: any = b[sortBy as keyof CalculationResult]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredResults(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return

    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', id)

    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      await loadResults()
    }
  }

  const getCities = () => {
    const cities = new Set(results.map(r => r.city_name))
    return Array.from(cities)
  }

  const getYears = () => {
    const years = new Set(results.map(r => Math.floor(r.yearmonth_start / 100).toString()))
    return Array.from(years).sort()
  }

  const csvData = filteredResults.map(result => ({
    '城市': result.city_name,
    '员工姓名': result.employee_name,
    '平均工资': result.avg_salary.toFixed(2),
    '缴费基数': result.contribution_base.toFixed(2),
    '公司缴纳': result.company_fee.toFixed(2),
    '缴费比例': (result.rate * 100).toFixed(2) + '%',
    '计算月份': `${formatMonth(result.yearmonth_start)} - ${formatMonth(result.yearmonth_end)}`
  }))

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
          <h1 className="text-3xl font-bold text-gray-900">计算结果查询</h1>
          <p className="mt-2 text-lg text-gray-600">
            查看和管理社保公积金计算结果
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">总记录数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredResults.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">总缴费金额</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(filteredResults.reduce((sum, r) => sum + r.company_fee, 0))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">涉及城市</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getCities().length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">涉及员工</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(filteredResults.map(r => r.employee_name)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2 text-blue-600" />
              筛选和搜索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="搜索员工姓名或城市..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="选择城市" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部城市</SelectItem>
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
                  <SelectItem value="all">全部年份</SelectItem>
                  {getYears().map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <CSVLink
                  data={csvData}
                  filename={`社保计算结果_${new Date().toLocaleDateString()}.csv`}
                  className="flex-1"
                >
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    导出CSV
                  </Button>
                </CSVLink>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-4">
              <span className="text-sm text-gray-600">排序：</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">创建时间</SelectItem>
                  <SelectItem value="employee_name">员工姓名</SelectItem>
                  <SelectItem value="company_fee">公司缴费</SelectItem>
                  <SelectItem value="avg_salary">平均工资</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '升序' : '降序'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 结果表格 */}
        <Card>
          <CardHeader>
            <CardTitle>计算结果列表</CardTitle>
            <CardDescription>
              显示 {filteredResults.length} 条记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      员工姓名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      城市
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      平均工资
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      缴费基数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公司缴纳
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      缴费比例
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      计算月份
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.employee_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.city_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(result.avg_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(result.contribution_base)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(result.company_fee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(result.rate * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatMonth(result.yearmonth_start)} - {formatMonth(result.yearmonth_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* 查看详情 */}}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(result.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* 总计行 */}
                  {filteredResults.length > 0 && (
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={4}>
                        总计
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(filteredResults.reduce((sum, r) => sum + r.company_fee, 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredResults.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">没有找到匹配的记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
