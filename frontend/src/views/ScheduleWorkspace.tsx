import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Flag,
  Sparkles,
} from 'lucide-react';
import { ScheduleMilestone, Scenario } from '../types';
import { api } from '../services/api';

interface ScheduleWorkspaceProps {
  projectId: string;
  scenario: Scenario;
}

const STAGE_OPTIONS = [
  { value: 'acquisition', label: 'Site Acquisition & Settlement', color: '#059669' },
  { value: 'planning_da', label: 'Planning & DA Approvals', color: '#0284c7' },
  { value: 'presales', label: 'Presales Campaign', color: '#d97706' },
  { value: 'civil_demo', label: 'Demolition & Civil Works', color: '#7c3aed' },
  { value: 'construction', label: 'Main Construction Works', color: '#2563eb' },
  { value: 'titling', label: 'Strata Titling & Compliance', color: '#4b5563' },
  { value: 'settlement', label: 'Final Settlements & Handover', color: '#10b981' },
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export const ScheduleWorkspace: React.FC<ScheduleWorkspaceProps> = ({
  projectId,
  scenario,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [milestones, setMilestones] = useState<ScheduleMilestone[]>([]);

  const loadScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getSchedule(projectId, scenario.id);
      setMilestones(res.milestones);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load project schedule.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, scenario.id]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const maxMonth = Math.max(
    ...milestones.map((m) => m.start_month + m.duration_months - 1),
    18
  );

  const constructionMilestone = milestones.find((m) => m.stage === 'construction');
  const constructionDuration = constructionMilestone ? constructionMilestone.duration_months : 12;

  const handleAddMilestone = () => {
    const newM: ScheduleMilestone = {
      stage: 'construction',
      name: 'Additional Milestone Stage',
      start_month: 6,
      duration_months: 6,
      end_month: 11,
      status: 'planned',
      notes: '',
    };
    setMilestones([...milestones, newM]);
  };

  const handleUpdateMilestone = (
    index: number,
    field: keyof ScheduleMilestone,
    value: any
  ) => {
    const updated = [...milestones];
    const current = { ...updated[index], [field]: value };
    const start = parseInt(String(current.start_month)) || 1;
    const dur = parseInt(String(current.duration_months)) || 1;
    current.end_month = start + dur - 1;
    updated[index] = current;
    setMilestones(updated);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: ScheduleMilestone[] = milestones.map((m) => ({
        stage: m.stage,
        name: m.name.trim() || 'Milestone Stage',
        start_month: parseInt(String(m.start_month)) || 1,
        duration_months: Math.max(1, parseInt(String(m.duration_months)) || 1),
        end_month:
          (parseInt(String(m.start_month)) || 1) +
          Math.max(1, parseInt(String(m.duration_months)) || 1) -
          1,
        status: m.status || 'planned',
        notes: m.notes?.trim() || null,
      }));

      const res = await api.updateScheduleBatch(projectId, scenario.id, payload);
      setMilestones(res.milestones);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save project schedule.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !milestones.length) {
    return (
      <div className="view-loading">
        <div className="loading-spinner" />
        <p>Loading project Gantt schedule and phasing timeline...</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Error saving schedule:</strong> {errorMessage}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Success:</strong> Timeline phasing and Gantt milestones updated successfully!
          </div>
        </div>
      )}

      {/* KPI Header Cards */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Project Duration</span>
            <Calendar size={18} className="kpi-icon text-accent" />
          </div>
          <div className="kpi-value text-accent">{maxMonth} Months</div>
          <div className="kpi-subtext">Acquisition to Final Settlement</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Construction Period</span>
            <Clock size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{constructionDuration} Months</div>
          <div className="kpi-subtext">Main Head Contract Build</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Project Stages</span>
            <Layers size={18} className="kpi-icon" />
          </div>
          <div className="kpi-value">{milestones.length} Milestones</div>
          <div className="kpi-subtext">Active Planning & Delivery Tracking</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Final Settlement</span>
            <Flag size={18} className="kpi-icon text-success" />
          </div>
          <div className="kpi-value text-success">Month {maxMonth}</div>
          <div className="kpi-subtext">Debt Payoff & Equity Disbursement</div>
        </div>
      </div>

      {/* Visual Gantt Chart Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Project Gantt Timeline</h3>
          <p className="card-subtitle">Visual phasing of development stages across project months.</p>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '700px' }}>
            {/* Timeline Header Row (Months) */}
            <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
              <div style={{ width: '220px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Milestone Stage
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                {Array.from({ length: maxMonth }, (_, i) => i + 1).map((m) => (
                  <div
                    key={m}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      borderLeft: '1px solid #f1f5f9',
                    }}
                  >
                    M{m}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {milestones.map((m, idx) => {
                const stageObj = STAGE_OPTIONS.find((s) => s.value === m.stage);
                const color = stageObj?.color || '#2563eb';
                const leftPct = ((m.start_month - 1) / maxMonth) * 100;
                const widthPct = (m.duration_months / maxMonth) * 100;

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '220px', fontSize: '0.84rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                      {m.name}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: '26px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '8px',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                        title={`${m.name}: Month ${m.start_month} to ${m.end_month} (${m.duration_months} mos)`}
                      >
                        {m.duration_months >= 2 ? `${m.duration_months} mos` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Milestones Table Form */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="section-icon-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="card-title">Schedule Milestones & Durations</h3>
                <p className="card-subtitle">Itemize project timeline start periods, stage durations, and delivery status.</p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddMilestone}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <Plus size={16} />
              <span>Add Stage</span>
            </button>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Stage Category</th>
                    <th style={{ width: '26%' }}>Milestone Name</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Start Month</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Duration (Mos)</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>End Month</th>
                    <th style={{ width: '14%' }}>Status</th>
                    <th style={{ width: '6%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No schedule milestones configured. Click <strong>"Add Stage"</strong> to begin scheduling.
                      </td>
                    </tr>
                  ) : (
                    milestones.map((m, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={m.stage}
                            onChange={(e) => handleUpdateMilestone(index, 'stage', e.target.value)}
                          >
                            {STAGE_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ fontWeight: 600 }}
                            value={m.name}
                            onChange={(e) => handleUpdateMilestone(index, 'name', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            className="form-control form-control-sm"
                            style={{ textAlign: 'center', fontWeight: 600 }}
                            value={m.start_month}
                            onChange={(e) => handleUpdateMilestone(index, 'start_month', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            className="form-control form-control-sm"
                            style={{ textAlign: 'center', fontWeight: 600 }}
                            value={m.duration_months}
                            onChange={(e) => handleUpdateMilestone(index, 'duration_months', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--brand-accent)' }}>
                          M{m.start_month + m.duration_months - 1}
                        </td>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={m.status}
                            onChange={(e) => handleUpdateMilestone(index, 'status', e.target.value)}
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="action-btn text-danger"
                            title="Delete Milestone"
                            onClick={() => handleRemoveMilestone(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="workspace-save-bar">
          <div className="save-bar-info">
            <Sparkles size={16} className="text-accent" />
            <span>Timeline changes automatically align cash flow duration and financing periods</span>
          </div>
          <div className="save-bar-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '150px' }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Schedule'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
