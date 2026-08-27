import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { DevelopmentType, ProjectCreateInput, Project } from '../types';
import { api } from '../services/api';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<ProjectCreateInput>({
    name: '',
    description: '',
    location: '',
    development_type: 'multi_unit_residential',
    start_date: '',
    target_completion_date: '',
    initial_scenario_name: 'Baseline Feasibility',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (
      formData.start_date &&
      formData.target_completion_date &&
      formData.target_completion_date < formData.start_date
    ) {
      setError('Expected completion date cannot be earlier than project start date.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: ProjectCreateInput = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        development_type: formData.development_type,
        start_date: formData.start_date || undefined,
        target_completion_date: formData.target_completion_date || undefined,
        initial_scenario_name: formData.initial_scenario_name?.trim() || 'Baseline Feasibility',
      };

      const newProject = await api.createProject(payload);
      onSuccess(newProject);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create project');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create Development Project</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '0.84rem',
                  border: '1px solid #fecaca',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Project Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pacific Horizon Residences"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Site Address / Location</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 142 Ocean Parade, Burleigh Heads QLD"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Development Typology</label>
              <select
                className="form-select"
                value={formData.development_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    development_type: e.target.value as DevelopmentType,
                  })
                }
              >
                <option value="multi_unit_residential">Multi-Unit Residential (Apartments)</option>
                <option value="townhouses">Medium-Density Townhouses</option>
                <option value="residential_subdivision">Residential Land Subdivision</option>
                <option value="commercial_mixed_use">Commercial / Mixed-Use</option>
                <option value="industrial">Industrial Business Park</option>
                <option value="retail">Retail Centre</option>
                <option value="other">Other Development</option>
              </select>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <span className="form-helper">Acquisition / Kickoff</span>
              </div>

              <div className="form-group">
                <label className="form-label">Expected Completion</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.target_completion_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, target_completion_date: e.target.value })
                  }
                />
                <span className="form-helper">Target Final Settlement</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Baseline Scenario Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Baseline Feasibility"
                value={formData.initial_scenario_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, initial_scenario_name: e.target.value })
                }
              />
              <span className="form-helper">Initial scenario anchor for future assumptions</span>
            </div>

            <div className="form-group">
              <label className="form-label">Project Scope & Summary</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe the development concept, zoning parameters, and yield objectives..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Project...' : 'Create & Open Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
