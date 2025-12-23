import { createClient } from '@supabase/supabase-js'
import { generateCalculationResults, validateCalculationParams } from '@/lib/calculations'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // 使用 token 创建 Supabase 客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { cityName, startMonth, endMonth, companyId } = await request.json()

    // 验证参数
    const validation = validateCalculationParams(startMonth, endMonth)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // 获取城市数据
    const { data: cityData, error: cityError } = await supabase
      .from('cities')
      .select('*')
      .eq('city_name', cityName)
      .eq('company_id', user.id)
      .single()

    if (cityError || !cityData) {
      return NextResponse.json({ error: '找不到指定的城市数据' }, { status: 404 })
    }

    // 获取工资数据
    const { data: salaryData, error: salaryError } = await supabase
      .from('salaries')
      .select('*')
      .eq('company_id', user.id)
      .gte('yearmonth', startMonth)
      .lte('yearmonth', endMonth)

    if (salaryError) {
      return NextResponse.json({ error: '获取工资数据失败' }, { status: 500 })
    }

    if (!salaryData || salaryData.length === 0) {
      return NextResponse.json({ error: '指定月份范围内没有工资数据' }, { status: 404 })
    }

    // 执行计算
    const calculationInput = {
      city: cityData,
      salaries: salaryData,
      startMonth,
      endMonth
    }

    const results = generateCalculationResults(calculationInput)

    // 添加创建者信息
    const resultsWithCreator = results.map(result => ({
      ...result,
      created_by: user.id
    }))

    // 删除已有的计算结果（如果需要重新计算）
    await supabase
      .from('results')
      .delete()
      .eq('city_name', cityName)
      .eq('yearmonth_start', startMonth)
      .eq('yearmonth_end', endMonth)
      .eq('created_by', user.id)

    // 存储计算结果
    const { error: insertError } = await supabase
      .from('results')
      .insert(resultsWithCreator)

    if (insertError) {
      return NextResponse.json({
        error: '存储计算结果失败: ' + insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      message: '计算完成并已保存结果'
    })

  } catch (error) {
    console.error('计算过程中发生错误:', error)
    return NextResponse.json({
      error: '计算过程中发生未知错误'
    }, { status: 500 })
  }
}