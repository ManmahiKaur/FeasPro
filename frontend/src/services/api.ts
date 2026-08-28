import {
  Project,
  ProjectListItem,
  ProjectCreateInput,
  ProjectUpdateInput,
  Scenario,
  ScenarioCreateInput,
  User,
  AuthToken,
  RegisterInput,
  LandInput,
  LandInputUpdate,
  AcquisitionCostItem,
  CostItem,
  CostSummaryResponse,
  SalesProductItem,
  SalesSummaryResponse,
  CashFlowSummary,
  FundingAssumption,
  FundingSummaryResponse,
  FundingTranche,
  WaterfallResponse,
  ScheduleMilestone,
  ScheduleSummaryResponse,
  ScenarioComparisonResponse,
  FullFeasibilityResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';
const TOKEN_KEY = 'feaspro_auth_token';

let unauthorizedHandler: (() => void) | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to store auth token:', err);
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Failed to remove auth token:', err);
  }
}

export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      // Clear token on 401
      removeToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    let errorDetail = 'API request failed';
    try {
      const err = await response.json();
      if (err.detail) {
        if (typeof err.detail === 'string') {
          errorDetail = err.detail;
        } else if (Array.isArray(err.detail)) {
          errorDetail = err.detail.map((d: { msg: string }) => d.msg).join(', ');
        }
      }
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}


