import React from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: string;
  subtext?: string;
  percentage?: number;
  isPositive?: boolean;
  chartType: 'line' | 'bar';
  chartData: number[];
  color: 'purple' | 'blue' | 'teal';
  secondaryText?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  percentage,
  isPositive = true,
  chartType,
  chartData,
  color,
  secondaryText
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'purple':
        return {
          bg: 'bg-purple-500',
          light: 'bg-purple-100',
          text: 'text-purple-500'
        };
      case 'blue':
        return {
          bg: 'bg-blue-500',
          light: 'bg-blue-100',
          text: 'text-blue-500'
        };
      case 'teal':
        return {
          bg: 'bg-teal-500',
          light: 'bg-teal-100',
          text: 'text-teal-500'
        };
      default:
        return {
          bg: 'bg-gray-500',
          light: 'bg-gray-100',
          text: 'text-gray-500'
        };
    }
  };

  const colors = getColorClasses();

  const renderChart = () => {
    if (chartType === 'line') {
      // Simple line chart implementation
      const maxValue = Math.max(...chartData);
      const minValue = Math.min(...chartData);
      const range = maxValue - minValue;
      
      return (
        <div className="relative h-12 w-full mt-2">
          <svg className="w-full h-full" viewBox={`0 0 ${chartData.length} 100`}>
            <polyline
              points={chartData
                .map((value, index) => {
                  const x = (index / (chartData.length - 1)) * chartData.length;
                  const y = 100 - ((value - minValue) / (range || 1)) * 80;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={color === 'purple' ? '#8B5CF6' : color === 'blue' ? '#3B82F6' : '#14B8A6'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    } else {
      // Simple bar chart implementation
      return (
        <div className="flex items-end justify-between h-12 w-full mt-2 space-x-1">
          {chartData.map((value, index) => {
            const height = `${(value / Math.max(...chartData)) * 100}%`;
            return (
              <div 
                key={index} 
                className={`${colors.bg} rounded-sm w-full`} 
                style={{ height }}
              />
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
          <span className="text-gray-500 text-xs">?</span>
        </div>
      </div>
      
      {renderChart()}
      
      <div className="flex items-center mt-2">
        {percentage !== undefined && (
          <div className={`flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'} mr-2`}>
            {isPositive ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : (
              <ArrowUpIcon className="h-3 w-3 transform rotate-180" />
            )}
            <span className="text-xs ml-1">{percentage}%</span>
          </div>
        )}
        <div className="text-gray-500 text-xs">{subtext}</div>
        {secondaryText && (
          <div className="ml-auto text-gray-500 text-xs">{secondaryText}</div>
        )}
      </div>
    </div>
  );
};

interface DashboardBoardProps {
  acquisitionData: {
    value: string;
    dailyValue: string;
    chartData: number[];
  };
  reachData: {
    value: string;
    percentage: number;
    chartData: number[];
  };
  conversionData: {
    value: string;
    wowChange: number;
    dodChange: number;
    chartData: number[];
  };
}

const DashboardBoard: React.FC<DashboardBoardProps> = ({
  acquisitionData,
  reachData,
  conversionData
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="获取数量"
        value={acquisitionData.value}
        subtext={`每日获取量 ${acquisitionData.dailyValue}`}
        chartType="line"
        chartData={acquisitionData.chartData}
        color="purple"
      />
      
      <MetricCard
        title="触达用户"
        value={reachData.value}
        subtext={`触达率 60%`}
        chartType="bar"
        chartData={reachData.chartData}
        color="blue"
      />
      
      <MetricCard
        title="转化量"
        value={conversionData.value}
        chartType="bar"
        chartData={conversionData.chartData}
        color="teal"
        secondaryText={`WoW Change ${conversionData.wowChange}% DoD Change ${conversionData.dodChange}%`}
      />
    </div>
  );
};

// Example usage with sample data
const ExampleDataBoard: React.FC = () => {
  const sampleData = {
    acquisitionData: {
      value: "8,846",
      dailyValue: "1,234",
      chartData: [10, 15, 8, 12, 9, 16, 14, 12, 10, 8, 16, 12]
    },
    reachData: {
      value: "6,560",
      percentage: 60,
      chartData: [8, 12, 10, 9, 11, 7, 10, 8, 9, 12, 10, 8]
    },
    conversionData: {
      value: "78%",
      wowChange: 12,
      dodChange: 5,
      chartData: [70, 75, 72, 78, 82, 80, 78]
    }
  };
  
  return <DashboardBoard 
    acquisitionData={sampleData.acquisitionData}
    reachData={sampleData.reachData}
    conversionData={sampleData.conversionData}
  />;
};

export default DashboardBoard;
export { ExampleDataBoard };