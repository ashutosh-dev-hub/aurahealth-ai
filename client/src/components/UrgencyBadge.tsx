import React from 'react';
import { UrgencyLevel } from '../types';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface UrgencyBadgeProps {
  level: UrgencyLevel | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ level, showIcon = true, size = 'md' }) => {
  const normLevel = (level || 'MEDIUM').toUpperCase();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  }[size];

  if (normLevel === 'HIGH') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 radar-pulse ${sizeClasses}`}
      >
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />}
        <span>High Urgency</span>
      </span>
    );
  }

  if (normLevel === 'LOW') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}
      >
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        <span>Low Urgency</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}
    >
      {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
      <span>Medium Urgency</span>
    </span>
  );
};
