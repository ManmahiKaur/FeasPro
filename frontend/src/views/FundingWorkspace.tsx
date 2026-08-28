import React, { useState, useEffect, useCallback } from 'react';
import {
  Save, AlertCircle, CheckCircle2, Coins, DollarSign, TrendingUp,
  Percent, ShieldCheck, Building, Sparkles, Plus, Trash2, ArrowUpDown,
} from 'lucide-react';
import {
  FundingAssumption, FundingCalculationSummary, FundingTranche,
  TrancheType, WaterfallResponse, Scenario,
} from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface FundingWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onFundingUpdated?: (summary: FundingCalculationSummary) => void;
}

const TRANCHE_COLORS: Record<TrancheType, string> = {
  senior_debt: '#2563eb',
  mezzanine: '#7c3aed',
  preferred_equity: '#f59e0b',
  ordinary_equity: '#10b981',
};

const TRANCHE_LABELS: Record<TrancheType, string> = {
  senior_debt: 'Senior Debt',
  mezzanine: 'Mezzanine',
  preferred_equity: 'Preferred Equity',
  ordinary_equity: 'Ordinary Equity',
};

const TRANCHE_TYPES: TrancheType[] = ['senior_debt', 'mezzanine', 'preferred_equity', 'ordinary_equity'];

const toNum = (v: unknown) => parseFloat(String(v)) || 0;

