import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// 虚拟数据（用于示例）
// const sampleData = {
//   acquisitionData: {
//     chartData: [10, 15, 8, 12, 9, 16, 14, 12, 10, 8, 16, 12],
//   },
//   reachData: {
//     chartData: [8, 12, 10, 9, 11, 7, 10, 8, 9, 12, 10, 8],
//   },
// };

// 图表样式类型
export type ChartType = "area" | "bar";

// 数据点类型
export interface ChartDataPoint {
  time: string;
  value: number;
}

// 组件Props接口
interface DashEchartsProps {
  type?: ChartType;
  dataKey?: ChartDataPoint[];
  title?: string;
  height?: number;
  width?: number;
}

const DashEcharts: React.FC<DashEchartsProps> = ({
  type = "area",
  dataKey = [],
  title = "",
  height = 200,
  width = "",
}) => {
  // 使用传入的数据，如果没有数据则使用空数组
  const chartData = useMemo(() => {
    return dataKey.length > 0 ? dataKey : [];
  }, [dataKey]);

  // 自定义颜色方案
  const colors = {
    area: "#975fe4",
    bar: "#3aa0ff",
  };

  // 面积图组件
  const AreaChartComponent = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{
          top: 0,
          right: 0,
          left: 0,
        }}
      >
        {/* 面积颜色 */}
        {/* <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.area} stopOpacity={1} />
            <stop offset="100%" stopColor={colors.area} stopOpacity={1} />
          </linearGradient>
        </defs> */}
        {/* 网格线 */}
        {/* <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /> */}
        {/* 坐标轴 */}
        {/* <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#666" }}
        />
        {/* 纵坐标 */}
        {/* <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} /> */}
        {/* 提示 */}
        {/* <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        /> */}
        {/* 面积 */}
        <Area type="monotone" dataKey="value" stroke="none" fill="#975fe4" />
      </AreaChart>
    </ResponsiveContainer>
  );

  // 柱状图组件
  const BarChartComponent = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{
          top: 0,
          right: 0,
          left: 0,
        }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.bar} stopOpacity={1} />
            <stop offset="100%" stopColor={colors.bar} stopOpacity={1} />
          </linearGradient>
        </defs>
        {/* <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#666" }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        /> */}
        {/* 柱状图 */}
        <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div
      style={{
        width: "100%",
        height: `${height}px`,
      }}
    >
      {title && (
        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#333",
            marginBottom: "10px",
            fontWeight: "500",
          }}
        >
          {title}
        </div>
      )}
      {type === "area" ? <AreaChartComponent /> : <BarChartComponent />}
    </div>
  );
};

export default DashEcharts;
