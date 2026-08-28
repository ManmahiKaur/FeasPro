import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  Download,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { CashFlowSummary, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface CashFlowWorkspaceProps {
  projectId: string;
  scenario: Scenario;
}

export const CashFlowWorkspace: React.FC<CashFlowWorkspaceProps> = ({
  projectId,
  scenario,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowSummary | null>(null);
  const [durationMonths, setDurationMonths] = useState<number>(24);

  const loadCashFlow = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getCashFlow(projectId, scenario.id, durationMonths);
      setCashFlowData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to generate cash flow schedule.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, durationMonths]);

  useEffect(() => {
    loadCashFlow();
  }, [loadCashFlow]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (!cashFlowData || !cashFlowData.monthly_data.length) return;

    const headers = [
      'Month',
      'Period',
      'Land Outflow ($)',
      'Construction Outflow ($)',
      'Consultants Outflow ($)',
      'Statutory & Holding ($)',
      'Total Outflow ($)',
      'Revenue Inflow ($)',
      'Net Cash Flow ($)',
      'Cumulative Cash Flow ($)',
    ];

    const rows = cashFlowData.monthly_data.map((m) => [
      m.month,
      m.period_label,
      m.land_cost || 0,
      m.construction_cost || 0,
      m.consultant_cost || 0,
      m.statutory_holding_cost || 0,
      m.total_outflow || 0,
      m.revenue || 0,
      m.net_cashflow || 0,
      m.cumulative_cashflow || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `feaspro_cashflow_${scenario.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !cashFlowData) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Computing deterministic monthly S-curves & feasibility cash flows...</p>
      </div>
    );
  }

  const netProfit = cashFlowData?.net_profit || 0;
  const totalCosts = cashFlowData?.total_costs || 0;
  const totalRevenue = cashFlowData?.total_revenue || 0;
  const marginOnCost = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;
  const peakDebt = cashFlowData?.peak_debt || 0;
  const projectIrr = cashFlowData?.project_irr || 0;
  const monthlyData = cashFlowData?.monthly_data || [];

  // SVG Chart calculation parameters
  const maxMonthlyVal = Math.max(
    ...monthlyData.map((d) => Math.max(d.total_outflow || 0, d.revenue || 0)),
    100000
  );
  const minCumulative = Math.min(...monthlyData.map((d) => d.cumulative_cashflow || 0), 0);
  const maxCumulative = Math.max(...monthlyData.map((d) => d.cumulative_cashflow || 0), 100000);
  const cumulativeRange = Math.max(1, maxCumulative - minCumulative);

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Net Development Profit</span>
            <DollarSign size={18} className="kpi-icon text-success" />
          </div>
          <div className={`kpi-value ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="kpi-subtext">
            {marginOnCost.toFixed(2)}% Development Margin on Cost
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Project IRR (Annualized)</span>
            <TrendingUp size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{projectIrr.toFixed(2)}% p.a.</div>
          <div className="kpi-subtext">Calculated on Monthly Discount Dates</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Peak Funding / Debt</span>
            <ShieldAlert size={18} className="kpi-icon text-warning" />
          </div>
          <div className="kpi-value text-warning">{formatCurrency(peakDebt)}</div>
          <div className="kpi-subtext">Maximum Capital Exposure</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Project Revenue</span>
            <Activity size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
          <div className="kpi-subtext">vs {formatCurrency(totalCosts)} Total Outflow</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="section-icon-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="card-title">Cash Flow & S-Curve Distribution</h3>
              <p className="card-subtitle">Monthly construction drawdowns, buyer deposit phasing, and cumulative cash trajectory.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Calendar size={16} className="text-muted" />
              <span>Duration:</span>
              <select
                className="form-control form-control-sm"
                style={{ width: '110px' }}
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 24)}
              >
                <option value={18}>18 Months</option>
                <option value={24}>24 Months</option>
                <option value={30}>30 Months</option>
                <option value={36}>36 Months</option>
                <option value={48}>48 Months</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* Visual Legend */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>Monthly Outflows (Costs)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>Monthly Inflows (Sales)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#2563eb', display: 'inline-block' }}></span>
              <span>Cumulative Net Cash Position (S-Curve)</span>
            </div>
          </div>

          {/* Dynamic SVG Visualizer */}
          <div style={{ width: '100%', height: '220px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', position: 'relative', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 180" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              {/* Zero reference line for cumulative cash */}
              <line
                x1="0"
                y1={180 - ((0 - minCumulative) / cumulativeRange) * 160 - 10}
                x2="800"
                y2={180 - ((0 - minCumulative) / cumulativeRange) * 160 - 10}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Monthly Bar Charts */}
              {monthlyData.map((d, i) => {
                const totalBars = monthlyData.length;
                const barWidth = Math.max(8, Math.min(22, 650 / totalBars));
                const x = (i / totalBars) * 760 + 20;

                const outflowH = maxMonthlyVal > 0 ? ((d.total_outflow || 0) / maxMonthlyVal) * 80 : 0;
                const inflowH = maxMonthlyVal > 0 ? ((d.revenue || 0) / maxMonthlyVal) * 80 : 0;

                return (
                  <g key={i}>
                    {/* Outflow bar */}
                    {outflowH > 0 && (
                      <rect
                        x={x}
                        y={170 - outflowH}
                        width={barWidth / 2}
                        height={outflowH}
                        fill="#ef4444"
                        opacity="0.85"
                        rx="2"
                      >
                        <title>{`Month ${d.month} Outflow: ${formatCurrency(d.total_outflow || 0)}`}</title>
                      </rect>
                    )}
                    {/* Inflow bar */}
                    {inflowH > 0 && (
                      <rect
                        x={x + barWidth / 2}
                        y={170 - inflowH}
                        width={barWidth / 2}
                        height={inflowH}
                        fill="#10b981"
                        opacity="0.85"
                        rx="2"
                      >
                        <title>{`Month ${d.month} Inflow: ${formatCurrency(d.revenue || 0)}`}</title>
                      </rect>
                    )}
                  </g>
                );
              })}

              {/* Cumulative Line Path */}
              {monthlyData.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={monthlyData
                    .map((d, i) => {
                      const totalBars = monthlyData.length;
                      const x = (i / totalBars) * 760 + 25;
                      const y = 180 - (((d.cumulative_cashflow || 0) - minCumulative) / cumulativeRange) * 160 - 10;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Cash Flow Detailed Matrix Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="section-icon-badge" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', padding: '8px', borderRadius: '8px' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 className="card-title">Monthly Cash Flow Schedule</h3>
              <p className="card-subtitle">Detailed line-by-line deterministic monthly projection.</p>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ width: '10%' }}>Period</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Land ($)</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Construction ($)</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Consultants ($)</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Statutory/Hold ($)</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Total Outflow ($)</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Revenue Inflow ($)</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Cumulative Position ($)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr key={row.month}>
                    <td style={{ fontWeight: 600 }}>{row.period_label}</td>
                    <td style={{ textAlign: 'right', color: row.land_cost ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {formatCurrency(row.land_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: row.construction_cost ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {formatCurrency(row.construction_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: row.consultant_cost ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {formatCurrency(row.consultant_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: row.statutory_holding_cost ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {formatCurrency(row.statutory_holding_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                      {formatCurrency(row.total_outflow || 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      {formatCurrency(row.revenue || 0)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: (row.cumulative_cashflow || 0) >= 0 ? '#10b981' : '#2563eb',
                      }}
                    >
                      {formatCurrency(row.cumulative_cashflow || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, backgroundColor: 'var(--bg-subtle)', position: 'sticky', bottom: 0, zIndex: 2 }}>
                  <td style={{ padding: '14px 16px' }}>Project Totals</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(monthlyData.reduce((a, b) => a + (b.land_cost || 0), 0))}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(monthlyData.reduce((a, b) => a + (b.construction_cost || 0), 0))}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(monthlyData.reduce((a, b) => a + (b.consultant_cost || 0), 0))}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(monthlyData.reduce((a, b) => a + (b.statutory_holding_cost || 0), 0))}
                  </td>
                  <td style={{ textAlign: 'right', color: '#ef4444', fontSize: '1rem' }}>
                    {formatCurrency(totalCosts)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#10b981', fontSize: '1rem' }}>
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: netProfit >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '1.05rem',
                    }}
                  >
                    {formatCurrency(netProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
