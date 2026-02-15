import { useEffect, useState } from 'react'
import { api, type SpendingAnalysis, type WasteReport } from '../services/api'
import { Card, Title, Text, DonutChart, BarChart, LineChart, AreaChart } from '@tremor/react'
import { Loader2 } from 'lucide-react'

export default function FinancePage() {
  const [spending, setSpending] = useState<SpendingAnalysis | null>(null)
  const [subscriptions, setSubscriptions] = useState<any>(null)
  const [insurance, setInsurance] = useState<any>(null)
  const [waste, setWaste] = useState<WasteReport | null>(null)
  const [loading, setLoading] = useState(true)

  // Extract token from URL
  const token = window.location.pathname.split('/dash/')[1]?.split('/')[0] || '';

  useEffect(() => {
    console.log('FinancePage: useEffect triggered with token:', token);
    Promise.all([
      api.getSpending(token),
      api.getSubscriptions(token),
      api.getInsurance(token),
      api.getWaste(token),
    ])
      .then(([spendingData, subsData, insuranceData, wasteData]) => {
        console.log('FinancePage: Data received - spending:', spendingData, 'subs:', subsData, 'ins:', insuranceData, 'waste:', wasteData);
        setSpending(spendingData)
        setSubscriptions(subsData)
        setInsurance(insuranceData)
        setWaste(wasteData)
      })
      .catch(error => {
        console.error('FinancePage: Error loading data:', error);
      })
      .finally(() => {
        console.log('FinancePage: Data load finished.');
        setLoading(false);
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!spending || !subscriptions || !insurance || !waste) {
    return <div className="text-center text-muted-foreground py-12">Erreur de chargement des données</div>
  }

  const totalIncome = spending.monthly_trends.average_monthly_income * 14
  const totalExpenses = spending.category_analysis.total_expenses
  const savingsRate = spending.monthly_trends.average_savings_rate
  const potentialSavings = waste.totals.total_annual_waste + insurance.totals.total_potential_savings

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Financial Intelligence</h1>
        <p className="text-muted-foreground">Comprehensive financial overview</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card">
          <Text>Total Income</Text>
          <Title className="text-green-600 dark:text-green-400">
            €{totalIncome.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
          </Title>
        </Card>
        <Card className="bg-card">
          <Text>Total Expenses</Text>
          <Title>€{totalExpenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</Title>
        </Card>
        <Card className="bg-card">
          <Text>Savings Rate</Text>
          <Title>{savingsRate.toFixed(1)}%</Title>
        </Card>
        <Card className="bg-card">
          <Text>Subscriptions Cost</Text>
          <Title className="text-amber-600 dark:text-amber-400">
            €{subscriptions.totals.total_monthly.toLocaleString('fr-FR')}/mois
          </Title>
        </Card>
        <Card className="bg-card">
          <Text>Potential Savings</Text>
          <Title className="text-green-600 dark:text-green-400">
            €{potentialSavings.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}/an
          </Title>
        </Card>
      </div>

      {/* Spending by Category */}
      <Card className="bg-card">
        <Title>Spending by Category</Title>
        <DonutChart
          className="mt-6 h-80"
          data={spending.category_analysis.categories.slice(0, 10).map((c) => ({
            name: c.name,
            value: c.total,
          }))}
          category="value"
          index="name"
          valueFormatter={(value) => `€${value.toLocaleString('fr-FR')}`}
          colors={['violet', 'emerald', 'amber', 'red', 'blue', 'purple', 'pink', 'teal', 'orange', 'cyan']}
        />
      </Card>

      {/* Fashion & Beauty */}
      {spending.fashion_deep_dive.top_brands.length > 0 && (
        <Card className="bg-card">
          <Title>Top 10 Fashion Brands</Title>
          <BarChart
            className="mt-6 h-80"
            data={spending.fashion_deep_dive.top_brands.slice(0, 10).map((b) => ({
              brand: b.brand,
              'Spending (€)': b.total_spent,
            }))}
            index="brand"
            categories={['Spending (€)']}
            colors={['violet']}
            valueFormatter={(value) => `€${value.toLocaleString('fr-FR')}`}
          />
        </Card>
      )}

      {/* Monthly Trends */}
      <Card className="bg-card">
        <Title>Monthly Trends</Title>
        <AreaChart
          className="mt-6 h-80"
          data={spending.monthly_trends.monthly.map((m) => ({
            month: m.month,
            Income: m.income,
            Expenses: m.expenses,
          }))}
          index="month"
          categories={['Income', 'Expenses']}
          colors={['emerald', 'red']}
          valueFormatter={(value) => `€${value.toLocaleString('fr-FR')}`}
        />
      </Card>

      {/* Waste Report */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card">
          <Text>Total Annual Waste</Text>
          <Title className="text-red-600 dark:text-red-400">
            €{waste.totals.total_annual_waste.toLocaleString('fr-FR')}
          </Title>
        </Card>
        <Card className="bg-card">
          <Text>Bank Fees</Text>
          <Title>€{waste.totals.breakdown.bank_fees.toLocaleString('fr-FR')}</Title>
        </Card>
        <Card className="bg-card">
          <Text>Small Forgotten Charges</Text>
          <Title>€{waste.totals.breakdown.small_forgotten_charges.toLocaleString('fr-FR')}</Title>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-card">
        <Title>Subscription Manager</Title>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Service</th>
                <th className="text-left p-2">Frequency</th>
                <th className="text-right p-2">Monthly</th>
                <th className="text-right p-2">Annual</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.subscriptions.map((sub: any, i: number) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="p-2">{sub.merchant}</td>
                  <td className="p-2">{sub.frequency}</td>
                  <td className="text-right p-2">€{sub.monthly_cost.toFixed(2)}</td>
                  <td className="text-right p-2">€{sub.annual_cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insurance Table */}
      <Card className="bg-card">
        <Title>Insurance Comparison</Title>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Policy</th>
                <th className="text-right p-2">Current Cost</th>
                <th className="text-right p-2">Market Avg</th>
                <th className="text-right p-2">Cheapest Alt</th>
                <th className="text-right p-2">Savings</th>
              </tr>
            </thead>
            <tbody>
              {insurance.policies.map((policy: any, i: number) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="p-2">{policy.merchant}</td>
                  <td className="text-right p-2">€{policy.annual_cost.toFixed(2)}</td>
                  <td className="text-right p-2">{policy.market_average ? `€${policy.market_average}` : 'N/A'}</td>
                  <td className="text-right p-2">{policy.cheapest_alternative ? `€${policy.cheapest_alternative}` : 'N/A'}</td>
                  <td className="text-right p-2 text-green-600 dark:text-green-400">€{policy.potential_savings.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Action Plan */}
      <Card className="bg-card">
        <Title>Action Plan</Title>
        <Text>Prioritized recommendations with estimated savings</Text>
        <div className="mt-6 space-y-3">
          {[
            {
              title: 'Reduce Bank Fees',
              description: 'Negotiate with your bank or change banks',
              savings: waste.totals.breakdown.bank_fees,
            },
            {
              title: 'Optimize Insurance',
              description: 'Compare and change insurers',
              savings: insurance.totals.total_potential_savings,
            },
            {
              title: 'Cancel Small Forgotten Charges',
              description: 'Delete unused subscriptions',
              savings: waste.totals.breakdown.small_forgotten_charges,
            },
          ]
            .sort((a, b) => b.savings - a.savings)
            .map((action, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <div className="text-xl font-light text-green-600 dark:text-green-400">
                  €{action.savings.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}/an
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}
