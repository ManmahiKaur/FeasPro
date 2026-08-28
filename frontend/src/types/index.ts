export type DevelopmentType =
  | 'residential_subdivision'
  | 'multi_unit_residential'
  | 'townhouses'
  | 'commercial_mixed_use'
  | 'industrial'
  | 'retail'
  | 'other';

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived';

export interface AcquisitionCostItem {
  id: string;
  land_id: string;
  category: string;
  name: string;
  amount: number | string;
  notes?: string | null;
  date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandCalculations {
  purchase_price: number | string;
  deposit_amount: number | string;
  total_acquisition_costs: number | string;
  total_land_acquisition: number | string;
  remaining_purchase_amount: number | string;
}

export interface LandInput {
  id: string;
  scenario_id: string;
  purchase_price: number | string;
  deposit_amount?: number | string | null;
  deposit_due_date?: string | null;
  contract_date?: string | null;
  settlement_date?: string | null;
  site_area?: number | string | null;
  site_area_unit: string;
  current_zoning?: string | null;
  existing_improvements?: string | null;
  planning_notes?: string | null;
  development_potential_notes?: string | null;
  acquisition_costs: AcquisitionCostItem[];
  calculations: LandCalculations;
  created_at: string;
  updated_at: string;
}

export interface LandInputUpdate {
  purchase_price?: number | string;
  deposit_amount?: number | string | null;
  deposit_due_date?: string | null;
  contract_date?: string | null;
  settlement_date?: string | null;
  site_area?: number | string | null;
  site_area_unit?: string;
  current_zoning?: string | null;
  existing_improvements?: string | null;
  planning_notes?: string | null;
  development_potential_notes?: string | null;
  acquisition_costs?: {
    category: string;
    name: string;
    amount: number | string;
    notes?: string | null;
    date?: string | null;
  }[];
}

// Costs Types
export interface CostItem {
  id?: string;
  scenario_id?: string;
  category: 'construction' | 'consultants' | 'statutory' | 'contingency' | 'holding' | 'other' | string;
  name: string;
  calculation_method: 'fixed_amount' | 'rate_per_sqm' | 'percent_construction' | string;
  quantity?: number | string | null;
  rate?: number | string | null;
  amount: number | string;
  phasing_curve: 's_curve' | 'linear' | 'upfront' | 'end' | string;
  start_month: number;
  end_month: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CostCalculationSummary {
  construction_subtotal: number | string;
  consultants_subtotal: number | string;
  statutory_subtotal: number | string;
  contingency_subtotal: number | string;
  holding_subtotal: number | string;
  other_subtotal: number | string;
  total_development_cost_ex_land: number | string;
  land_acquisition_total: number | string;
  total_project_cost: number | string;
}

export interface CostSummaryResponse {
  summary: CostCalculationSummary;
  items: CostItem[];
}

// Sales Types
export interface SalesProductItem {
  id?: string;
  scenario_id?: string;
  name: string;
  unit_type: string;
  total_units: number;
  avg_internal_area: number | string;
  avg_external_area: number | string;
  price_per_sqm?: number | string | null;
  unit_sale_price: number | string;
  total_revenue: number | string;
  sales_commission_pct: number | string;
  marketing_cost_pct: number | string;
  gst_applicable?: boolean;
  sales_start_month: number;
  sales_end_month: number;
  settlement_month: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalesCalculationSummary {
  total_units: number;
  total_internal_area: number | string;
  total_external_area: number | string;
  gross_realisation_value: number | string;
  total_commissions: number | string;
  total_marketing: number | string;
  total_selling_costs: number | string;
  net_realisation_value: number | string;
  avg_price_per_unit: number | string;
  avg_rate_sqm: number | string;
}

export interface SalesSummaryResponse {
  summary: SalesCalculationSummary;
  items: SalesProductItem[];
}

// Cash Flow Types
export interface MonthlyCashFlow {
  month: number;
  period_label: string;
  land_cost?: number;
  construction_cost: number;
  consultant_cost?: number;
  statutory_holding_cost?: number;
  acquisition_cost?: number;
  total_outflow?: number;
  revenue: number;
  net_cashflow: number;
  cumulative_cashflow: number;
  debt_drawdown?: number;
  cumulative_debt?: number;
}

export interface CashFlowSummary {
  project_duration_months: number;
  total_revenue: number;
  total_costs: number;
  net_profit: number;
  project_irr: number;
  peak_debt: number;
  monthly_data: MonthlyCashFlow[];
}

// Funding & Capital Stack Types
export interface FundingAssumption {
  id?: string;
  scenario_id?: string;
  senior_debt_enabled: boolean;
  senior_max_ltc_pct: number | string;
  senior_max_lvr_pct: number | string;
  senior_interest_rate_pct: number | string;
  senior_line_fee_pct: number | string;
  senior_establishment_fee_pct: number | string;
  mezzanine_enabled: boolean;
  mezzanine_amount: number | string;
  mezzanine_interest_rate_pct: number | string;
  target_equity_contribution?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FundingCalculationSummary {
  senior_debt_facility_limit: number | string;
  senior_ltc_cap: number | string;
  senior_lvr_cap: number | string;
  constraining_factor: string;
  mezzanine_facility_limit: number | string;
  total_debt_facility: number | string;
  required_developer_equity: number | string;
  debt_percentage: number | string;
  equity_percentage: number | string;
  senior_establishment_fee: number | string;
  senior_interest_cost: number | string;
  senior_line_fee: number | string;
  mezzanine_interest_cost: number | string;
  total_estimated_finance_cost: number | string;
  net_profit_after_finance: number | string;
  return_on_equity_pct: number | string;
}

export interface FundingSummaryResponse {
  assumption: FundingAssumption;
  summary: FundingCalculationSummary;
}

// Schedule & Gantt Types
export interface ScheduleMilestone {
  id?: string;
  scenario_id?: string;
  stage: 'acquisition' | 'planning_da' | 'presales' | 'civil_demo' | 'construction' | 'titling' | 'settlement' | string;
  name: string;
  start_month: number;
  duration_months: number;
  end_month: number;
  status: 'planned' | 'in_progress' | 'completed' | string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleSummaryResponse {
  project_total_months: number;
  construction_duration_months: number;
  milestones: ScheduleMilestone[];
}

export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  is_baseline: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ScenarioMetrics {
  scenario_id: string;
  name: string;
  is_baseline: boolean;
  status: string;
  total_units: number;
  total_internal_area: number | string;
  gross_realisation_value: number | string;
  net_realisation_value: number | string;
  land_acquisition_total: number | string;
  construction_subtotal: number | string;
  total_development_cost_ex_land: number | string;
  total_project_cost: number | string;
  net_profit: number | string;
  margin_on_cost_pct: number | string;
  margin_on_grv_pct: number | string;
  project_irr: number;
  peak_debt: number;
  required_developer_equity: number | string;
  return_on_equity_pct: number | string;
  duration_months: number;
}

export interface ScenarioComparisonResponse {
  project_id: string;
  project_name: string;
  baseline_scenario_id: string | null;
  scenarios: ScenarioMetrics[];
}

export interface Project {
  id: string;
  organization_id: string;
  created_by_id?: string | null;
  name: string;
  description?: string | null;
  location?: string | null;
  development_type: DevelopmentType;
  status: ProjectStatus;
  start_date?: string | null;
  target_completion_date?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  scenarios: Scenario[];
}

export interface ProjectListItem {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  development_type: DevelopmentType;
  status: ProjectStatus;
  start_date?: string | null;
  target_completion_date?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  scenario_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  location?: string;
  development_type: DevelopmentType;
  status?: ProjectStatus;
  start_date?: string;
  target_completion_date?: string;
  initial_scenario_name?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  location?: string;
  development_type?: DevelopmentType;
  status?: ProjectStatus;
  start_date?: string;
  target_completion_date?: string;
}

export interface ScenarioCreateInput {
  name: string;
  description?: string;
  is_baseline?: boolean;
  status?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  organization_id: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterInput {
  full_name: string;
  email: string;
  organization_name: string;
  password: string;
  confirm_password?: string;
}
