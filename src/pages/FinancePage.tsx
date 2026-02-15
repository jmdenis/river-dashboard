import { useEffect, useState } from 'react'
import { api, type SpendingAnalysis, type WasteReport } from '../services/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { Loader2 } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart as RechartsAreaChart, Area } from 'recharts'

const COLORS = ['hsl(263, 70%, 58%)', 'hsl(160, 60%, 45%)', 'hsl(43, 74%, 66%)', 'hsl(0, 70%, 55%)', 'hsl(220, 70%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(330, 65%, 55%)', 'hsl(173, 58%, 39%)', 'hsl(30, 80%, 55%)', 'hsl(190, 60%, 50%)']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {typeof entry.value === 'number' ? `€${entry.value.toLocaleString('fr-FR')}` : entry.value}
        </p>
      ))}
    </div>
  )
}

export default function FinancePage() {
  const [spending, setSpending] = useState<SpendingAnalysis | null>(null)
  const [subscriptions, setSubscriptions] = useState<any>(null)
  const [insurance, setInsurance] = useState<any>(null)
  const [waste, setWaste] = useState<WasteReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getSpending(),
      api.getSubscriptions(),
      api.getInsurance(),
      api.getWaste(),
    ])
      .then(([spendingData, subsData, insuranceData, wasteData]) => {
        setSpending(spendingData)
        setSubscriptions(subsData)
        setInsurance(insuranceData)
        setWaste(wasteData)
      })
      .catch((error) => console.error('FinancePage: Error loading data:', error))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!spending || !subscriptions || !insurance || !waste) {
    return <div className="text-center text-muted-foreground py-12">Failed to load financial data</div>
  }

  const totalIncome = spending.monthly_trends.average_monthly_income * 14
  const totalExpenses = spending.category_analysis.total_expenses
  const savingsRate = spending.monthly_trends.average_savings_rate
  const potentialSavings = waste.totals.total_annual_waste + insurance.totals.total_potential_savings

  const donutData = spending.category_analysis.categories.slice(0, 10).map((c) => ({ name: c.name, value: c.total }))
  const barData = spending.fashion_deep_dive.top_brands.slice(0, 10).map((b) => ({ brand: b.brand, spending: b.total_spent }))
  const areaData = spending.monthly_trends.monthly.map((m) => ({ month: m.month, Income: m.income, Expenses: m.expenses }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Financial Intelligence</h1>
        <p className="text-muted-foreground">Comprehensive financial overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Total Income</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-green-600 dark:text-green-400">{'\u20AC'}{totalIncome.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Total Expenses</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{'\u20AC'}{totalExpenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Savings Rate</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{savingsRate.toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Subscriptions</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{'\u20AC'}{subscriptions.totals.total_monthly.toLocaleString('fr-FR')}/mo</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Potential Savings</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-green-600 dark:text-green-400">{'\u20AC'}{potentialSavings.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}/yr</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {barData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Fashion Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={barData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 14%)" />
                  <XAxis dataKey="brand" tick={{ fontSize: 11, fill: 'hsl(240, 5%, 55%)' }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(240, 5%, 55%)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="spending" name="Spending" fill="hsl(263, 70%, 58%)" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsAreaChart data={areaData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <defs>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 14%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(240, 5%, 55%)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(240, 5%, 55%)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Income" stroke="hsl(160, 60%, 45%)" fill="url(#gradIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="Expenses" stroke="hsl(0, 70%, 55%)" fill="url(#gradExpenses)" strokeWidth={2} />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Total Annual Waste</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-red-600 dark:text-red-400">{'\u20AC'}{waste.totals.total_annual_waste.toLocaleString('fr-FR')}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Bank Fees</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{'\u20AC'}{waste.totals.breakdown.bank_fees.toLocaleString('fr-FR')}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Small Forgotten Charges</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{'\u20AC'}{waste.totals.breakdown.small_forgotten_charges.toLocaleString('fr-FR')}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Annual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.subscriptions.map((sub: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{sub.merchant}</TableCell>
                  <TableCell>{sub.frequency}</TableCell>
                  <TableCell className="text-right">{'\u20AC'}{sub.monthly_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{'\u20AC'}{sub.annual_cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insurance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Market Avg</TableHead>
                <TableHead className="text-right">Cheapest</TableHead>
                <TableHead className="text-right">Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insurance.policies.map((p: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{p.merchant}</TableCell>
                  <TableCell className="text-right">{'\u20AC'}{p.annual_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.market_average ? `€${p.market_average}` : 'N/A'}</TableCell>
                  <TableCell className="text-right">{p.cheapest_alternative ? `€${p.cheapest_alternative}` : 'N/A'}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">{'\u20AC'}{p.potential_savings.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action Plan</CardTitle>
          <p className="text-sm text-muted-foreground">Prioritized recommendations with estimated savings</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { title: 'Reduce Bank Fees', description: 'Negotiate or switch banks', savings: waste.totals.breakdown.bank_fees },
              { title: 'Optimize Insurance', description: 'Compare and switch insurers', savings: insurance.totals.total_potential_savings },
              { title: 'Cancel Forgotten Charges', description: 'Remove unused subscriptions', savings: waste.totals.breakdown.small_forgotten_charges },
            ].sort((a, b) => b.savings - a.savings).map((action, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div><p className="font-medium">{action.title}</p><p className="text-sm text-muted-foreground">{action.description}</p></div>
                <div className="text-xl font-light text-green-600 dark:text-green-400">{'\u20AC'}{action.savings.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}/yr</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
