import React from 'react';
import {
  Map,
  Coins,
  TrendingUp,
  Banknote,
  CalendarDays,
  LineChart,
  FileSpreadsheet,
  LucideIcon,
} from 'lucide-react';

interface UpcomingModuleCardProps {
  moduleName: string;
  phase: string;
  description: string;
  features: string[];
  iconName: 'land' | 'costs' | 'sales' | 'funding' | 'schedule' | 'cashflow' | 'reports';
}

const iconMap: Record<string, LucideIcon> = {
  land: Map,
  costs: Coins,
  sales: TrendingUp,
  funding: Banknote,
  schedule: CalendarDays,
  cashflow: LineChart,
  reports: FileSpreadsheet,
};

export const UpcomingModuleCard: React.FC<UpcomingModuleCardProps> = ({
  moduleName,
  phase,
  description,
  features,
  iconName,
}) => {
  const IconComponent = iconMap[iconName] || Map;

  return (
    <div className="upcoming-placeholder-card">
      <div className="upcoming-icon-wrap">
        <IconComponent size={32} />
      </div>
      <span className="roadmap-pill" style={{ marginBottom: '12px' }}>
        {phase} Roadmap Module
      </span>
      <h3 className="upcoming-title">{moduleName} Feasibility Engine</h3>
      <p className="upcoming-desc">{description}</p>

      <div
        style={{
          textAlign: 'left',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '10px',
          }}
        >
          Planned Architectural Capabilities:
        </span>
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: '0.85rem', color: '#334155' }}>
          {features.map((feat, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>
              {feat}
            </li>
          ))}
        </ul>
      </div>

      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
        Phase 1 Foundation established. Calculation engine & data models reserved for next phase.
      </span>
    </div>
  );
};
