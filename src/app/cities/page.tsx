'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Edit, Trash2, Upload, Save, X } from 'lucide-react'
import { City } from '@/types'
import * as XLSX from 'xlsx'

export default function CitiesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<City[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<Partial<City>>({
    city_name: '',
    year: new Date().getFullYear(),
    rate: 0,
    base_min: 0,
    base_max: 0
  })
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
      .eq('company_id', user?.id)
      .order('city_name', { ascending: true })

    if (data && !error) {
      setCities(data)
    }
  }

  const handleCreate = () => {
    setEditingCity(null)
    setIsCreating(true)
    setFormData({
      city_name: '',
      year: new Date().getFullYear(),
      rate: 0,
      base_min: 0,
      base_max: 0
    })
  }

  const handleEdit = (city: City) => {
    setEditingCity(city)
    setIsCreating(false)
    setFormData({
      city_name: city.city_name,
      year: city.year,
      rate: city.rate,
      base_min: city.base_min,
      base_max: city.base_max
    })
  }

  const handleSave = async () => {
    if (!formData.city_name || !formData.year || !formData.rate || !formData.base_min || !formData.base_max) {
      alert('请填写所有必需字段')
      return
    }

    if (formData.base_min! > formData.base_max!) {
      alert('基数下限不能大于上限')
      return
    }

    try {
      if (isCreating) {
        // 获取新的ID
        const maxId = cities.length > 0 ? Math.max(...cities.map(c => c.id)) : 0
        const { error } = await supabase
          .from('cities')
          .insert({
            id: maxId + 1,
            city_name: formData.city_name,
            year: formData.year,
            rate: formData.rate,
            base_min: formData.base_min,
            base_max: formData.base_max,
            company_id: user?.id
          })

        if (error) {
          alert('创建失败: ' + error.message)
        } else {
          await loadCities()
          setIsCreating(false)
          setFormData({})
        }
      } else if (editingCity) {
        const { error } = await supabase
          .from('cities')
          .update({
            city_name: formData.city_name,
            year: formData.year,
            rate: formData.rate,
            base_min: formData.base_min,
            base_max: formData.base_max
          })
          .eq('id', editingCity.id)
          .eq('company_id', user?.id)

        if (error) {
          alert('更新失败: ' + error.message)
        } else {
          await loadCities()
          setEditingCity(null)
        }
      }
    } catch (error) {
      alert('操作失败，请重试')
    }
  }

  const handleDelete = async (id: number, cityName: string) => {
    if (!confirm(`确定要删除 ${cityName} 吗？此操作不可恢复。`)) return

    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', id)
      .eq('company_id', user?.id)

    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      await loadCities()
    }
  }

  const handleCancel = () => {
    setEditingCity(null)
    setIsCreating(false)
    setFormData({})
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // 验证数据格式
      const requiredFields = ['city_name', 'year', 'rate', 'base_min', 'base_max']
      const invalidFields = requiredFields.filter(field =>
        !jsonData[0] || jsonData[0][field] === undefined
      )

      if (invalidFields.length > 0) {
        alert(`文件格式错误，缺少必要字段: ${invalidFields.join(', ')}`)
        return
      }

      // 获取新的ID起始值
      const maxId = cities.length > 0 ? Math.max(...cities.map(c => c.id)) : 0

      // 添加公司ID和ID
      const cityData = jsonData.map((item: any, index: number) => ({
        id: maxId + index + 1,
        ...item,
        company_id: user?.id
      }))

      const { error } = await supabase
        .from('cities')
        .upsert(cityData, { onConflict: 'id,company_id' })

      if (error) {
        alert('上传失败: ' + error.message)
      } else {
        alert(`成功上传 ${cityData.length} 条城市数据`)
        await loadCities()
      }
    } catch (error) {
      alert('文件解析失败，请检查文件格式')
    }
  }

  const filteredCities = cities.filter(city =>
    city.city_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.year.toString().includes(searchTerm)
  )

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
          <h1 className="text-3xl font-bold text-gray-900">城市管理</h1>
          <p className="mt-2 text-lg text-gray-600">
            管理城市社保缴纳标准数据
          </p>
        </div>

        {/* 操作栏 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>数据操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                新增城市
              </Button>

              <div className="flex items-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      批量导入
                    </span>
                  </Button>
                </label>
              </div>

              <Input
                placeholder="搜索城市名称或年份..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* 编辑表单 */}
        {(isCreating || editingCity) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {isCreating ? '新增城市' : `编辑城市 - ${editingCity?.city_name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">城市名称</label>
                  <Input
                    value={formData.city_name || ''}
                    onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                    placeholder="如：佛山"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">年份</label>
                  <Input
                    type="number"
                    value={formData.year || ''}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    placeholder="如：2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">缴费比例</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.rate || ''}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                    placeholder="如：0.14"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">基数下限</label>
                  <Input
                    type="number"
                    value={formData.base_min || ''}
                    onChange={(e) => setFormData({ ...formData, base_min: parseInt(e.target.value) })}
                    placeholder="如：4546"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">基数上限</label>
                  <Input
                    type="number"
                    value={formData.base_max || ''}
                    onChange={(e) => setFormData({ ...formData, base_max: parseInt(e.target.value) })}
                    placeholder="如：26421"
                  />
                </div>

                <div className="flex items-end space-x-2">
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 城市列表 */}
        <Card>
          <CardHeader>
            <CardTitle>城市列表</CardTitle>
            <CardDescription>
              共 {filteredCities.length} 条记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      城市名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      年份
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      缴费比例
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      基数下限
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      基数上限
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCities.map((city) => (
                    <tr key={city.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {city.city_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {city.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(city.rate * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{city.base_min.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{city.base_max.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(city)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(city.id, city.city_name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCities.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchTerm ? '没有找到匹配的城市' : '暂无城市数据，请点击"新增城市"添加'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}