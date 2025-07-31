import React, { useEffect, useMemo, useState } from "react";
// import { ArrowUpIcon } from "@heroicons/react/24/solid";
import up from "../../img/up.svg";
import down from "../../img/down.svg";
import { Image } from "antd";
import DashEcharts from "./DashEcharts";
import exclamation from "../../img/exclamation.svg";
import { useDashEchartStore } from "../../store/dashEchartStore";
interface MetricCardProps {
  title: string;
  value: string;
  subtext?: string;
  percentage?: number;
  isPositive?: boolean;
  chartType: "line" | "bar";
  chartData: { name: string; value: number }[];
  color: "purple" | "blue" | "teal";
  WoWText?: string;
  DoDText?: string;
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
  WoWText,
  DoDText,
}) => {
  const getColorClasses = () => {
    switch (color) {
      case "purple":
        return {
          bg: "bg-purple-500",
          light: "bg-purple-100",
          text: "text-purple-500",
        };
      case "blue":
        return {
          bg: "bg-blue-500",
          light: "bg-blue-100",
          text: "text-blue-500",
        };
      case "teal":
        return {
          bg: "bg-teal-500",
          light: "bg-teal-100",
          text: "text-teal-500",
        };
      default:
        return {
          bg: "bg-gray-500",
          light: "bg-gray-100",
          text: "text-gray-500",
        };
    }
  };

  const colors = getColorClasses();

  const renderChart = () => {
    if (chartType === "line") {
      // Simple line chart implementation
      return <DashEcharts type="area" dataKey={chartData} height={100} />;
    } else {
      // Simple bar chart implementation
      return <DashEcharts type="bar" dataKey={chartData} height={100} />;
    }
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div style={{ color: "#999999", fontSize: "1rem" }}>{title}</div>
          <p className="font-bold mt-1 text-4xl">{value}</p>
        </div>
        <Image src={exclamation} alt="exclamation" width={32} height={32} preview={false} />
      </div>
      <div style={{ marginTop: "1rem" }}>{renderChart()}</div>

      <div
        className="flex items-center mt-2 justify-between pt-2"
        style={{ borderTop: "1px solid rgb(233, 226, 226)" }}
      >
        {WoWText && <div style={{ color: "#333333", fontSize: "1rem" }}>{WoWText}</div>}
        <div style={{ color: "#333333", fontSize: "1rem" }}>{subtext}</div>
        {percentage !== undefined && (
          <div
            className={`flex items-center ${isPositive ? "text-green-500" : "text-red-500"} mr-2`}
          >
            {isPositive ? (
              <Image src={up} alt="up" width={14} height={14} preview={false} />
            ) : (
              <Image src={down} alt="down" width={14} height={14} preview={false} />
            )}
            <span className="text-xs ml-1">{percentage}%</span>
          </div>
        )}

        {DoDText && <div style={{ color: "#333333", fontSize: "1rem" }}>{DoDText}</div>}
      </div>
    </div>
  );
};

interface DashboardBoardProps {
  acquisitionData: {
    value: string;
    dailyValue: string;
    chartData: { name: string; value: number }[];
  };
  reachData: {
    value: string;
    percentage: number;
    chartData: { name: string; value: number }[];
  };
  conversionData: {
    value: string;
    wowChange: number;
    dodChange: number;
    chartData: { name: string; value: number }[];
  };
}

const DashboardBoard: React.FC<DashboardBoardProps> = ({
  acquisitionData,
  reachData,
  conversionData,
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
        WoWText={`WoW Change ${conversionData.wowChange}%`}
        DoDText={`DoD Change ${conversionData.dodChange}%`}
      />
    </div>
  );
};

// Example usage with sample data
const ExampleDataBoard: React.FC = () => {
  const getGainQuantity = useDashEchartStore((state) => state.getGainQuantity);
  const gainQuantityArray = useDashEchartStore((state) => state.gainQuantity);
  const [acquisitionData, setAcquisitionData] = useState({
    value: "0",
    dailyValue: "0",
    chartData: [] as { name: string; value: number }[],
  });
  // 🔧 使用useMemo避免重复计算
  const processedData = useMemo(() => {
    const result = getGainQuantity();
    return {
      value: result.value.toLocaleString(),
      dailyValue: result.dailyValue.toLocaleString(),
      chartData: result.chartData.map((item) => ({
        name: new Date(item.key).toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric",
        }),
        value: item.value,
      })),
    };
  }, [gainQuantityArray, getGainQuantity]); // 🔧 依赖原始数组，而不是函数调用结果

  // 🔧 只在processedData变化时更新状态
  useEffect(() => {
    setAcquisitionData(processedData);
  }, [processedData]);

  const sampleData = {
    acquisitionData,
    reachData: {
      value: "6,560",
      percentage: 60,
      chartData: [
        { name: "Mon", value: 120 },
        { name: "Tue", value: 200 },
        { name: "Wed", value: 150 },
        { name: "Thu", value: 80 },
        { name: "Fri", value: 70 },
        { name: "Sat", value: 110 },
        { name: "Sun", value: 130 },
      ],
    },
    conversionData: {
      value: "78%",
      wowChange: 12,
      dodChange: 5,
      chartData: [
        { name: "Mon", value: 120 },
        { name: "Tue", value: 200 },
        { name: "Wed", value: 150 },
        { name: "Thu", value: 80 },
        { name: "Fri", value: 70 },
        { name: "Sat", value: 110 },
        { name: "Sun", value: 130 },
      ],
    },
  };

  return (
    <DashboardBoard
      acquisitionData={sampleData.acquisitionData}
      reachData={sampleData.reachData}
      conversionData={sampleData.conversionData}
    />
  );
};

export default DashboardBoard;
export { ExampleDataBoard };
