import React, { CSSProperties } from "react";

interface StatsItemProps {
  label: string;
  value: string;
}

const styles = {
  statsItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
  } as CSSProperties,

  statsLabel: {
    color: "#999",
    fontSize: "11px",
  } as CSSProperties,

  statsValue: {
    color: "#333",
    fontWeight: 600,
    fontSize: "14px",
  } as CSSProperties,
};

const StatsItem: React.FC<StatsItemProps> = ({ label, value }) => (
  <div style={styles.statsItem}>
    <div style={styles.statsLabel}>{label}</div>
    <div style={styles.statsValue}>{value}</div>
  </div>
);

export default StatsItem;