export const FundingWorkspace: React.FC<FundingWorkspaceProps> = ({ projectId, scenario, onFundingUpdated }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const [tranches, setTranches] = useState<FundingTranche[]>([]);
  const [waterfall, setWaterfall] = useState<WaterfallResponse | null>(null);
  const [trancheError, setTrancheError] = useState<string | null>(null);
  const [savingTranche, setSavingTranche] = useState<string | null>(null);

  const refreshWaterfall = useCallback(async () => {
    try {
      const wf = await api.getWaterfall(projectId, scenario.id);
      setWaterfall(wf);
    } catch { setWaterfall(null); }
  }, [projectId, scenario.id]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [fundingRes, trancheRes] = await Promise.all([
        api.getFunding(projectId, scenario.id),
        api.listTranches(projectId, scenario.id).catch(() => [] as FundingTranche[]),
      ]);
      const a = fundingRes.assumption;
      setSeniorDebtEnabled(a.senior_debt_enabled);
      setSeniorMaxLtc(String(a.senior_max_ltc_pct ?? '70.00'));
      setSeniorMaxLvr(String(a.senior_max_lvr_pct ?? '65.00'));
      setSeniorInterestRate(String(a.senior_interest_rate_pct ?? '8.50'));
      setSeniorLineFee(String(a.senior_line_fee_pct ?? '1.50'));
      setSeniorEstFee(String(a.senior_establishment_fee_pct ?? '1.00'));
      setMezzanineEnabled(a.mezzanine_enabled);
      setMezzanineAmount(String(a.mezzanine_amount ?? '0'));
      setMezzanineInterestRate(String(a.mezzanine_interest_rate_pct ?? '15.00'));
      setTargetEquity(String(a.target_equity_contribution ?? '0'));
      setSummary(fundingRes.summary);
      setTranches(trancheRes);
      if (onFundingUpdated) onFundingUpdated(fundingRes.summary);
      if (trancheRes.length > 0) await refreshWaterfall();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load funding data.');
    } finally { setLoading(false); }
  }, [projectId, scenario.id, onFundingUpdated, refreshWaterfall]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true); setErrorMessage(null); setSaveSuccess(false);
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
      if (tranches.length > 0) await refreshWaterfall();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save funding.');
    } finally { setSaving(false); }
  };

  const handleAddTranche = async () => {
    try {
      setTrancheError(null);
      const newT = await api.createTranche(projectId, scenario.id, {
        tranche_type: 'ordinary_equity',
        name: `Equity Tranche ${tranches.length + 1}`,
        priority_order: tranches.length + 1,
        amount: 0, hurdle_rate_pct: 0, investor_split_pct: 80, developer_promote_pct: 20,
      });
      setTranches(prev => [...prev, newT]);
      await refreshWaterfall();
    } catch { setTrancheError('Failed to add tranche.'); }
  };

  const handleUpdateTranche = (tranche: FundingTranche, field: keyof FundingTranche, value: string | number) => {
    setTranches(prev => prev.map(t => t.id === tranche.id ? { ...t, [field]: value } : t));
  };

  const handleSaveTranche = async (tranche: FundingTranche) => {
    if (!tranche.id) return;
    setSavingTranche(tranche.id);
    try {
      const saved = await api.updateTranche(projectId, scenario.id, tranche.id, {
        tranche_type: tranche.tranche_type, name: tranche.name,
        priority_order: tranche.priority_order,
        amount: toNum(tranche.amount), hurdle_rate_pct: toNum(tranche.hurdle_rate_pct),
        investor_split_pct: toNum(tranche.investor_split_pct),
        developer_promote_pct: toNum(tranche.developer_promote_pct),
      });
      setTranches(prev => prev.map(t => t.id === saved.id ? saved : t));
      await refreshWaterfall();
    } catch { setTrancheError('Failed to save tranche.'); }
    finally { setSavingTranche(null); }
  };

  const handleDeleteTranche = async (id: string) => {
    try {
      await api.deleteTranche(projectId, scenario.id, id);
      setTranches(prev => prev.filter(t => t.id !== id));
      await refreshWaterfall();
    } catch { setTrancheError('Failed to delete tranche.'); }
  };

  if (loading && !summary) return (
    <div className="view-loading"><div className="loading-spinner" /><p>Loading capital stack...</p></div>
  );

  const seniorFacility = toNum(summary?.senior_debt_facility_limit);
  const reqEquity = toNum(summary?.required_developer_equity);
  const financeCost = toNum(summary?.total_estimated_finance_cost);
  const roe = toNum(summary?.return_on_equity_pct);
  const debtPct = toNum(summary?.debt_percentage);
  const equityPct = toNum(summary?.equity_percentage);
  const totalTrancheAmt = tranches.reduce((s, t) => s + toNum(t.amount), 0);
  const netProfit = toNum(waterfall?.net_profit_after_finance);
  const totalDist = toNum(waterfall?.waterfall.total_distributed);
  const recon = toNum(waterfall?.waterfall.reconciliation_difference);

  const sortedTranches = [...tranches].sort((a, b) => a.priority_order - b.priority_order);

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} /><div><strong>Error:</strong> {errorMessage}</div>
        </div>
      )}
      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} /><div><strong>Success:</strong> Capital stack updated!</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Senior Debt Facility</span><Building size={18} className="kpi-icon text-accent" /></div>
          <div className="kpi-value text-accent">{formatCurrency(seniorFacility)}</div>
          <div className="kpi-subtext">Constrained by {summary?.constraining_factor || 'LTC Limit'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Required Developer Equity</span><Coins size={18} className="kpi-icon text-success" /></div>
          <div className="kpi-value text-success">{formatCurrency(reqEquity)}</div>
          <div className="kpi-subtext">{equityPct.toFixed(1)}% of Total Project Cost</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Estimated Finance Costs</span><DollarSign size={18} className="kpi-icon text-warning" /></div>
          <div className="kpi-value text-warning">{formatCurrency(financeCost)}</div>
          <div className="kpi-subtext">Interest, Line & Establishment Fees</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Return on Equity (ROE)</span><TrendingUp size={18} className="kpi-icon text-accent" /></div>
          <div className="kpi-value">{roe.toFixed(2)}%</div>
          <div className="kpi-subtext">Net Return on Developer Equity</div>
        </div>
      </div>

      {/* Panel 1: Capital Stack Visual */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Capital Stack Structure</h3>
          <p className="card-subtitle">Live distribution from configured funding tranches.</p>
        </div>
        <div className="card-body">
          {tranches.length > 0 && totalTrancheAmt > 0 ? (
            <>
              <div style={{ display: 'flex', height: '32px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px', gap: '2px' }}>
                {sortedTranches.map(t => {
                  const pct = (toNum(t.amount) / totalTrancheAmt) * 100;
                  return (
                    <div key={t.id}
                      style={{ width: `${pct}%`, backgroundColor: TRANCHE_COLORS[t.tranche_type] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.78rem', fontWeight: 600, transition: 'width 0.3s ease', overflow: 'hidden' }}
                      title={`${t.name}: ${formatCurrency(toNum(t.amount))}`}>
                      {pct > 12 ? `${pct.toFixed(0)}%` : ''}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.84rem' }}>
                {sortedTranches.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', backgroundColor: TRANCHE_COLORS[t.tranche_type] || '#6b7280', borderRadius: '3px' }} />
                    <span>{TRANCHE_LABELS[t.tranche_type]}: <strong>{formatCurrency(toNum(t.amount))}</strong></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', height: '28px', width: '100%', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ width: `${debtPct}%`, backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                  {debtPct > 15 ? `Debt (${debtPct.toFixed(1)}%)` : ''}
                </div>
                <div style={{ width: `${equityPct}%`, backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                  {equityPct > 15 ? `Equity (${equityPct.toFixed(1)}%)` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px' }} />Senior Debt: <strong>{formatCurrency(seniorFacility)}</strong></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '3px' }} />Developer Equity: <strong>{formatCurrency(reqEquity)}</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Panel 2: Tranche Management */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Funding Tranches</h3>
            <p className="card-subtitle">Add, configure, and reorder tranches for the waterfall distribution.</p>
          </div>
          <button className="btn btn-primary" onClick={handleAddTranche} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /><span>Add Tranche</span>
          </button>
        </div>
        <div className="card-body">
          {trancheError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} /><span>{trancheError}</span>
            </div>
          )}
          {tranches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <ArrowUpDown size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p>No funding tranches configured. Add a tranche to enable the waterfall engine.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '22%' }}>Name</th>
                    <th style={{ width: '18%' }}>Type</th>
                    <th style={{ width: '16%' }}>Amount ($)</th>
                    <th style={{ width: '12%' }}>Hurdle (%)</th>
                    <th style={{ width: '10%' }}>Investor (%)</th>
                    <th style={{ width: '10%' }}>Promote (%)</th>
                    <th style={{ width: '7%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTranches.map(t => (
                    <tr key={t.id}>
                      <td>
                        <input type="number" className="form-control form-control-sm" value={t.priority_order} min={1} style={{ width: '50px', textAlign: 'center' }}
                          onChange={e => handleUpdateTranche(t, 'priority_order', parseInt(e.target.value) || 1)}
                          onBlur={() => handleSaveTranche(t)} />
                      </td>
                      <td>
                        <input type="text" className="form-control form-control-sm" value={t.name}
                          onChange={e => handleUpdateTranche(t, 'name', e.target.value)}
                          onBlur={() => handleSaveTranche(t)} />
                      </td>
                      <td>
                        <select className="form-control form-control-sm" value={t.tranche_type}
                          onChange={e => {
                            const v = e.target.value as TrancheType;
                            handleUpdateTranche(t, 'tranche_type', v);
                            setTimeout(() => handleSaveTranche({ ...t, tranche_type: v }), 0);
                          }}>
                          {TRANCHE_TYPES.map(tt => <option key={tt} value={tt}>{TRANCHE_LABELS[tt]}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" step="1000" className="form-control form-control-sm" value={t.amount}
                          onChange={e => handleUpdateTranche(t, 'amount', e.target.value)}
                          onBlur={() => handleSaveTranche(t)} />
                      </td>
                      <td>
                        <input type="number" step="0.1" className="form-control form-control-sm" value={t.hurdle_rate_pct}
                          disabled={t.tranche_type !== 'preferred_equity'}
                          onChange={e => handleUpdateTranche(t, 'hurdle_rate_pct', e.target.value)}
                          onBlur={() => handleSaveTranche(t)} />
                      </td>
                      <td>
                        <input type="number" step="1" min={0} max={100} className="form-control form-control-sm" value={t.investor_split_pct}
                          disabled={t.tranche_type !== 'ordinary_equity'}
                          onChange={e => handleUpdateTranche(t, 'investor_split_pct', e.target.value)}
                          onBlur={() => handleSaveTranche(t)} />
                      </td>
                      <td>
                        <input type="number" step="1" min={0} max={100} className="form-control form-control-sm" value={t.developer_promote_pct}
                          disabled={t.tranche_type !== 'ordinary_equity'}
                          onChange={e => handleUpdateTranche(t, 'developer_promote_pct', e.target.value)}
                          onBlur={() => handleSaveTranche(t)} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {savingTranche === t.id
                          ? <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                          : <button className="btn btn-ghost btn-sm text-danger" onClick={() => t.id && handleDeleteTranche(t.id)}><Trash2 size={15} /></button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Waterfall Results */}
      {waterfall && tranches.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Distribution Waterfall</h3>
            <p className="card-subtitle">Tier-by-tier proceeds distribution. Total distributions never exceed available proceeds.</p>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '16px' }}>

              {/* Tier 1 */}
              <div style={{ background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '0.95rem', fontWeight: 700 }}>
                  Tier 1 — Return of Capital
                </h4>
                {waterfall.waterfall.tier1_return_of_capital.map((item, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid #e0f2fe' : 'none' }}>
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>{item.tranche_name}</span>
                    <strong style={{ color: '#0369a1' }}>{formatCurrency(toNum(item.capital_returned))}</strong>
                  </div>
                ))}
              </div>

              {/* Tier 2 */}
              {waterfall.waterfall.tier2_preferred_return.length > 0 && (
                <div style={{ background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '0.95rem', fontWeight: 700 }}>
                    Tier 2 — Preferred Return
                  </h4>
                  {waterfall.waterfall.tier2_preferred_return.map((item, i, arr) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid #fef3c7' : 'none' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#374151' }}>{item.tranche_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Target: {formatCurrency(toNum(item.preferred_return_target))}{toNum(item.shortfall) > 0 ? ` · Shortfall: ${formatCurrency(toNum(item.shortfall))}` : ''}</div>
                      </div>
                      <strong style={{ color: '#92400e' }}>{formatCurrency(toNum(item.preferred_return_paid))}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Tier 3 */}
              {waterfall.waterfall.tier3_residual_split.length > 0 && (
                <div style={{ background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#065f46', fontSize: '0.95rem', fontWeight: 700 }}>
                    Tier 3 — Residual Profit Split
                  </h4>
                  {waterfall.waterfall.tier3_residual_split.map((item, i, arr) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #dcfce7' : 'none' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}>{item.tranche_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Investors ({item.investor_split_pct.toFixed(0)}%)</span>
                        <strong style={{ color: '#065f46' }}>{formatCurrency(toNum(item.investor_distribution))}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Developer Promote ({item.developer_promote_pct.toFixed(0)}%)</span>
                        <strong style={{ color: '#065f46' }}>{formatCurrency(toNum(item.developer_promote_distribution))}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reconciliation */}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'grid', gap: '8px' }}>
                {[
                  { l: 'Total Distributed', v: totalDist, c: '#1e293b' },
                  { l: 'Available Proceeds (Net Profit After Finance)', v: netProfit, c: '#1e293b' },
                  { l: 'Reconciliation Difference', v: recon, c: Math.abs(recon) < 0.01 ? '#059669' : '#dc2626' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{l}</span>
                    <strong style={{ fontSize: '1rem', color: c }}>{formatCurrency(v)}</strong>
                  </div>
                ))}
                {Math.abs(recon) < 0.01 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.82rem', fontWeight: 600 }}>
                    <CheckCircle2 size={14} />
                    <span>Waterfall reconciles exactly — no money created or destroyed.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Senior Debt & Mezzanine Parameters (Phase 1 preserved) */}
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-icon-badge" style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="card-title">Senior Construction Loan</h3>
                  <p className="card-subtitle">Primary bank or private debt facility</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={seniorDebtEnabled} onChange={e => setSeniorDebtEnabled(e.target.checked)} />
                <span>Active</span>
              </label>
            </div>
            <div className="card-body">
              {[
                { l: 'Max LTC (%)', v: seniorMaxLtc, set: setSeniorMaxLtc, note: `Cap: ${formatCurrency(toNum(summary?.senior_ltc_cap))}` },
                { l: 'Max LVR (%)', v: seniorMaxLvr, set: setSeniorMaxLvr, note: `Cap: ${formatCurrency(toNum(summary?.senior_lvr_cap))}` },
                { l: 'Annual Interest Rate (% p.a.)', v: seniorInterestRate, set: setSeniorInterestRate, note: '' },
                { l: 'Line / Facility Fee (% p.a.)', v: seniorLineFee, set: setSeniorLineFee, note: '' },
                { l: 'Establishment Fee (%)', v: seniorEstFee, set: setSeniorEstFee, note: '' },
              ].map(({ l, v, set, note }) => (
                <div key={l} className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">{l}</label>
                  <div className="input-group">
                    <input type="number" step="0.05" min="0" className="form-control" value={v} onChange={e => set(e.target.value)} disabled={!seniorDebtEnabled} />
                    <span className="input-group-addon">%</span>
                  </div>
                  {note && <small className="form-text text-muted">{note}</small>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-icon-badge" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '8px', borderRadius: '8px' }}>
                  <Percent size={20} />
                </div>
                <div>
                  <h3 className="card-title">Mezzanine & Equity Layer</h3>
                  <p className="card-subtitle">Secondary financing and sponsor equity</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={mezzanineEnabled} onChange={e => setMezzanineEnabled(e.target.checked)} />
                <span>Mezzanine</span>
              </label>
            </div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Mezzanine Loan Facility ($)</label>
                <input type="number" step="1000" className="form-control" value={mezzanineAmount} onChange={e => setMezzanineAmount(e.target.value)} disabled={!mezzanineEnabled} />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Mezzanine Interest Rate (% p.a.)</label>
                <div className="input-group">
                  <input type="number" step="0.1" className="form-control" value={mezzanineInterestRate} onChange={e => setMezzanineInterestRate(e.target.value)} disabled={!mezzanineEnabled} />
                  <span className="input-group-addon">%</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Equity Sizing</h4>
                <div className="form-group">
                  <label className="form-label">Calculated Equity Required</label>
                  <input type="text" className="form-control" value={formatCurrency(reqEquity)} disabled style={{ backgroundColor: '#f1f5f9', fontWeight: 600 }} />
                  <small className="form-text text-muted">Total Project Cost minus Total Debt Facility</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Funding structure updates cash flow, returns, and waterfall engine</span>
          </div>
          <div className="save-bar-actions">
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '150px' }}>
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Funding'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
