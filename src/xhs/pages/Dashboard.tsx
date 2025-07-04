import React, { useState } from "react";
import DashboardBoard, { ExampleDataBoard } from "../components/DataBoard";
import TaskBoard, { ExampleTaskBoard } from "../components/TaskBoard";
import Message, { ExampleMessage } from "../components/Message";
import TopUserMessage from "../components/TopUserMessage";
const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col">
      <TopUserMessage />
      <div className="flex flex-col space-y-6 p-4 bg-gray-50 bg-[#FDF3FC]">
        {/* Dashboard Metrics Section */}
        <div className="w-full">
          <ExampleDataBoard />
        </div>
        {/* Task Board and Message Section */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Task Board Section - Takes more width on larger screens */}
          <div className="w-full lg:w-3/5">
            <ExampleTaskBoard />
          </div>

          {/* Message Section - Takes less width on larger screens */}
          <div className="w-full lg:w-2/5">
            <ExampleMessage />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
