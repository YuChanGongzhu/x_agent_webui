import React from "react";

interface ProgressStepsProps {
  currentStep: number;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  const steps = ["账号设置", "笔记内容", "发布设置"];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "column",
        marginBottom: "5px",
      }}
    >
      {/* 步骤指示器 */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        {/* 第一个步骤圆点 - 账号设置 */}
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: currentStep >= 0 ? "#3b82f6" : "#cbd5e1",
            transition: "all 0.3s ease",
            marginLeft: "30px",
          }}
        />

        {/* 第一条连接线 */}
        <div
          style={{
            height: "2px",
            flex: 1,
            backgroundColor: currentStep > 0 ? "#3b82f6" : "#e2e8f0",
            transition: "background-color 0.3s ease",
          }}
        />

        {/* 第二个步骤圆点 - 笔记内容 */}
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: currentStep >= 1 ? "#3b82f6" : "#cbd5e1",
            transition: "all 0.3s ease",
          }}
        />

        {/* 第二条连接线 */}
        <div
          style={{
            height: "2px",
            flex: 1,
            backgroundColor: currentStep > 1 ? "#3b82f6" : "#e2e8f0",
            transition: "background-color 0.3s ease",
          }}
        />

        {/* 第三个步骤圆点 - 发布设置 */}
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: currentStep >= 2 ? "#3b82f6" : "#cbd5e1",
            transition: "all 0.3s ease",
            marginRight: "30px",
          }}
        />
      </div>

      {/* 步骤标题 */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {steps.map((step, index) => (
          <div
            style={{
              width: "70px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: currentStep === index ? "600" : "500",
              color: currentStep >= index ? "#3b82f6" : "#64748b",
              transition: "all 0.3s ease",
            }}
            key={index}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressSteps;
