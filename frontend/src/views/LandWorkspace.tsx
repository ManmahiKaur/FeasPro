import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Coins,
  MapPin,
  FileText,
  DollarSign,
  Layers,
} from 'lucide-react';
import { LandInput, Scenario, AcquisitionCostItem } from '../types';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface LandWorkspaceProps {
  projectId: string;
  scenario: Scenario;
  onLandUpdated?: (land: LandInput) => void;
}

interface CostRow {
  id?: string;
  category: string;
  name: string;
  amount: string;
  notes: string;
  date: string;
}

const CATEGORY_OPTIONS = [
  { value: 'stamp_duty', label: 'Stamp / Transfer Duty' },
  { value: 'legal_fees', label: 'Legal & Conveyancing' },
  { value: 'due_diligence', label: 'Due Diligence & Site Tests' },
  { value: 'valuation_fees', label: 'Valuation Fees' },
  { value: 'agent_fees', label: 'Buyer’s Agent / Acquisition' },
  { value: 'other', label: 'Other Acquisition Cost' },
];

export const LandWorkspace: React.FC<LandWorkspaceProps> = ({
  projectId,
  scenario,
  onLandUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form States
  const [purchasePrice, setPurchasePrice] = useState<string>('0');
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [contractDate, setContractDate] = useState<string>('');
  const [depositDueDate, setDepositDueDate] = useState<string>('');
  const [settlementDate, setSettlementDate] = useState<string>('');

  const [siteArea, setSiteArea] = useState<string>('');
  const [siteAreaUnit, setSiteAreaUnit] = useState<string>('m²');
  const [currentZoning, setCurrentZoning] = useState<string>('');
  const [existingImprovements, setExistingImprovements] = useState<string>('');
  const [planningNotes, setPlanningNotes] = useState<string>('');
  const [devPotentialNotes, setDevPotentialNotes] = useState<string>('');

  const [costRows, setCostRows] = useState<CostRow[]>([]);

  // Load Land Data for Current Scenario
  const loadLandData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const land = await api.getLand(projectId, scenario.id);

      setPurchasePrice(String(land.purchase_price ?? 0));
      setDepositAmount(String(land.deposit_amount ?? 0));
      setContractDate(land.contract_date || '');
      setDepositDueDate(land.deposit_due_date || '');
      setSettlementDate(land.settlement_date || '');

      setSiteArea(land.site_area ? String(land.site_area) : '');
      setSiteAreaUnit(land.site_area_unit || 'm²');
      setCurrentZoning(land.current_zoning || '');
      setExistingImprovements(land.existing_improvements || '');
      setPlanningNotes(land.planning_notes || '');
      setDevPotentialNotes(land.development_potential_notes || '');

      setCostRows(
        land.acquisition_costs.map((c: AcquisitionCostItem) => ({
          id: c.id,
          category: c.category || 'other',
          name: c.name || '',
          amount: String(c.amount ?? 0),
          notes: c.notes || '',
          date: c.date || '',
        }))
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load land assumptions.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadLandData();
  }, [loadLandData]);

  // Client Subtotal Calculations for live reactive preview
  const numPurchasePrice = parseFloat(purchasePrice) || 0;
  const numDepositAmount = parseFloat(depositAmount) || 0;
  const totalAcquisitionCosts = costRows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const totalLandAcquisition = numPurchasePrice + totalAcquisitionCosts;
  const remainingPurchaseAmount = Math.max(0, numPurchasePrice - numDepositAmount);

  // Handle adding a cost row
  const handleAddCostRow = () => {
    setCostRows([
      ...costRows,
      {
        category: 'other',
        name: 'New Acquisition Cost',
        amount: '0',
        notes: '',
        date: '',
      },
    ]);
  };

  // Handle updating a cost row
  const handleUpdateCostRow = (index: number, field: keyof CostRow, value: string) => {
    const updated = [...costRows];
    updated[index] = { ...updated[index], [field]: value };
    setCostRows(updated);
  };

  // Handle removing a cost row
  const handleRemoveCostRow = (index: number) => {
    const updated = costRows.filter((_, i) => i !== index);
    setCostRows(updated);
  };

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (numPurchasePrice < 0) {
      setErrorMessage('Purchase price cannot be negative.');
      return;
    }
    if (numDepositAmount < 0) {
      setErrorMessage('Deposit amount cannot be negative.');
      return;
    }
    if (contractDate && settlementDate && settlementDate < contractDate) {
      setErrorMessage('Settlement date cannot precede contract date.');
      return;
    }
    if (depositDueDate && settlementDate && depositDueDate > settlementDate) {
      setErrorMessage('Deposit due date cannot be after settlement date.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        purchase_price: numPurchasePrice,
        deposit_amount: numDepositAmount,
        contract_date: contractDate || null,
        deposit_due_date: depositDueDate || null,
        settlement_date: settlementDate || null,
        site_area: siteArea ? parseFloat(siteArea) : null,
        site_area_unit: siteAreaUnit,
        current_zoning: currentZoning.trim() || null,
        existing_improvements: existingImprovements.trim() || null,
        planning_notes: planningNotes.trim() || null,
        development_potential_notes: devPotentialNotes.trim() || null,
        acquisition_costs: costRows.map((r) => ({
          category: r.category,
          name: r.name.trim() || 'Cost Item',
          amount: parseFloat(r.amount) || 0,
          notes: r.notes.trim() || null,
          date: r.date || null,
        })),
      };

      const updated = await api.updateLand(projectId, scenario.id, payload);
      setSaveSuccess(true);
      if (onLandUpdated) onLandUpdated(updated);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save land assumptions.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <p>Loading Land & Acquisition workspace for {scenario.name}...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Workspace Sub-Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Land & Acquisition Assumptions
            </h2>
            <span className="badge badge-type" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={12} />
              <span>{scenario.name}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Configure site purchase terms, statutory transfer duties, professional acquisition costs, and site area metrics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#059669',
                fontSize: '0.86rem',
                fontWeight: 600,
                backgroundColor: '#ecfdf5',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Changes Saved</span>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Land Assumptions'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            border: '1px solid #fecaca',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Financial KPI Subtotals Bar */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Purchase Price</span>
            <DollarSign size={16} color="#2563eb" />
          </div>
          <div className="kpi-card-value">{formatCurrency(numPurchasePrice)}</div>
          <span className="kpi-card-sub">Agreed contract site price</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Acquisition Costs</span>
            <Coins size={16} color="#7c3aed" />
          </div>
          <div className="kpi-card-value">{formatCurrency(totalAcquisitionCosts)}</div>
          <span className="kpi-card-sub">{costRows.length} itemized line costs</span>
        </div>

        <div
          className="kpi-card"
          style={{
            borderColor: '#a7f3d0',
            backgroundColor: '#f0fdf4',
          }}
        >
          <div className="kpi-card-header" style={{ color: '#047857' }}>
            <span>Total Land Acquisition</span>
            <Coins size={16} color="#059669" />
          </div>
          <div className="kpi-card-value" style={{ color: '#047857' }}>
            {formatCurrency(totalLandAcquisition)}
          </div>
          <span className="kpi-card-sub" style={{ color: '#065f46' }}>
            Purchase + Duty + Fees
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Settlement Balance</span>
            <Calendar size={16} color="#d97706" />
          </div>
          <div className="kpi-card-value">{formatCurrency(remainingPurchaseAmount)}</div>
          <span className="kpi-card-sub">
            Less deposit of {formatCurrency(numDepositAmount)}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Land Purchase & Settlement Timing */}
        <div>
          <div className="content-card">
            <div className="card-header-flex">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} color="#2563eb" />
                <span>Land Purchase & Financial Terms</span>
              </h3>
            </div>

            <div className="form-group">
              <label className="form-label">
                Purchase Price ($) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem' }}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="2500000"
              />
              <span className="form-helper">
                Contract base purchase price: <strong>{formatCurrency(numPurchasePrice)}</strong>
              </span>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Deposit Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="250000"
                />
                <span className="form-helper">
                  Deposit: {formatCurrency(numDepositAmount)}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Deposit Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={depositDueDate}
                  onChange={(e) => setDepositDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Contract Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
                <span className="form-helper">Contract exchange</span>
              </div>

              <div className="form-group">
                <label className="form-label">Settlement Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                />
                <span className="form-helper">Title transfer & final payment</span>
              </div>
            </div>
          </div>

          {/* Site & Planning Information */}
          <div className="content-card">
            <div className="card-header-flex">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#2563eb" />
                <span>Site & Planning Parameters</span>
              </h3>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Site Area</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  value={siteArea}
                  onChange={(e) => setSiteArea(e.target.value)}
                  placeholder="1250"
                />
                <span className="form-helper">
                  {siteArea ? `${formatNumber(siteArea)} ${siteAreaUnit}` : 'Area not specified'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Site Area Unit</label>
                <select
                  className="form-select"
                  value={siteAreaUnit}
                  onChange={(e) => setSiteAreaUnit(e.target.value)}
                >
                  <option value="m²">Square Metres (m²)</option>
                  <option value="hectares">Hectares (ha)</option>
                  <option value="acres">Acres</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Planning Zoning</label>
              <input
                type="text"
                className="form-input"
                value={currentZoning}
                onChange={(e) => setCurrentZoning(e.target.value)}
                placeholder="e.g. Medium Density Residential (R3) / Mixed Use (MU1)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Existing Improvements</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={existingImprovements}
                onChange={(e) => setExistingImprovements(e.target.value)}
                placeholder="e.g. 2 single-storey brick houses, asphalt parking, cleared vacant land..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Planning & Statutory Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={planningNotes}
                onChange={(e) => setPlanningNotes(e.target.value)}
                placeholder="e.g. FSR 2.0:1, maximum building height 21m, setback restrictions..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Development Potential / Yield Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={devPotentialNotes}
                onChange={(e) => setDevPotentialNotes(e.target.value)}
                placeholder="e.g. Target yield 48 residential units + 2 retail ground suites..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Acquisition Costs Schedule */}
        <div>
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#2563eb" />
                  <span>Acquisition Costs Schedule</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Itemize statutory duties, legal fees, due diligence, and search costs.
                </p>
              </div>

              <button className="btn btn-outline btn-sm" onClick={handleAddCostRow}>
                <Plus size={14} />
                <span>Add Cost Item</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {costRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  <p>No acquisition cost items added yet.</p>
                  <button className="btn btn-outline btn-sm" onClick={handleAddCostRow} style={{ marginTop: '8px' }}>
                    <Plus size={14} />
                    <span>Add First Cost</span>
                  </button>
                </div>
              ) : (
                costRows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <select
                        className="form-select"
                        style={{ flex: 1, fontSize: '0.82rem', padding: '6px 10px' }}
                        value={row.category}
                        onChange={(e) => handleUpdateCostRow(idx, 'category', e.target.value)}
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1.5, fontSize: '0.85rem', padding: '6px 10px' }}
                        value={row.name}
                        onChange={(e) => handleUpdateCostRow(idx, 'name', e.target.value)}
                        placeholder="Cost Description"
                      />

                      <div style={{ display: 'flex', alignItems: 'center', width: '130px' }}>
                        <span style={{ marginRight: '4px', fontWeight: 600, color: '#64748b' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          className="form-input"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            padding: '6px 8px',
                          }}
                          value={row.amount}
                          onChange={(e) => handleUpdateCostRow(idx, 'amount', e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', padding: '6px 8px' }}
                        onClick={() => handleRemoveCostRow(idx)}
                        title="Remove cost item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ width: '140px', fontSize: '0.78rem', padding: '4px 8px' }}
                        value={row.date}
                        onChange={(e) => handleUpdateCostRow(idx, 'date', e.target.value)}
                        title="Expected Payment Date"
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, fontSize: '0.78rem', padding: '4px 8px' }}
                        value={row.notes}
                        onChange={(e) => handleUpdateCostRow(idx, 'notes', e.target.value)}
                        placeholder="Notes or calculation basis (optional)..."
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total Acquisition Costs Summary */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Total Acquisition Costs
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Sum of all duties, legal, valuation & search items
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                {formatCurrency(totalAcquisitionCosts)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
