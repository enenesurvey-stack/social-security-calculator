'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Upload, Calculator, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react'
import { City, Salary } from '@/types'
import * as XLSX from 'xlsx'

export default function UploadPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [startMonth, setStartMonth] = useState<string>('2024-01')
  const [endMonth, setEndMonth] = useState<string>('2024-12')
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [isCalculating, setIsCalculating] = useState(false)
  const [lastCalculation, setLastCalculation] = useState<{
    cityName: string
    startMonth: string
    endMonth: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
      } else {
        setUser(user)
        loadCities()
      }
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const loadCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('city_name')

    if (data && !error) {
      setCities(data)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'cities' | 'salaries') => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (fileType === 'cities') {
        await uploadCityData(jsonData as any[])
      } else {
        await uploadSalaryData(jsonData as any[])
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: '文件解析失败，请检查文件格式是否正确'
      })
    }
  }

  const uploadCityData = async (data: any[]) => {
    if (!user) return

    // 验证数据格式
    const requiredFields = ['id', 'city_name', 'year', 'rate', 'base_min', 'base_max']
    const invalidFields = requiredFields.filter(field =>
      !data[0] || data[0][field] === undefined
    )

    if (invalidFields.length > 0) {
      setUploadStatus({
        type: 'error',
        message: `缺少必要字段: ${invalidFields.join(', ')}`
      })
      return
    }

    // 添加公司ID
    const cityData = data.map(item => ({
      ...item,
      company_id: user.id
    }))

    // 先删除已存在的数据
    await supabase
      .from('cities')
      .delete()
      .in('id', cityData.map(c => c.id))
      .eq('company_id', user.id)

    const { error } = await supabase
      .from('cities')
      .insert(cityData)

    if (error) {
      setUploadStatus({
        type: 'error',
        message: `上传失败: ${error.message}`
      })
    } else {
      setUploadStatus({
        type: 'success',
        message: `成功上传 ${cityData.length} 条城市数据`
      })
      loadCities() // 重新加载城市列表
    }
  }

  const uploadSalaryData = async (data: any[]) => {
    if (!user) {
      setUploadStatus({
        type: 'error',
        message: '用户未登录，请先登录'
      })
      return
    }

    console.log('当前用户 ID:', user.id)
    console.log('数据行数:', data.length)
    console.log('示例数据:', data[0])

    // 验证数据格式
    const requiredFields = ['id', 'employee_id', 'employee_name', 'month', 'salary_amount']
    const invalidFields = requiredFields.filter(field =>
      !data[0] || data[0][field] === undefined
    )

    if (invalidFields.length > 0) {
      setUploadStatus({
        type: 'error',
        message: `缺少必要字段: ${invalidFields.join(', ')}`
      })
      return
    }

    // 添加公司ID和修正字段名
    const salaryData = data.map(item => ({
      id: item.id,
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      yearmonth: item.month, // 将 month 重命名为 yearmonth
      salary_amount: item.salary_amount,
      company_id: user.id
    }))

    console.log('准备插入的数据:', salaryData.slice(0, 2))

    // 先删除已存在的数据
    const { error: deleteError } = await supabase
      .from('salaries')
      .delete()
      .in('id', salaryData.map(s => s.id))
      .eq('company_id', user.id)

    if (deleteError) {
      console.log('删除旧数据失败（可能没有旧数据）:', deleteError.message)
    }

    // 插入新数据
    const { data: insertedData, error: insertError } = await supabase
      .from('salaries')
      .insert(salaryData)
      .select()

    console.log('插入结果:', { insertedData, insertError })

    if (insertError) {
      setUploadStatus({
        type: 'error',
        message: `上传失败: ${insertError.message} (详情: ${insertError.hint || '无'})`
      })
    } else {
      setUploadStatus({
        type: 'success',
        message: `成功上传 ${salaryData.length} 条工资数据`
      })
    }
  }

  const handleCalculate = async () => {
    if (!selectedCity || !startMonth || !endMonth || !user) {
      setUploadStatus({
        type: 'error',
        message: '请选择城市和月份范围'
      })
      return
    }

    setIsCalculating(true)
    setUploadStatus({ type: null, message: '' })

    try {
      // 获取当前会话
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          cityName: selectedCity,
          startMonth: parseInt(startMonth.replace('-', '')),
          endMonth: parseInt(endMonth.replace('-', '')),
          companyId: user.id
        })
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `计算完成！共处理 ${result.count} 条结果`
        })
        // 保存本次计算参数，用于查看结果时筛选
        setLastCalculation({
          cityName: selectedCity,
          startMonth: startMonth,
          endMonth: endMonth
        })
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || '计算失败'
        })
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: '计算过程中发生错误'
      })
    } finally {
      setIsCalculating(false)
    }
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">数据上传与计算</h1>
          <p className="mt-2 text-lg text-gray-600">
            上传城市标准和员工工资数据，并执行计算
          </p>
        </div>

        {/* 状态消息 */}
        {uploadStatus.type && (
          <div className={`mb-6 p-4 rounded-md ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <div className="ml-3">
                <p className={`text-sm ${
                  uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {uploadStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 城市数据上传 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-blue-600" />
                城市标准数据上传
              </CardTitle>
              <CardDescription>
                上传城市社保缴纳标准数据（Excel格式）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'cities')}
              />
              <div className="text-sm text-gray-600">
                <p className="font-semibold mb-2">必需字段：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>id - 城市ID</li>
                  <li>city_name - 城市名称</li>
                  <li>year - 年份</li>
                  <li>rate - 缴纳比例</li>
                  <li>base_min - 缴费基数下限</li>
                  <li>base_max - 缴费基数上限</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 工资数据上传 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-green-600" />
                员工工资数据上传
              </CardTitle>
              <CardDescription>
                上传员工工资数据（Excel格式）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'salaries')}
              />
              <div className="text-sm text-gray-600">
                <p className="font-semibold mb-2">必需字段：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>id - 记录ID</li>
                  <li>employee_id - 员工工号</li>
                  <li>employee_name - 员工姓名</li>
                  <li>month - 月份（YYYYMM格式）</li>
                  <li>salary_amount - 工资金额</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 计算区域 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-purple-600" />
              执行计算
            </CardTitle>
            <CardDescription>
              选择城市和月份范围，执行社保公积金计算
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">选择城市</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择城市" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.city_name}>
                        {city.city_name} ({city.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">起始月份</label>
                <div className="flex gap-2">
                  <select
                    value={startMonth.substring(0, 4)}
                    onChange={(e) => setStartMonth(`${e.target.value}-${startMonth.substring(5)}`)}
                    className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                  <select
                    value={startMonth.substring(5)}
                    onChange={(e) => setStartMonth(`${startMonth.substring(0, 4)}-${e.target.value}`)}
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">结束月份</label>
                <div className="flex gap-2">
                  <select
                    value={endMonth.substring(0, 4)}
                    onChange={(e) => setEndMonth(`${e.target.value}-${endMonth.substring(5)}`)}
                    className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                  <select
                    value={endMonth.substring(5)}
                    onChange={(e) => setEndMonth(`${endMonth.substring(0, 4)}-${e.target.value}`)}
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={!selectedCity || !startMonth || !endMonth || isCalculating}
              className="w-full"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在计算...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  执行计算并存储结果
                </>
              )}
            </Button>

            <Link
              href={lastCalculation
                ? `/results?city=${encodeURIComponent(lastCalculation.cityName)}&start=${lastCalculation.startMonth}&end=${lastCalculation.endMonth}`
                : '/results'
              }
              target="_blank"
              className="w-full"
            >
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                查看计算结果
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}