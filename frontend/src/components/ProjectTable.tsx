import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ProjectListItem, DevelopmentType } from '../types';

interface ProjectTableProps {
  projects: ProjectListItem[];
  onSelect: (projectId: string) => void;
}

const formatDevType = (type: DevelopmentType): string => {
  const map: Record<DevelopmentType, string> = {
    residential_subdivision: 'Land Subdivision',
    multi_unit_residential: 'Multi-Unit Residential',
    townhouses: 'Townhouses',
    commercial_mixed_use: 'Commercial / Mixed-Use',
    industrial: 'Industrial',
    retail: 'Retail',
    other: 'Other',
  };
  return map[type] || type;
};

export const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onSelect }) => {
  return (
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Typology</th>
            <th>Location</th>
            <th>Start Date</th>
            <th>Target Completion</th>
            <th>Scenarios</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((proj) => (
            <tr key={proj.id} onClick={() => onSelect(proj.id)}>
              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {proj.name}
              </td>
              <td>
                <span className="badge badge-type">{formatDevType(proj.development_type)}</span>
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>{proj.location || '—'}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                {proj.start_date || '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                {proj.target_completion_date || '—'}
              </td>
              <td>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                  {proj.scenario_count}
                </span>
              </td>
              <td>
                <span className={`badge badge-${proj.status}`}>{proj.status}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(proj.id);
                  }}
                >
                  <span>Open</span>
                  <ChevronRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
