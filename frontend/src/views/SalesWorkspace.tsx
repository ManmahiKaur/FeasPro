import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Building,
  Home,
  Tag,
  Sparkles,
} from 'lucide-react';
import { SalesProductItem, SalesCalculationSummary, Scenario } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface SalesWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onSalesUpdated?: (summary: SalesCalculationSummary) => void;
}

const UNIT_TYPE_OPTIONS = [
  { value: 'residential_1bed', label: '1-Bed Apartment' },
  { value: 'residential_2bed', label: '2-Bed Apartment' },
  { value: 'residential_3bed', label: '3-Bed Apartment' },
  { value: 'penthouse', label: 'Penthouse Residence' },
  { value: 'townhouse', label: 'Townhouse / Villa' },
  { value: 'commercial_retail', label: 'Ground Floor Retail / Commercial' },
  { value: 'land_lot', label: 'Subdivided Land Lot' },
];

export const SalesWorkspace: React.FC<SalesWorkspaceProps> = ({
  projectId,
  scenario,
  onSalesUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [items, setItems] = useState<SalesProductItem[]>([]);

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getSales(projectId, scenario.id);
      setItems(res.items);
      if (onSalesUpdated) onSalesUpdated(res.summary);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load sales and revenue assumptions.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id, onSalesUpdated]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  // Reactive calculations for live client preview
  const clientTotalUnits = items.reduce((acc, i) => acc + (parseInt(String(i.total_units)) || 0), 0);
  const clientTotalArea = items.reduce(
    (acc, i) => acc + (parseFloat(String(i.avg_internal_area)) || 0) * (parseInt(String(i.total_units)) || 0),
    0
  );
  const clientGrv = items.reduce(
    (acc, i) => acc + (parseFloat(String(i.unit_sale_price)) || 0) * (parseInt(String(i.total_units)) || 0),
    0
  );
  const clientSellingCosts = items.reduce((acc, i) => {
    const lineRev = (parseFloat(String(i.unit_sale_price)) || 0) * (parseInt(String(i.total_units)) || 0);
    const commPct = (parseFloat(String(i.sales_commission_pct)) || 2.0) / 100.0;
    const mktgPct = (parseFloat(String(i.marketing_cost_pct)) || 1.5) / 100.0;
    return acc + lineRev * (commPct + mktgPct);
  }, 0);
  const clientNrv = clientGrv - clientSellingCosts;
  const avgRateSqm = clientTotalArea > 0 ? clientGrv / clientTotalArea : 0;

  const handleAddItem = () => {
    const newItem: SalesProductItem = {
      name: '2-Bedroom Luxury Suite',
      unit_type: 'residential_2bed',
      total_units: 4,
      avg_internal_area: '78',
      avg_external_area: '12',
      price_per_sqm: '11000',
      unit_sale_price: '858000',
      total_revenue: '3432000',
      sales_commission_pct: '2.00',
      marketing_cost_pct: '1.50',
      gst_applicable: true,
      sales_start_month: 3,
      sales_end_month: 12,
      settlement_month: 18,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof SalesProductItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // Auto calculate unit sale price if area or rate per sqm changed
    if (field === 'avg_internal_area' || field === 'price_per_sqm') {
      const area = parseFloat(String(field === 'avg_internal_area' ? value : current.avg_internal_area)) || 0;
      const rate = parseFloat(String(field === 'price_per_sqm' ? value : current.price_per_sqm)) || 0;
      if (rate > 0 && area > 0) {
        current.unit_sale_price = (rate * area).toString();
      }
    }

    // Auto calculate price per sqm if unit sale price changed
    if (field === 'unit_sale_price') {
      const price = parseFloat(String(value)) || 0;
      const area = parseFloat(String(current.avg_internal_area)) || 0;
      if (area > 0 && price > 0) {
        current.price_per_sqm = Math.round(price / area).toString();
      }
    }

    const units = parseInt(String(current.total_units)) || 1;
    const price = parseFloat(String(current.unit_sale_price)) || 0;
    current.total_revenue = (price * units).toString();

    updated[index] = current;
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
      const payload: SalesProductItem[] = items.map((i) => ({
        name: i.name.trim() || 'Product Type',
        unit_type: i.unit_type || 'residential_2bed',
        total_units: parseInt(String(i.total_units)) || 1,
        avg_internal_area: parseFloat(String(i.avg_internal_area)) || 0,
        avg_external_area: parseFloat(String(i.avg_external_area)) || 0,
        price_per_sqm: parseFloat(String(i.price_per_sqm)) || 0,
        unit_sale_price: parseFloat(String(i.unit_sale_price)) || 0,
        total_revenue:
          (parseFloat(String(i.unit_sale_price)) || 0) * (parseInt(String(i.total_units)) || 1),
        sales_commission_pct: parseFloat(String(i.sales_commission_pct)) || 2.0,
        marketing_cost_pct: parseFloat(String(i.marketing_cost_pct)) || 1.5,
        gst_applicable: i.gst_applicable ?? true,
        sales_start_month: parseInt(String(i.sales_start_month)) || 1,
        sales_end_month: parseInt(String(i.sales_end_month)) || 12,
        settlement_month: parseInt(String(i.settlement_month)) || 18,
        notes: i.notes?.trim() || null,
      }));

      const res = await api.updateSalesBatch(projectId, scenario.id, payload);
      setItems(res.items);
      setSaveSuccess(true);
      if (onSalesUpdated) onSalesUpdated(res.summary);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save sales products.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading sales and revenue schedule...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Notifications */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving sales:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Sales unit mix, GRV, and selling fees updated successfully!
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Gross Realisation (GRV)</span>
            <DollarSign size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">{formatCurrency(clientGrv)}</div>
          <div className="kpi-subtext">Total Gross Sales Across All Units</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Product Mix</span>
            <Building size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{clientTotalUnits} Units</div>
          <div className="kpi-subtext">
            {formatNumber(clientTotalArea)} m² Total NSA (@ {formatCurrency(avgRateSqm)}/m²)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Selling & Marketing</span>
            <Tag size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value text-warning">{formatCurrency(clientSellingCosts)}</div>
          <div className="kpi-subtext">Commissions & Marketing Fees</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Net Realisation (NRV)</span>
            <TrendingUp size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{formatCurrency(clientNrv)}</div>
          <div className="kpi-subtext">Net Revenue Inflow to Project</div>
        </div>
      </div>

      {/* Main Table Card */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="section-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px', borderRadius: '8px' }}>
                <Home size={20} />
              </div>
              <div>
                <h3 className="card-title">Product Mix & Pricing Schedule</h3>
                <p className="card-subtitle">Define unit types, internal/external areas, price points, agent commissions, and settlement milestones.</p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddItem}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <Plus size={16} />
              <span>Add Product Type</span>
            </button>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Product Name & Type</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Units</th>
                    <th style={{ width: '12%' }}>Area (m² Int/Ext)</th>
                    <th style={{ width: '13%' }}>Rate ($/m²)</th>
                    <th style={{ width: '15%' }}>Unit Price ($)</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Total GRV ($)</th>
                    <th style={{ width: '12%' }}>Timing (Months)</th>
                    <th style={{ width: '6%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No product lines configured. Click <strong>"Add Product Type"</strong> to start building the sales mix.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const lineUnits = parseInt(String(item.total_units)) || 1;
                      const linePrice = parseFloat(String(item.unit_sale_price)) || 0;
                      const lineRev = lineUnits * linePrice;

                      return (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.name}
                              placeholder="e.g. 2-Bed Residence"
                              style={{ marginBottom: '4px', fontWeight: 600 }}
                              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            />
                            <select
                              className="form-control form-control-sm"
                              style={{ fontSize: '0.78rem' }}
                              value={item.unit_type}
                              onChange={(e) => handleUpdateItem(index, 'unit_type', e.target.value)}
                            >
                              {UNIT_TYPE_OPTIONS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={1}
                              max={5000}
                              className="form-control form-control-sm"
                              style={{ textAlign: 'center', fontWeight: 600 }}
                              value={item.total_units}
                              onChange={(e) => handleUpdateItem(index, 'total_units', e.target.value)}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                step="any"
                                className="form-control form-control-sm"
                                placeholder="Int"
                                title="Internal Area (m²)"
                                value={item.avg_internal_area}
                                onChange={(e) => handleUpdateItem(index, 'avg_internal_area', e.target.value)}
                              />
                              <span style={{ color: 'var(--text-muted)' }}>+</span>
                              <input
                                type="number"
                                step="any"
                                className="form-control form-control-sm"
                                placeholder="Ext"
                                title="External Area (m²)"
                                value={item.avg_external_area}
                                onChange={(e) => handleUpdateItem(index, 'avg_external_area', e.target.value)}
                              />
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control form-control-sm"
                              placeholder="$/m²"
                              value={item.price_per_sqm || ''}
                              onChange={(e) => handleUpdateItem(index, 'price_per_sqm', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control form-control-sm"
                              style={{ fontWeight: 600 }}
                              value={item.unit_sale_price}
                              onChange={(e) => handleUpdateItem(index, 'unit_sale_price', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(lineRev)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                              <span title="Sales campaign start to end">M{item.sales_start_month}-M{item.sales_end_month}</span>
                              <span style={{ color: 'var(--text-muted)' }}>→</span>
                              <span title="Settlement month" style={{ fontWeight: 600, color: 'var(--brand-accent)' }}>
                                S:M{item.settlement_month}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-btn text-danger"
                              title="Delete Product"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, backgroundColor: 'var(--bg-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>Totals ({clientTotalUnits} Units)</td>
                    <td style={{ textAlign: 'center' }}>{clientTotalUnits}</td>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '14px 16px' }}>
                      Gross Realisation Value (GRV):
                    </td>
                    <td style={{ textAlign: 'right', padding: '14px 16px', color: '#10b981', fontSize: '1.05rem' }}>
                      {formatCurrency(clientGrv)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Sales revenue updates cash flows, IRR, and development margin</span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '150px' }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Sales Plan'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
