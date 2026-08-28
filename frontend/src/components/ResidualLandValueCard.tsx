import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { FullFeasibilityResponse, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface ResidualLandValueCardProps {
  projectId: string;
  scenario: Scenario;
}

export const ResidualLandValueCard: React.FC<ResidualLandValueCardProps> = ({
  projectId,
  scenario,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<FullFeasibilityResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFeasibility = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getFullFeasibility(projectId, scenario.id);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load valuation & residual return analysis.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadFeasibility();
  }, [loadFeasibility]);

  if (loading && !data) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
          Computing Residual Land Value (RLV) & financial metrics...
        </p>
      </div>
    );
  }

  if (!data) return null;

  const rlv = parseFloat(String(data.valuation_rlv.residual_land_value_cost_target)) || 0;
  const currentLand = parseFloat(String(data.metrics.land_acquisition_total)) || 0;
  const npv = data.metrics.net_present_value || 0;
  const wacc = parseFloat(String(data.wacc_pct)) || 0;
  const gstPayable = parseFloat(String(data.gst.gst_payable)) || 0;

  return (
    <div className="card" style={{ marginTop: '24px', backgroundColor: '#ffffff' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="section-icon-badge" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669', padding: '8px', borderRadius: '8px' }}>
            <Landmark size={20} />
          </div>
          <div>
            <h3 className="card-title">Valuation & Residual Land Value (RLV) Engine</h3>
            <p className="card-subtitle">Bank-grade residual land purchase power, NPV, and tax liability analysis.</p>
          </div>
        </div>
        <span className="badge badge-baseline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} />
          <span>Phase 1 Core Engine</span>
        </span>
      </div>

      <div className="card-body">
        {errorMessage && (
          <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4 KPI Quick Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Supportable Land Value (at 20% Margin)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {formatCurrency(rlv)}
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Max purchase price for hurdle target
            </small>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Net Present Value (NPV @ 10%)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: npv >= 0 ? '#047857' : '#b91c1c', marginTop: '4px' }}>
              {formatCurrency(npv)}
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Discounted project cash flows
            </small>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Weighted Cost of Capital (WACC)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
              {wacc.toFixed(2)}%
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Blended debt & equity cost
            </small>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              GST (Margin Scheme)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
              {formatCurrency(gstPayable)}
            </div>
            <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Liability on realization margin
            </small>
          </div>
        </div>

        {/* Residual Land Value Sensitivity Ladder */}
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '10px' }}>
            Residual Land Purchase Price Hurdle Ladder
          </h4>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Target Development Margin on Cost (%)</th>
                  <th style={{ textAlign: 'right' }}>Max Land Purchase Price ($)</th>
                  <th style={{ textAlign: 'right' }}>Max Total Land Acquisition ($)</th>
                  <th style={{ textAlign: 'right' }}>Price Variance vs Current Land</th>
                </tr>
              </thead>
              <tbody>
                {data.valuation_rlv.margin_sensitivity.map((item, idx) => {
                  const maxPrice = parseFloat(String(item.max_land_purchase_price)) || 0;
                  const maxTotal = parseFloat(String(item.max_total_land_acquisition)) || 0;
                  const variance = maxPrice - currentLand;
                  const isFavorable = variance >= 0;

                  return (
                    <tr key={idx} style={{ backgroundColor: item.target_margin_pct === 20.0 ? '#ecfdf5' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>
                        {item.target_margin_pct.toFixed(1)}% Target Return
                        {item.target_margin_pct === 20.0 && (
                          <span className="badge badge-baseline" style={{ marginLeft: '8px' }}>Standard Hurdle</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {formatCurrency(maxPrice)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(maxTotal)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: isFavorable ? '#047857' : '#dc2626' }}>
                        {variance > 0 ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