export const api = {
  // Projects
  async getProjects(params?: {
    search?: string;
    development_type?: string;
    status?: string;
    include_archived?: boolean;
  }): Promise<{ items: ProjectListItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.development_type) query.set('development_type', params.development_type);
    if (params?.status) query.set('status', params.status);
    if (params?.include_archived) query.set('include_archived', 'true');

    const qs = query.toString();
    return fetchJson<{ items: ProjectListItem[]; total: number }>(
      `${API_BASE}/projects${qs ? `?${qs}` : ''}`
    );
  },

  async getProject(id: string): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects/${id}`);
  },

  async createProject(data: ProjectCreateInput): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: ProjectUpdateInput): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async archiveProject(id: string): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async restoreProject(id: string): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects/${id}/restore`, {
      method: 'POST',
    });
  },

  // Scenarios
  async getScenarios(projectId: string): Promise<Scenario[]> {
    return fetchJson<Scenario[]>(`${API_BASE}/projects/${projectId}/scenarios`);
  },

  async createScenario(projectId: string, data: ScenarioCreateInput): Promise<Scenario> {
    return fetchJson<Scenario>(`${API_BASE}/projects/${projectId}/scenarios`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateScenario(scenarioId: string, data: Partial<ScenarioCreateInput>): Promise<Scenario> {
    return fetchJson<Scenario>(`${API_BASE}/scenarios/${scenarioId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async cloneScenario(
    projectId: string,
    scenarioId: string,
    data?: { name?: string; description?: string }
  ): Promise<Scenario> {
    return fetchJson<Scenario>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/clone`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    );
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    return fetchJson<void>(`${API_BASE}/scenarios/${scenarioId}`, {
      method: 'DELETE',
    });
  },

  async getScenarioComparison(projectId: string): Promise<ScenarioComparisonResponse> {
    return fetchJson<ScenarioComparisonResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/comparison`
    );
  },

  // Land & Acquisition
  async getLand(projectId: string, scenarioId: string): Promise<LandInput> {
    return fetchJson<LandInput>(`${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land`);
  },

  async updateLand(
    projectId: string,
    scenarioId: string,
    data: LandInputUpdate
  ): Promise<LandInput> {
    return fetchJson<LandInput>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async addAcquisitionCost(
    projectId: string,
    scenarioId: string,
    data: { category: string; name: string; amount: number | string; notes?: string; date?: string }
  ): Promise<AcquisitionCostItem> {
    return fetchJson<AcquisitionCostItem>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land/costs`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async updateAcquisitionCost(
    projectId: string,
    scenarioId: string,
    costId: string,
    data: { category?: string; name?: string; amount?: number | string; notes?: string; date?: string }
  ): Promise<AcquisitionCostItem> {
    return fetchJson<AcquisitionCostItem>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land/costs/${costId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  async deleteAcquisitionCost(
    projectId: string,
    scenarioId: string,
    costId: string
  ): Promise<void> {
    await fetchJson<void>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/land/costs/${costId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // Costs
  async getCosts(projectId: string, scenarioId: string): Promise<CostSummaryResponse> {
    return fetchJson<CostSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/costs`
    );
  },

  async updateCostsBatch(
    projectId: string,
    scenarioId: string,
    items: CostItem[]
  ): Promise<CostSummaryResponse> {
    return fetchJson<CostSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/costs`,
      {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }
    );
  },

  // Sales
  async getSales(projectId: string, scenarioId: string): Promise<SalesSummaryResponse> {
    return fetchJson<SalesSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/sales`
    );
  },

  async updateSalesBatch(
    projectId: string,
    scenarioId: string,
    items: SalesProductItem[]
  ): Promise<SalesSummaryResponse> {
    return fetchJson<SalesSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/sales`,
      {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }
    );
  },

  // Cash Flow
  async getCashFlow(
    projectId: string,
    scenarioId: string,
    durationMonths?: number
  ): Promise<CashFlowSummary> {
    const url = durationMonths
      ? `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/cashflow?duration_months=${durationMonths}`
      : `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/cashflow`;
    return fetchJson<CashFlowSummary>(url);
  },

  // Funding
  async getFunding(projectId: string, scenarioId: string): Promise<FundingSummaryResponse> {
    return fetchJson<FundingSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding`
    );
  },

  async updateFunding(
    projectId: string,
    scenarioId: string,
    data: Partial<FundingAssumption>
  ): Promise<FundingSummaryResponse> {
    return fetchJson<FundingSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  // Funding Tranches (Phase 2)
  async listTranches(projectId: string, scenarioId: string): Promise<FundingTranche[]> {
    return fetchJson<FundingTranche[]>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches`
    );
  },

  async createTranche(projectId: string, scenarioId: string, data: Omit<FundingTranche, 'id' | 'scenario_id' | 'created_at' | 'updated_at'>): Promise<FundingTranche> {
    return fetchJson<FundingTranche>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  },

  async updateTranche(projectId: string, scenarioId: string, trancheId: string, data: Omit<FundingTranche, 'id' | 'scenario_id' | 'created_at' | 'updated_at'>): Promise<FundingTranche> {
    return fetchJson<FundingTranche>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches/${trancheId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },

  async deleteTranche(projectId: string, scenarioId: string, trancheId: string): Promise<void> {
    await fetchJson<void>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/tranches/${trancheId}`,
      { method: 'DELETE' }
    );
  },

  async getWaterfall(projectId: string, scenarioId: string): Promise<WaterfallResponse> {
    return fetchJson<WaterfallResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/funding/waterfall`
    );
  },

  // Schedule
  async getSchedule(projectId: string, scenarioId: string): Promise<ScheduleSummaryResponse> {
    return fetchJson<ScheduleSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/schedule`
    );
  },

  async updateScheduleBatch(
    projectId: string,
    scenarioId: string,
    milestones: ScheduleMilestone[]
  ): Promise<ScheduleSummaryResponse> {
    return fetchJson<ScheduleSummaryResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/schedule`,
      {
        method: 'PUT',
        body: JSON.stringify({ milestones }),
      }
    );
  },

  // Feasibility & Valuation (Phase 1 Master Engine)
  async getFullFeasibility(projectId: string, scenarioId: string): Promise<FullFeasibilityResponse> {
    return fetchJson<FullFeasibilityResponse>(
      `${API_BASE}/projects/${projectId}/scenarios/${scenarioId}/feasibility`
    );
  },

  async evaluateStandaloneFeasibility(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return fetchJson<Record<string, unknown>>(`${API_BASE}/feasibility/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Auth / User
  async login(credentials: { email: string; password: string }): Promise<AuthToken> {
    const data = await fetchJson<AuthToken>(`${API_BASE}/auth/login/json`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.access_token) {
      setToken(data.access_token);
    }
    return data;
  },

  async register(data: RegisterInput): Promise<AuthToken> {
    const res = await fetchJson<AuthToken>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      setToken(res.access_token);
    }
    return res;
  },

  logout(): void {
    removeToken();
  },

  async getCurrentUser(): Promise<User> {
    return fetchJson<User>(`${API_BASE}/auth/me`);
  },
};


