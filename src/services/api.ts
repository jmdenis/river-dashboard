const API_BASE = '/api/finance'

export interface Transaction {
  date: string
  amount: number
  original_description: string
  normalized_merchant: string
  primary_category: string
  sub_category: string | null
}

export interface Subscription {
  merchant: string
  frequency: string
  avg_amount: number
  monthly_cost: number
  annual_cost: number
  transaction_count: number
  first_seen: string
  last_seen: string
  category: string
  is_zombie: boolean
  price_changes: any[]
}

export interface InsurancePolicy {
  merchant: string
  annual_cost: number
  transaction_count: number
  first_seen: string
  last_seen: string
  market_average: number | null
  cheapest_alternative: number | null
  potential_savings: number
}

export interface WasteReport {
  bank_fees: {
    fees: any[]
    total_annual: number
    count: number
  }
  refunds_and_returns: {
    returns: any[]
    total_returned: number
    total_purchased: number
    return_rate_percent: number
    count: number
  }
  small_forgotten_charges: any[]
  duplicate_services: any[]
  totals: {
    total_annual_waste: number
    breakdown: {
      bank_fees: number
      small_forgotten_charges: number
    }
  }
}

export interface SpendingAnalysis {
  category_analysis: {
    categories: Array<{
      name: string
      total: number
      count: number
      average_per_transaction: number
    }>
    total_expenses: number
  }
  fashion_deep_dive: {
    top_brands: Array<{
      brand: string
      total_spent: number
      purchase_count: number
      impulse_purchases: number
    }>
    subcategory_breakdown: Record<string, number>
    total_fashion_spending: number
    total_transactions: number
  }
  beauty_deep_dive: {
    top_brands: Array<{
      brand: string
      total: number
    }>
    subcategory_breakdown: Record<string, number>
    total_beauty_spending: number
    total_transactions: number
  }
  top_merchants: Array<{
    merchant: string
    lifetime_spend: number
  }>
  monthly_trends: {
    monthly: Array<{
      month: string
      income: number
      expenses: number
      savings: number
      savings_rate_percent: number
      by_category: Record<string, number>
    }>
    average_monthly_expenses: number
    average_monthly_income: number
    average_savings_rate: number
  }
  patterns: {
    most_expensive_day_of_week: string
    most_expensive_day_amount: number
  }
}

export const api = {
  async getTransactions(token: string): Promise<Transaction[]> {
    console.log('Fetching transactions...');
    const res = await fetch(`${API_BASE}/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch transactions:', res.statusText); return []; }
    const data = await res.json();
    console.log('Transactions fetched:', data);
    return data;
  },

  async getSubscriptions(token: string): Promise<{
    subscriptions: Subscription[]
    totals: {
      total_monthly: number
      total_annual: number
      cost_per_day: number
      subscription_count: number
    }
  }> {
    console.log('Fetching subscriptions...');
    const res = await fetch(`${API_BASE}/subscriptions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch subscriptions:', res.statusText); return { subscriptions: [], totals: { total_monthly: 0, total_annual: 0, cost_per_day: 0, subscription_count: 0 } }; }
    const data = await res.json();
    console.log('Subscriptions fetched:', data);
    return data;
  },

  async getInsurance(token: string): Promise<{
    policies: InsurancePolicy[]
    totals: {
      total_current_annual_cost: number
      total_potential_savings: number
      policies_analyzed: number
    }
  }> {
    console.log('Fetching insurance...');
    const res = await fetch(`${API_BASE}/insurance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch insurance:', res.statusText); return { policies: [], totals: { total_current_annual_cost: 0, total_potential_savings: 0, policies_analyzed: 0 } }; }
    const data = await res.json();
    console.log('Insurance fetched:', data);
    return data;
  },

  async getWaste(token: string): Promise<WasteReport> {
    console.log('Fetching waste...');
    const res = await fetch(`${API_BASE}/waste`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch waste:', res.statusText); return { bank_fees: { fees: [], total_annual: 0, count: 0 }, refunds_and_returns: { returns: [], total_returned: 0, total_purchased: 0, return_rate_percent: 0, count: 0 }, small_forgotten_charges: [], duplicate_services: [], totals: { total_annual_waste: 0, breakdown: { bank_fees: 0, small_forgotten_charges: 0 } } }; }
    const data = await res.json();
    console.log('Waste fetched:', data);
    return data;
  },

  async getSpending(token: string): Promise<SpendingAnalysis> {
    console.log('Fetching spending...');
    const res = await fetch(`${API_BASE}/spending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch spending:', res.statusText); return { category_analysis: { categories: [], total_expenses: 0 }, fashion_deep_dive: { top_brands: [], subcategory_breakdown: {}, total_fashion_spending: 0, total_transactions: 0 }, beauty_deep_dive: { top_brands: [], subcategory_breakdown: {}, total_beauty_spending: 0, total_transactions: 0 }, top_merchants: [], monthly_trends: { monthly: [], average_monthly_expenses: 0, average_monthly_income: 0, average_savings_rate: 0 }, patterns: { most_expensive_day_of_week: '', most_expensive_day_amount: 0 } }; }
    const data = await res.json();
    console.log('Spending fetched:', data);
    return data;
  },
}
