import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { ScenarioComparisonResponse, ScenarioMetrics } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ScenarioComparisonMatrixProps {
  projectId: string;
  onScenarioSelected?: (scenarioId: string) => void;
  onScenariosChanged?: () => void;
}

export const ScenarioComparisonMatrix: React.FC<ScenarioComparisonMatrixProps> = ({
  projectId,
  onScenarioSelected,
  onScenariosChanged,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ScenarioComparisonResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Sensitivity variables (Percentage shifts)
  const [priceShiftPct, setPriceShiftPct] = useState<number>(0);
  const [costShiftPct, setCostShiftPct] = useState<number>(0);

  const loadComparison = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getScenarioComparison(projectId);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load scenario comparison.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const handleClone = async (scenario: ScenarioMetrics) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.cloneScenario(projectId, scenario.scenario_id, {
        name: `Clone of ${scenario.name}`,
        description: `Duplicated branch from '${scenario.name}' for variation testing.`,
      });
      setActionSuccess(`Successfully cloned "${scenario.name}".`);
      await loadComparison();
      if (onScenariosChanged) onScenariosChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to clone scenario.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetBaseline = async (scenarioId: string) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.updateScenario(scenarioId, { is_baseline: true });
      setActionSuccess('Baseline scenario updated.');
      await loadComparison();
      if (onScenariosChanged) onScenariosChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to set baseline scenario.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (scenario: ScenarioMetrics) => {
    if (scenario.is_baseline) {
      setErrorMessage('Cannot delete the primary baseline scenario. Please set another baseline first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete scenario "${scenario.name}"?`)) {
      return;
    }
    try {
      setActionLoading(true);
      setErrorMessage(null);
      await api.deleteScenario(scenario.scenario_id);
      setActionSuccess(`Deleted scenario "${scenario.name}".`);
      await loadComparison();
      if (onScenariosChanged) onScenariosChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to delete scenario.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Computing scenario comparison matrix across portfolio models...</p>
      </div>
    );
  }

  const scenarios = data?.scenarios || [];

  const getShiftedMetrics = (s: ScenarioMetrics) => {
    const rawGrv = parseFloat(String(s.gross_realisation_value)) || 0;
    const rawCost = parseFloat(String(s.total_project_cost)) || 0;

    const shiftedGrv = rawGrv * (1 + priceShiftPct / 100);
    const shiftedCost = rawCost * (1 + costShiftPct / 100);
    const shiftedProfit = shiftedGrv - shiftedCost;
    const shiftedMargin = shiftedCost > 0 ? (shiftedProfit / shiftedCost) * 100 : 0;

    return {
      grv: shiftedGrv,
      cost: shiftedCost,
      profit: shiftedProfit,
      margin: shiftedMargin,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notifications */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={18} />
          <div>{errorMessage}</div>
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success" role="alert">
          <CheckCircle2 size={18} />
          <div>{actionSuccess}</div>
        </div>
      )}

      {/* Sensitivity Sliders / Quick Controls */}
      <div className="card" style={{ backgroundColor: '#ffffff' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="section-icon-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="card-title">Scenario Sensitivity & Stress Testing</h3>
              <p className="card-subtitle">Stress test sales pricing and construction cost variations across all schemes.</p>
            </div>
          </div>

          {(priceShiftPct !== 0 || costShiftPct !== 0) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setPriceShiftPct(0);
                setCostShiftPct(0);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Reset Stress Test</span>
            </button>
          )}
        </div>

        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 600, marginBottom: '6px' }}>
              <span>Sales Realisation Shift (Price Variance)</span>
              <span style={{ color: priceShiftPct >= 0 ? '#059669' : '#ef4444' }}>
                {priceShiftPct > 0 ? `+${priceShiftPct}%` : `${priceShiftPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="2.5"
              value={priceShiftPct}
              onChange={(e) => setPriceShiftPct(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>-20% (Bear Market)</span>
              <span>0% (Base)</span>
              <span>+20% (Bull Market)</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 600, marginBottom: '6px' }}>
              <span>Development Cost Shift (Inflation / Escalation)</span>
              <span style={{ color: costShiftPct <= 0 ? '#059669' : '#ef4444' }}>
                {costShiftPct > 0 ? `+${costShiftPct}%` : `${costShiftPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="2.5"
              value={costShiftPct}
              onChange={(e) => setCostShiftPct(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>-20% (Savings)</span>
              <span>0% (Base)</span>
              <span>+20% (Cost Blowout)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="section-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px', borderRadius: '8px' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 className="card-title">Side-by-Side Feasibility Comparison Matrix</h3>
              <p className="card-subtitle">Comparative financial returns, development margin, yield and capital requirements.</p>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Key Feasibility Metric</th>
                  {scenarios.map((s) => (
                    <th key={s.scenario_id} style={{ textAlign: 'right', minWidth: '180px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.name}</span>
                        {s.is_baseline ? (
                          <span className="badge badge-baseline" style={{ fontSize: '0.7rem' }}>Primary Baseline</span>
                        ) : (
                          <span className="badge badge-draft" style={{ fontSize: '0.7rem' }}>Alternate Scheme</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 1. Yield & Scope */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={scenarios.length + 1} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    1. Yield, Density & Timeline
                  </td>
                </tr>
                <tr>
                  <td>Total Product Units</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {s.total_units} Units
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Total Net Saleable Area (NSA)</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                      {formatNumber(parseFloat(String(s.total_internal_area)) || 0)} m²
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Project Timeline Duration</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                      {s.duration_months} Months
                    </td>
                  ))}
                </tr>

                {/* 2. Capital Costs */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={scenarios.length + 1} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    2. Capital Costs Breakdown
                  </td>
                </tr>
                <tr>
                  <td>Land Acquisition</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                      {formatCurrency(parseFloat(String(s.land_acquisition_total)) || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Construction & Works</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right' }}>
                      {formatCurrency(parseFloat(String(s.construction_subtotal)) || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Total Development Cost (Ex. Land)</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(parseFloat(String(s.total_development_cost_ex_land)) || 0)}
                    </td>
                  ))}
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Total Project Cost (TPC)</td>
                  {scenarios.map((s) => {
                    const shifted = getShiftedMetrics(s);
                    return (
                      <td key={s.scenario_id} style={{ textAlign: 'right', color: '#1e3a8a' }}>
                        {formatCurrency(shifted.cost)}
                      </td>
                    );
                  })}
                </tr>

                {/* 3. Revenue & Profit */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={scenarios.length + 1} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    3. Realisation & Financial Returns
                  </td>
                </tr>
                <tr>
                  <td>Gross Realisation Value (GRV)</td>
                  {scenarios.map((s) => {
                    const shifted = getShiftedMetrics(s);
                    return (
                      <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        {formatCurrency(shifted.grv)}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                  <td>Net Development Profit ($)</td>
                  {scenarios.map((s) => {
                    const shifted = getShiftedMetrics(s);
                    const isPositive = shifted.profit >= 0;
                    return (
                      <td
                        key={s.scenario_id}
                        style={{
                          textAlign: 'right',
                          color: isPositive ? '#047857' : '#b91c1c',
                          fontSize: '1rem',
                        }}
                      >
                        {formatCurrency(shifted.profit)}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Development Margin on Cost (%)</td>
                  {scenarios.map((s) => {
                    const shifted = getShiftedMetrics(s);
                    return (
                      <td key={s.scenario_id} style={{ textAlign: 'right', color: 'var(--brand-accent)' }}>
                        {shifted.margin.toFixed(2)}%
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td>Project IRR (% p.a.)</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {s.project_irr.toFixed(2)}%
                    </td>
                  ))}
                </tr>

                {/* 4. Funding & Capital Stack */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={scenarios.length + 1} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    4. Capital Stack & Peak Exposure
                  </td>
                </tr>
                <tr>
                  <td>Peak Debt Requirement</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right', color: '#d97706' }}>
                      {formatCurrency(s.peak_debt)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Required Developer Equity</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(parseFloat(String(s.required_developer_equity)) || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Return on Equity (ROE %)</td>
                  {scenarios.map((s) => (
                    <td key={s.scenario_id} style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {(parseFloat(String(s.return_on_equity_pct)) || 0).toFixed(2)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scenario Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {scenarios.map((s) => (
          <div key={s.scenario_id} className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{s.name}</h4>
                <div style={{ marginTop: '4px' }}>
                  {s.is_baseline ? (
                    <span className="badge badge-baseline">Primary Baseline</span>
                  ) : (
                    <span className="badge badge-draft">Alternate Scheme</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Net Profit:</span>
                  <div style={{ fontWeight: 700, color: '#047857' }}>
                    {formatCurrency(parseFloat(String(s.net_profit)) || 0)}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Margin on Cost:</span>
                  <div style={{ fontWeight: 700, color: 'var(--brand-accent)' }}>
                    {(parseFloat(String(s.margin_on_cost_pct)) || 0).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Units:</span>
                  <div style={{ fontWeight: 600 }}>{s.total_units} Units</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Project IRR:</span>
                  <div style={{ fontWeight: 600 }}>{s.project_irr.toFixed(2)}%</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {onScenarioSelected && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onScenarioSelected(s.scenario_id)}
                  >
                    <span>Open in Workspace</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  title="Clone / Duplicate Scenario"
                  disabled={actionLoading}
                  onClick={() => handleClone(s)}
                >
                  <Copy size={14} />
                  <span>Clone</span>
                </button>

                {!s.is_baseline && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Set as Primary Baseline"
                      disabled={actionLoading}
                      onClick={() => handleSetBaseline(s.scenario_id)}
                    >
                      <span>Set Baseline</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm text-danger"
                      title="Delete Scenario Branch"
                      disabled={actionLoading}
                      onClick={() => handleDelete(s)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
