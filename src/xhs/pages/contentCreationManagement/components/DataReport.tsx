import React, { CSSProperties } from "react";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import ContentDashEcharts from "../../../components/ContentDashEcharts";

interface DataReportProps {
  title: string;
  tooltipText?: React.ReactNode;
  total: number;
  chartData: { time: string; value: number }[];
  bottomChildren: React.ReactNode;
}

const styles = {
  dataReportCard: {
    flex: 1,
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    minHeight: "200px",
  } as CSSProperties,

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "16px",
    fontWeight: 600,
    color: "#333",
  } as CSSProperties,

  chartContainer: {
    flex: 1,
    minHeight: "120px",
  } as CSSProperties,

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "8px",
    fontSize: "12px",
    color: "#666",
  } as CSSProperties,
};

const DataReport: React.FC<DataReportProps> = ({
  title,
  tooltipText,
  total,
  chartData,
  bottomChildren,
}) => {
  return (
    <div style={styles.dataReportCard}>
      <div style={styles.cardHeader}>
        <span>{title}</span>
        {tooltipText && (
          <Tooltip title={tooltipText}>
            <InfoCircleOutlined style={{ color: "#999", cursor: "help" }} />
          </Tooltip>
        )}
      </div>
      <div style={styles.chartContainer}>
        <ContentDashEcharts dataKey={chartData} height={120} />
      </div>
      <div style={styles.cardFooter}>{bottomChildren}</div>
    </div>
  );
};

export default DataReport;
