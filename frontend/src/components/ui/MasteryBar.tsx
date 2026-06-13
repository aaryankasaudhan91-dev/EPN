/**
 * Mastery Progress Bar Component
 */

import React from 'react';

interface MasteryBarProps {
  label: string;
  value: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getMasteryColor = (value: number): string => {
  if (value >= 90) return 'bg-green-500';
  if (value >= 75) return 'bg-blue-500';
  if (value >= 50) return 'bg-yellow-500';
  if (value >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

const getMasteryLabel = (value: number): string => {
  if (value >= 90) return 'Mastered';
  if (value >= 75) return 'Proficient';
  if (value >= 50) return 'Approaching';
  if (value >= 25) return 'Developing';
  return 'Novice';
};

const MasteryBar: React.FC<MasteryBarProps> = ({ label, value, showLabel = true, size = 'md' }) => {
  const color = getMasteryColor(value);
  const masteryLabel = getMasteryLabel(value);
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{masteryLabel}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(value)}%</span>
          </div>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

export default MasteryBar;
