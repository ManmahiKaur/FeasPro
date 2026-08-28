import React, { useState } from 'react';
import { Building } from 'lucide-react';
import { ProjectListItem } from '../types';
import { ScenarioComparisonMatrix } from '../components/ScenarioComparisonMatrix';

interface ScenarioManagerViewProps {
  projects: ProjectListItem[];
  onSelectProjectScenarios: (projectId: string, scenarioId?: string) => void;
}

export const ScenarioManagerView: React.FC<ScenarioManagerViewProps> = ({
  projects,
  onSelectProjectScenarios,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return projects[0]?.id || '';
  });

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div className="view-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Scenario Manager & Comparison Matrix
          </h1>
          <p className="page-subtitle">
            Compare development schemes, yield variations, and stress-test financial returns side-by-side.
          </p>
        </div>

        {projects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Selected Project:
            </span>
            <select
              className="form-control"
              style={{ minWidth: '240px', fontWeight: 600 }}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.scenario_count} Schemes)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '48px' }}>
          <Building size={40} className="text-muted" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
            No Projects in Workspace
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create a project from the Portfolio dashboard to start managing feasibility scenarios.
          </p>
        </div>
      ) : activeProject ? (
        <ScenarioComparisonMatrix
          projectId={activeProject.id}
          onScenarioSelected={(scenarioId) => onSelectProjectScenarios(activeProject.id, scenarioId)}
        />
      ) : null}
    </div>
  );
};
