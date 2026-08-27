import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ScenarioCreateInput, Scenario } from '../types';
import { api } from '../services/api';

interface CreateScenarioModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess: (scenario: Scenario) => void;
}

export const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({
  isOpen,
  projectId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBaseline, setIsBaseline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Scenario name is required.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: ScenarioCreateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_baseline: isBaseline,
        status: 'draft',
      };
      const created = await api.createScenario(projectId, payload);
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create scenario');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Feasibility Scenario</h2>
          <button className="modal-close-btn" onClick={onClose}>
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
                Scenario Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Higher Density Option, Fast-Track Stage 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Scenario Description / Assumptions</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Explain the assumptions tested in this scenario (e.g. higher density yield, conservative sales velocity)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem' }}>
                <input
                  type="checkbox"
                  checked={isBaseline}
                  onChange={(e) => setIsBaseline(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>Set as Primary Baseline Scenario</span>
              </label>
              <span className="form-helper" style={{ marginLeft: '24px' }}>
                Designating this will switch the primary comparison benchmark for this project.
              </span>
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
              {loading ? 'Creating...' : 'Create Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
