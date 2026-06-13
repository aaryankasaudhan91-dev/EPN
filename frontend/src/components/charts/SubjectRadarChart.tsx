/**
 * Subject Radar Chart
 * Shows mastery across subjects in a radar/spider chart
 */

import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

interface SubjectData {
  subject: string;
  mastery: number;
}

interface SubjectRadarChartProps {
  data: SubjectData[];
  height?: number;
}

const SubjectRadarChart: React.FC<SubjectRadarChartProps> = ({ data, height = 280 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: '#6b7280' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickCount={5}
        />
        <Radar
          name="Mastery"
          dataKey="mastery"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [`${Math.round(value)}%`, 'Mastery']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default SubjectRadarChart;
