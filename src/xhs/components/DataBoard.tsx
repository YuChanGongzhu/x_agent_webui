import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { ArrowUpIcon } from "@heroicons/react/24/solid";
import up from "../../img/up.svg";
import down from "../../img/down.svg";
import { Image } from "antd";
import DashEcharts from "./DashEcharts";
import exclamation from "../../img/exclamation.svg";
import { useDashEchartStore } from "../../store/dashEchartStore";
import { useUserStore } from "../../store/userStore";
import { getReplyNum } from "../../api/mysql";
interface MetricCardProps {
  title: string;
  value: string;
  subtext?: string;
  percentage?: number;
  isPositive?: boolean;
  chartType: "line" | "bar" | "pie";
  chartData: { time: string; value: number }[];
  color: "purple" | "blue" | "teal";
}
interface DashboardBoardProps {
  acquisitionData: {
    value: string;
    dailyValue: string;
    chartData: { time: string; value: number }[];
  };
  reachData: {
    value: string;
    percentage: number;
    chartData: { time: string; value: number }[];
  };
  privateMessageData: {
    value: string;
    chartData: { time: string; value: number }[];
  };
}

const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({ title, value, subtext, percentage, isPositive = true, chartType, chartData, color }) => {
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
      } else if (chartType === "pie") {
        // Simple pie chart implementation
        return <DashEcharts type="pie" dataKey={chartData} height={100} />;
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
        </div>
      </div>
    );
  }
);

const DashboardBoard: React.FC<DashboardBoardProps> = React.memo(
  ({ acquisitionData, reachData, privateMessageData }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="总获取笔记"
          value={acquisitionData.value}
          subtext={`今日获取量 ${acquisitionData.dailyValue}`}
          chartType="line"
          chartData={acquisitionData.chartData}
          color="purple"
        />

        <MetricCard
          title="触达用户"
          value={reachData.value}
          // subtext={`触达率 ${reachData.percentage}%`}
          chartType="bar"
          chartData={reachData.chartData}
          color="blue"
        />

        <MetricCard
          title="总私信"
          value={privateMessageData.value}
          chartType="pie"
          chartData={privateMessageData.chartData}
          color="teal"
        />
      </div>
    );
  }
);
interface ReplyData {
  value: string;
  percentage: number;
  chartData: { time: string; value: number }[];
}
// Example usage with sample data
const ExampleDataBoard: React.FC = React.memo(
  () => {
    const { email } = useUserStore();
    const getGainQuantity = useDashEchartStore((state) => state.getGainQuantity);
    const gainQuantityArray = useDashEchartStore((state) => state.gainQuantity);
    const privateMessageDataArray = useDashEchartStore((state) => state.privateMessageData);
    const getPrivateMessageData = useDashEchartStore((state) => state.getPrivateMessageData);
    const [acquisitionData, setAcquisitionData] = useState({
      value: "0",
      dailyValue: "0",
      chartData: [] as { time: string; value: number }[],
    });
    const [replyData, setReplyData] = useState({
      value: "0",
      percentage: 0,
      chartData: [] as { time: string; value: number }[],
    });
    const [privateMessageData, setPrivateMessageData] = useState({
      value: "0",
      chartData: [] as { time: string; value: number }[],
    });
    //第一个数据处理
    // 使用useMemo避免重复计算，添加深度比较
    const processedData = useMemo(() => {
      const result = getGainQuantity();
      const newData = {
        value: result.value.toLocaleString(),
        dailyValue: result.dailyValue.toLocaleString(),
        chartData: result.chartData.map((item) => ({
          time: new Date(item.key).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          }),
          value: item.value,
        })),
      };
      return newData;
    }, [gainQuantityArray]); // 🔧 依赖原始数组，而不是函数调用结果

    // 使用 useCallback 稳定更新函数，避免不必要的状态更新
    const updateAcquisitionData = useCallback((newData: typeof processedData) => {
      setAcquisitionData((prev) => {
        // 简单的浅比较，避免相同数据的重复更新
        if (
          prev.value === newData.value &&
          prev.dailyValue === newData.dailyValue &&
          prev.chartData.length === newData.chartData.length
        ) {
          return prev; // 返回原对象，避免重新渲染
        }
        return newData;
      });
    }, []);

    // 只在processedData变化时更新状态
    useEffect(() => {
      updateAcquisitionData(processedData);
    }, [processedData, updateAcquisitionData]);

    //第二个数据处理方法
    const aggReplyData = useCallback((data: any, totalAcquisition: string) => {
      const { total, replyTime } = data;
      const acquisitionNum = Number(totalAcquisition); // 避免除零
      const replyData: ReplyData = {
        value: total,
        percentage: Number(((Number(total) / acquisitionNum) * 100).toFixed(2)),
        chartData: replyTime.map((item: any) => ({
          time: item.time,
          value: item.count,
        })),
      };
      return replyData;
    }, []);

    //获取第二个的数据
    useEffect(() => {
      if (acquisitionData.value !== "0") {
        // 等待第一个数据加载完成
        getReplyNum(email)
          .then((res) => {
            const replyData = aggReplyData(res.data, acquisitionData.value);
            setReplyData(replyData);
          })
          .catch((err) => {
            console.log(err);
          });
      }
    }, [email, acquisitionData.value, aggReplyData]);

    //第三个数据处理
    const processedPrivateMessageData = useMemo(() => {
      const result = getPrivateMessageData();
      // result.chartData 是一个对象，需要转换为数组
      const chartDataArray = Object.entries(result.chartData || {}).map(([key, value]) => ({
        time: key,
        value: value as unknown as number,
      }));
      return {
        value: result.value.toLocaleString(),
        chartData: chartDataArray,
      };
    }, [privateMessageDataArray]);

    // 使用 useCallback 稳定私信数据更新函数
    const updatePrivateMessageData = useCallback((newData: typeof processedPrivateMessageData) => {
      setPrivateMessageData((prev) => {
        // 简单的浅比较，避免相同数据的重复更新
        if (prev.value === newData.value && prev.chartData.length === newData.chartData.length) {
          return prev; // 返回原对象，避免重新渲染
        }
        return newData;
      });
    }, []);

    //第三个数据状态更新
    useEffect(() => {
      updatePrivateMessageData(processedPrivateMessageData);
    }, [processedPrivateMessageData, updatePrivateMessageData]);

    const sampleData = useMemo(
      () => ({
        acquisitionData,
        replyData,
        privateMessageData,
      }),
      [acquisitionData, replyData, privateMessageData]
    );

    return (
      <DashboardBoard
        acquisitionData={sampleData.acquisitionData}
        reachData={sampleData.replyData}
        privateMessageData={sampleData.privateMessageData}
      />
    );
  },
  () => {
    // ExampleDataBoard 没有 props，但需要响应 store 变化，减少不必要的重新渲染
    return false; // 允许重新渲染，但通过内部优化减少不必要的计算
  }
);

export default DashboardBoard;
export { ExampleDataBoard };
