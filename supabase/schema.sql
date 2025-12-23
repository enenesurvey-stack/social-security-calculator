-- 创建城市标准表
CREATE TABLE cities (
  id INT PRIMARY KEY,
  city_name TEXT NOT NULL,
  year INT NOT NULL,
  rate FLOAT NOT NULL CHECK (rate > 0 AND rate < 1),
  base_min INT NOT NULL CHECK (base_min > 0),
  base_max INT NOT NULL CHECK (base_max > base_min),
  company_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建员工工资表
CREATE TABLE salaries (
  id INT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  yearmonth INT NOT NULL CHECK (yearmonth >= 202001 AND yearmonth <= 203012),
  salary_amount INT NOT NULL CHECK (salary_amount > 0),
  company_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建计算结果表
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL,
  yearmonth_start INT NOT NULL,
  yearmonth_end INT NOT NULL,
  employee_name TEXT NOT NULL,
  avg_salary FLOAT NOT NULL CHECK (avg_salary > 0),
  contribution_base FLOAT NOT NULL CHECK (contribution_base > 0),
  company_fee FLOAT NOT NULL CHECK (company_fee > 0),
  rate FLOAT NOT NULL CHECK (rate > 0 AND rate < 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 创建索引
CREATE INDEX idx_cities_company ON cities(company_id);
CREATE INDEX idx_cities_name_year ON cities(city_name, year);
CREATE INDEX idx_salaries_company ON salaries(company_id);
CREATE INDEX idx_salaries_employee ON salaries(employee_name, yearmonth);
CREATE INDEX idx_results_company ON results(created_by);
CREATE INDEX idx_results_employee ON results(employee_name);
CREATE INDEX idx_results_city ON results(city_name);

-- 更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salaries_updated_at BEFORE UPDATE ON salaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- RLS策略
CREATE POLICY "Users can view their own cities" ON cities
  FOR SELECT USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own cities" ON cities
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their own cities" ON cities
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their own cities" ON cities
  FOR DELETE USING (auth.uid() = company_id);

CREATE POLICY "Users can view their own salaries" ON salaries
  FOR SELECT USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own salaries" ON salaries
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their own salaries" ON salaries
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their own salaries" ON salaries
  FOR DELETE USING (auth.uid() = company_id);

CREATE POLICY "Users can view their own results" ON results
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own results" ON results
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own results" ON results
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own results" ON results
  FOR DELETE USING (auth.uid() = created_by);