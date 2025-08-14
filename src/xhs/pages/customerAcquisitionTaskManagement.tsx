import React, { useState, useMemo, useRef } from "react";
import DashboardBoard, { ExampleDataBoard } from "../components/DataBoard";
import TaskBoard, { ExampleTaskBoard } from "../components/TaskBoard";
import Message, { ExampleMessage } from "../components/Message";
import TopUserMessage from "../components/TopUserMessage";

// 在组件外部创建稳定的组件实例
const StableTaskBoard = () => <ExampleTaskBoard />;
const StableDataBoard = () => <ExampleDataBoard />;
const StableMessage = () => <ExampleMessage />;
const StableTopUserMessage = () => <TopUserMessage />;

const CustomerAcquisitionTaskManagement: React.FC = React.memo(
  () => {
    return (
      <div className="flex flex-col">
        <StableTopUserMessage />
        <div className="flex flex-col space-y-6 p-4 bg-gray-50 bg-[#FDF3FC]">
          {/* Dashboard Metrics Section */}
          <div className="w-full">
            <StableDataBoard />
          </div>
          {/* Task Board and Message Section */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Task Board Section - Takes more width on larger screens */}
            <div className="w-full lg:w-3/5">
              <StableTaskBoard />
            </div>

            {/* Message Section - Takes less width on larger screens */}
            <div className="w-full lg:w-2/5">
              <StableMessage />
            </div>
          </div>
        </div>
      </div>
    );
  },
  () => {
    // 阻止 Dashboard 组件的重新渲染
    return true;
  }
);

export default CustomerAcquisitionTaskManagement;
