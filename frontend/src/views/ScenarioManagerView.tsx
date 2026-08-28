import React from 'react';
import { Layers, ChevronRight } from 'lucide-react';
import { ProjectListItem } from '../types';

interface ScenarioManagerViewProps {
  projects: ProjectListItem[];
  onSelectProjectScenarios: (projectId: string) => void;
}

export const ScenarioManagerView: React.FC<ScenarioManagerViewProps> = ({
  projects,
  onSelectProjectScenarios,
}) => {
  return (
    <div className="view-container">
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Scenario Manager
          </h1>
          <p className="page-subtitle">
            Manage scenarios across your entire portfolio. Select a project to view and compare its feasibility models.
          </p>
        </div>
      </div>

      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Location</th>
              <th>Total Scenarios</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                  No projects available.
                </td>
              </tr>
            ) : (
              projects.map((proj) => (
                <tr key={proj.id}>
                  <td style={{ fontWeight: 600 }}>{proj.name}</td>
                  <td>{proj.location || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={14} color="#64748b" />
                      <span>{proj.scenario_count} {proj.scenario_count === 1 ? 'Scenario' : 'Scenarios'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${proj.status}`}>{proj.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectProjectScenarios(proj.id)}
                    >
                      <span>Manage Scenarios</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
