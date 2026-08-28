import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Coins,
  DollarSign,
  TrendingUp,
  Percent,
  ShieldCheck,
  Building,
  Sparkles,
} from 'lucide-react';
import { FundingAssumption, FundingCalculationSummary, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface FundingWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onFundingUpdated?: (summary: FundingCalculationSummary) => void;
}

export const FundingWorkspace: React.FC<FundingWorkspaceProps> = ({
  projectId,
  scenario,
  onFundingUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [seniorDebtEnabled, setSeniorDebtEnabled] = useState<boolean>(true);
  const [seniorMaxLtc, setSeniorMaxLtc] = useState<string>('70.00');
  const [seniorMaxLvr, setSeniorMaxLvr] = useState<string>('65.00');
  const [seniorInterestRate, setSeniorInterestRate] = useState<string>('8.50');
  const [seniorLineFee, setSeniorLineFee] = useState<string>('1.50');
  const [seniorEstFee, setSeniorEstFee] = useState<string>('1.00');

  const [mezzanineEnabled, setMezzanineEnabled] = useState<boolean>(false);
  const [mezzanineAmount, setMezzanineAmount] = useState<string>('0');
  const [mezzanineInterestRate, setMezzanineInterestRate] = useState<string>('15.00');

  const [targetEquity, setTargetEquity] = useState<string>('0');
  const [summary, setSummary] = useState<FundingCalculationSummary | null>(null);

  const loadFundingData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getFunding(projectId, scenario.id);
      const a = res.assumption;
      setSeniorDebtEnabled(a.senior_debt_enabled);
      setSeniorMaxLtc(String(a.senior_max_ltc_pct || '70.00'));
      setSeniorMaxLvr(String(a.senior_max_lvr_pct || '65.00'));
      setSeniorInterestRate(String(a.senior_interest_rate_pct || '8.50'));
      setSeniorLineFee(String(a.senior_line_fee_pct || '1.50'));
      setSeniorEstFee(String(a.senior_establishment_fee_pct || '1.00'));

      setMezzanineEnabled(a.mezzanine_enabled);
      setMezzanineAmount(String(a.mezzanine_amount || '0'));
      setMezzanineInterestRate(String(a.mezzanine_interest_rate_pct || '15.00'));

      setTargetEquity(String(a.target_equity_contribution || '0'));
      setSummary(res.summary);
      if (onFundingUpdated) onFundingUpdated(res.summary);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load funding assumptions.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, onFundingUpdated]);

  useEffect(() => {
    loadFundingData();
  }, [loadFundingData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: Partial<FundingAssumption> = {
        senior_debt_enabled: seniorDebtEnabled,
        senior_max_ltc_pct: parseFloat(seniorMaxLtc) || 70.0,
        senior_max_lvr_pct: parseFloat(seniorMaxLvr) || 65.0,
        senior_interest_rate_pct: parseFloat(seniorInterestRate) || 8.5,
        senior_line_fee_pct: parseFloat(seniorLineFee) || 1.5,
        senior_establishment_fee_pct: parseFloat(seniorEstFee) || 1.0,
        mezzanine_enabled: mezzanineEnabled,
        mezzanine_amount: parseFloat(mezzanineAmount) || 0,
        mezzanine_interest_rate_pct: parseFloat(mezzanineInterestRate) || 15.0,
        target_equity_contribution: parseFloat(targetEquity) || 0,
      };

      const res = await api.updateFunding(projectId, scenario.id, payload);
      setSummary(res.summary);
      setSaveSuccess(true);
      if (onFundingUpdated) onFundingUpdated(res.summary);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save funding assumptions.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading capital stack & funding facilities...</p>
      </div>
    );
  }

  const seniorFacility = summary ? parseFloat(String(summary.senior_debt_facility_limit)) : 0;
  const reqEquity = summary ? parseFloat(String(summary.required_developer_equity)) : 0;
  const financeCost = summary ? parseFloat(String(summary.total_estimated_finance_cost)) : 0;
  const roe = summary ? parseFloat(String(summary.return_on_equity_pct)) : 0;
  const debtPct = summary ? parseFloat(String(summary.debt_percentage)) : 0;
  const equityPct = summary ? parseFloat(String(summary.equity_percentage)) : 0;

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving funding:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Capital stack and financing structure updated successfully!
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Senior Debt Facility</span>
            <Building size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(seniorFacility)}</div>
          <div className="kpi-subtext">
            Constrained by {summary?.constraining_factor || 'LTC Limit'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Required Developer Equity</span>
            <Coins size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(reqEquity)}</div>
          <div className="kpi-subtext">{equityPct.toFixed(1)}% of Total Project Cost</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Estimated Finance Costs</span>
            <DollarSign size={18} className="kpi-icon text-warning" />
          </div>
          <div className="kpi-value text-warning">{formatCurrency(financeCost)}</div>
          <div className="kpi-subtext">Interest, Line & Establishment Fees</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Return on Equity (ROE)</span>
            <TrendingUp size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value">{roe.toFixed(2)}%</div>
          <div className="kpi-subtext">Net Return on Developer Equity</div>
        </div>
      </div>

      {/* Visual Capital Stack Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Capital Stack Structure</h3>
          <p className="card-subtitle">Distribution of Senior Debt, Mezzanine, and Developer Equity funding.</p>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', height: '28px', width: '100%', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
            <div
              style={{
                width: `${debtPct}%`,
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'width 0.3s ease',
              }}
              title={`Senior Debt: ${formatCurrency(seniorFacility)} (${debtPct.toFixed(1)}%)`}
            >
              {debtPct > 15 ? `Debt (${debtPct.toFixed(1)}%)` : ''}
            </div>
            <div
              style={{
                width: `${equityPct}%`,
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'width 0.3s ease',
              }}
              title={`Developer Equity: ${formatCurrency(reqEquity)} (${equityPct.toFixed(1)}%)`}
            >
              {equityPct > 15 ? `Equity (${equityPct.toFixed(1)}%)` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px' }}></span>
              <span>Senior Debt: <strong>{formatCurrency(seniorFacility)}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '3px' }}></span>
              <span>Developer Equity: <strong>{formatCurrency(reqEquity)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Parameters Form */}
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Senior Debt Facility */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-icon-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="card-title">Senior Construction Loan</h3>
                  <p className="card-subtitle">Primary bank or private debt facility</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={seniorDebtEnabled}
                  onChange={(e) => setSeniorDebtEnabled(e.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>

            <div className="card-body">
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Max Loan-to-Cost (LTC %)</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={seniorMaxLtc}
                    onChange={(e) => setSeniorMaxLtc(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span className="input-group-addon">%</span>
                </div>
                <small className="form-text text-muted">
                  Cap: {formatCurrency(summary?.senior_ltc_cap ? parseFloat(String(summary.senior_ltc_cap)) : 0)}
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Max Loan-to-Value (LVR / Net GRV %)</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={seniorMaxLvr}
                    onChange={(e) => setSeniorMaxLvr(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span className="input-group-addon">%</span>
                </div>
                <small className="form-text text-muted">
                  Cap: {formatCurrency(summary?.senior_lvr_cap ? parseFloat(String(summary.senior_lvr_cap)) : 0)}
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Annual Interest Rate (% p.a.)</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="form-control"
                    value={seniorInterestRate}
                    onChange={(e) => setSeniorInterestRate(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span className="input-group-addon">%</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Line / Facility Fee (% p.a.)</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="form-control"
                    value={seniorLineFee}
                    onChange={(e) => setSeniorLineFee(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span className="input-group-addon">%</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Establishment / Upfront Fee (%)</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="form-control"
                    value={seniorEstFee}
                    onChange={(e) => setSeniorEstFee(e.target.value)}
                    disabled={!seniorDebtEnabled}
                  />
                  <span className="input-group-addon">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mezzanine & Developer Equity */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-icon-badge" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', padding: '8px', borderRadius: '8px' }}>
                  <Percent size={20} />
                </div>
                <div>
                  <h3 className="card-title">Mezzanine & Equity Layer</h3>
                  <p className="card-subtitle">Secondary financing and sponsor equity</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={mezzanineEnabled}
                  onChange={(e) => setMezzanineEnabled(e.target.checked)}
                />
                <span>Mezzanine</span>
              </label>
            </div>

            <div className="card-body">
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Mezzanine Loan Facility ($)</label>
                <input
                  type="number"
                  step="1000"
                  className="form-control"
                  value={mezzanineAmount}
                  onChange={(e) => setMezzanineAmount(e.target.value)}
                  disabled={!mezzanineEnabled}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Mezzanine Interest Rate (% p.a.)</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={mezzanineInterestRate}
                    onChange={(e) => setMezzanineInterestRate(e.target.value)}
                    disabled={!mezzanineEnabled}
                  />
                  <span className="input-group-addon">%</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Equity Sizing</h4>
                <div className="form-group">
                  <label className="form-label">Calculated Equity Required</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formatCurrency(reqEquity)}
                    disabled
                    style={{ backgroundColor: '#f1f5f9', fontWeight: 600 }}
                  />
                  <small className="form-text text-muted">
                    Total Project Cost minus Total Debt Facility
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Funding facility structure updates project cash flow and returns</span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '150px' }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Funding'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
