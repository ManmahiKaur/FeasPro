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


