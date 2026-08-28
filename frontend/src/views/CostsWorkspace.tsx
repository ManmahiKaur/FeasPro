import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HardHat,
  TrendingUp,
  Layers,
  Sparkles,
  PieChart as PieIcon,
} from 'lucide-react';
import { CostItem, CostCalculationSummary, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';

interface CostsWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onCostsUpdated?: (summary: CostCalculationSummary) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'construction', label: 'Construction & Works', color: '#2563eb' },
  { value: 'consultants', label: 'Professional & Design Fees', color: '#0891b2' },
  { value: 'statutory', label: 'Statutory & Council Levies', color: '#d97706' },
  { value: 'contingency', label: 'Contingency & Buffers', color: '#7c3aed' },
  { value: 'holding', label: 'Holding & Operating Costs', color: '#4b5563' },
  { value: 'other', label: 'Other Development Costs', color: '#6b7280' },
];

const PHASING_OPTIONS = [
  { value: 's_curve', label: 'S-Curve (Bell)' },
  { value: 'linear', label: 'Linear / Even' },
  { value: 'upfront', label: 'Upfront (Start)' },
  { value: 'end', label: 'End / Completion' },
];

export const CostsWorkspace: React.FC<CostsWorkspaceProps> = ({
  projectId,
  scenario,
  onCostsUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<CostItem[]>([]);
  const [summary, setSummary] = useState<CostCalculationSummary | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const loadCostsData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getCosts(projectId, scenario.id);
      setItems(res.items);
      setSummary(res.summary);
      if (onCostsUpdated) onCostsUpdated(res.summary);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load development costs.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, onCostsUpdated]);

  useEffect(() => {
    loadCostsData();
  }, [loadCostsData]);

  // Reactive client calculations for live preview
  const clientConstruction = items
    .filter((i) => i.category === 'construction')
    .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);

  const clientConsultants = items
    .filter((i) => i.category === 'consultants')
    .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);

  const clientTdcExLand = items.reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);
  const landTotal = summary ? parseFloat(String(summary.land_acquisition_total)) || 0 : 0;
  const clientTotalProjectCost = landTotal + clientTdcExLand;

  const handleAddItem = (presetCategory: string = 'construction') => {
    const newItem: CostItem = {
      category: presetCategory,
      name: `New ${presetCategory.charAt(0).toUpperCase() + presetCategory.slice(1)} Item`,
      calculation_method: 'fixed_amount',
      amount: '50000',
      phasing_curve: presetCategory === 'construction' ? 's_curve' : 'linear',
      start_month: presetCategory === 'construction' ? 4 : 1,
      end_month: presetCategory === 'construction' ? 16 : 12,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof CostItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: CostItem[] = items.map((i) => ({
        category: i.category,
        name: i.name.trim() || 'Cost Line',
        calculation_method: i.calculation_method || 'fixed_amount',
        quantity: i.quantity ? parseFloat(String(i.quantity)) : null,
        rate: i.rate ? parseFloat(String(i.rate)) : null,
        amount: parseFloat(String(i.amount)) || 0,
        phasing_curve: i.phasing_curve || 'linear',
        start_month: parseInt(String(i.start_month)) || 1,
        end_month: parseInt(String(i.end_month)) || 12,
        notes: i.notes?.trim() || null,
      }));

      const res = await api.updateCostsBatch(projectId, scenario.id, payload);
      setItems(res.items);
      setSummary(res.summary);
      setSaveSuccess(true);
      if (onCostsUpdated) onCostsUpdated(res.summary);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save cost changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter((i) => i.category === filterCategory);

  if (loading) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading scenario cost schedule...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Top Notification Bar */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving costs:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Cost schedule and totals updated successfully!
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Dev Cost (Ex. Land)</span>
            <HardHat size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatCurrency(clientTdcExLand)}</div>
          <div className="kpi-subtext">Total Construction & Soft Costs</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Construction Works</span>
            <Layers size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(clientConstruction)}</div>
          <div className="kpi-subtext">
            {clientTdcExLand > 0
              ? `${((clientConstruction / clientTdcExLand) * 100).toFixed(1)}% of Dev Costs`
              : 'Direct build contract'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Consultants & Design</span>
            <TrendingUp size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatCurrency(clientConsultants)}</div>
          <div className="kpi-subtext">Architecture, Engineering & PM</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Project Cost</span>
            <PieIcon size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(clientTotalProjectCost)}</div>
          <div className="kpi-subtext">Incl. {formatCurrency(landTotal)} Land</div>
        </div>
      </div>

      {/* Main Form Content */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="section-icon-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
                <HardHat size={20} />
              </div>
              <div>
                <h3 className="card-title">Development Cost Breakdown</h3>
                <p className="card-subtitle">Manage construction contracts, professional consultant fees, statutory levies, and contingencies.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleAddItem('construction')}
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                <Plus size={16} />
                <span>Add Cost Line</span>
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                className={`btn btn-sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterCategory('all')}
                style={{ borderRadius: '20px' }}
              >
                All Costs ({items.length})
              </button>
              {CATEGORY_OPTIONS.map((cat) => {
                const count = items.filter((i) => i.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    className={`btn btn-sm ${filterCategory === cat.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFilterCategory(cat.value)}
                    style={{ borderRadius: '20px' }}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Category</th>
                    <th style={{ width: '24%' }}>Cost Description</th>
                    <th style={{ width: '15%' }}>Phasing Curve</th>
                    <th style={{ width: '14%' }}>Timing (Months)</th>
                    <th style={{ width: '12%' }}>Amount</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>GST</th>
                    <th style={{ width: '11%', textAlign: 'right' }}>Total ($)</th>
                    <th style={{ width: '6%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No cost items found in this category. Click <strong>"Add Cost Line"</strong> to insert a new line.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const realIndex = items.indexOf(item);
                      return (
                        <tr key={realIndex}>
                          <td>
                            <select
                              className="form-control form-control-sm"
                              value={item.category}
                              onChange={(e) => handleUpdateItem(realIndex, 'category', e.target.value)}
                            >
                              {CATEGORY_OPTIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.name}
                              placeholder="e.g. Structural Works"
                              onChange={(e) => handleUpdateItem(realIndex, 'name', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="form-control form-control-sm"
                              value={item.phasing_curve}
                              onChange={(e) => handleUpdateItem(realIndex, 'phasing_curve', e.target.value)}
                            >
                              {PHASING_OPTIONS.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                min={1}
                                max={60}
                                className="form-control form-control-sm"
                                style={{ width: '50px', textAlign: 'center' }}
                                value={item.start_month}
                                title="Start Month"
                                onChange={(e) => handleUpdateItem(realIndex, 'start_month', parseInt(e.target.value) || 1)}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                              <input
                                type="number"
                                min={item.start_month}
                                max={60}
                                className="form-control form-control-sm"
                                style={{ width: '50px', textAlign: 'center' }}
                                value={item.end_month}
                                title="End Month"
                                onChange={(e) => handleUpdateItem(realIndex, 'end_month', parseInt(e.target.value) || item.start_month)}
                              />
                            </div>
                          </td>
                          <td>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={item.amount}
                                onChange={(e) => handleUpdateItem(realIndex, 'amount', e.target.value)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={item.gst_applicable !== false}
                              onChange={(e) => handleUpdateItem(realIndex, 'gst_applicable', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(parseFloat(String(item.amount)) || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-btn text-danger"
                              title="Delete Cost Item"
                              onClick={() => handleRemoveItem(realIndex)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* GST ITC Summary */}
            <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>GST Input Tax Credits (ITCs)</h4>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Total GST claimable on applicable development costs.</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857' }}>
                {formatCurrency(summary?.total_input_tax_credits || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Floating / Sticky Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Changes affect live Cash Flow S-curves and return metrics</span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '150px' }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Costs'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
