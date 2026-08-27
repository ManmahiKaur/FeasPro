import React from 'react';
import { MapPin, Calendar, Layers, ChevronRight } from 'lucide-react';
import { ProjectListItem, DevelopmentType } from '../types';

interface ProjectCardProps {
  project: ProjectListItem;
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

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect }) => {
  return (
    <div className="project-card" onClick={() => onSelect(project.id)}>
      <div className="project-card-header">
        <h3 className="project-card-title">{project.name}</h3>
        <span className={`badge badge-${project.status}`}>
          {project.status}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span className="badge badge-type">{formatDevType(project.development_type)}</span>
      </div>

      {project.description && (
        <p className="project-card-desc">{project.description}</p>
      )}

      <div className="project-meta-list">
        {project.location && (
          <div className="project-meta-item">
            <MapPin size={15} color="#64748b" />
            <span>{project.location}</span>
          </div>
        )}
        <div className="project-meta-item">
          <Calendar size={15} color="#64748b" />
          <span>
            {project.start_date ? project.start_date : 'TBD'} →{' '}
            {project.target_completion_date ? project.target_completion_date : 'TBD'}
          </span>
        </div>
      </div>

      <div className="project-card-footer">
        <div className="scenario-counter-badge">
          <Layers size={14} />
          <span>
            {project.scenario_count} {project.scenario_count === 1 ? 'Scenario' : 'Scenarios'}
          </span>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(project.id);
          }}
        >
          <span>Open</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
