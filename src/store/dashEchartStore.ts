import { create } from "zustand";

// 定义任务数据类型
interface TaskData {
  start_date: string;
  gainQuantity?: number;
  [key: string]: any;
}

// 定义返回数据类型
interface GainQuantityResult {
  value: number; // 总数量
  dailyValue: number; // 今日数量
  //   weeklyValue: number; // 最近一周数量
  chartData: { key: string; value: number }[]; // 图表数据
}

type DashEchartStore = {
  gainQuantity: TaskData[]; // 总任务数组
  gainQuantity_day: number; // 今日任务数量
  setGainQuantity: (gainQuantity: TaskData[]) => void;
  setGainQuantity_day: (gainQuantity_day: number) => void;
  getGainQuantity: () => GainQuantityResult;
};

export const useDashEchartStore = create<DashEchartStore>((set, get) => ({
  gainQuantity: [],
  gainQuantity_day: 0,

  setGainQuantity: (gainQuantity: TaskData[]) => {
    set({ gainQuantity });
  },

  setGainQuantity_day: (gainQuantity_day: number) => {
    set({ gainQuantity_day });
  },

  getGainQuantity: () => {
    const { gainQuantity } = get();
    // console.log("获取到数据", gainQuantity);

    // 获取当前时间（只比较日期，忽略时分秒）
    const nowTime = new Date();
    const today = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());

    // 获取一周前的时间
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 筛选出最近一周的任务
    const recentWeekTasks = gainQuantity.filter((task) => {
      const taskTime = new Date(task.start_date);
      const taskDate = new Date(taskTime.getFullYear(), taskTime.getMonth(), taskTime.getDate());
      return taskDate >= oneWeekAgo;
    });

    // 筛选出今日的任务（修复日期比较逻辑）
    const todayTasks = gainQuantity.filter((task) => {
      const taskTime = new Date(task.start_date);
      const taskDate = new Date(taskTime.getFullYear(), taskTime.getMonth(), taskTime.getDate());
      return taskDate.getTime() === today.getTime();
    });

    // 按日期分组统计每日任务数量
    const dailyTasksMap = new Map<string, number>();
    recentWeekTasks.forEach((task) => {
      const taskTime = new Date(task.start_date);
      const dateKey = taskTime.toISOString().split("T")[0]; // YYYY-MM-DD 格式
      dailyTasksMap.set(dateKey, (dailyTasksMap.get(dateKey) || 0) + 1);
    });

    // 生成图表数据
    const chartData = Array.from(dailyTasksMap.entries())
      .map(([date, count]) => ({
        key: date,
        value: count,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)); // 按日期排序

    const result: GainQuantityResult = {
      value: recentWeekTasks.length, // 总数量
      dailyValue: todayTasks.length, // 今日数量
      chartData, // 每日任务数量图表数据
    };

    // console.log("处理后的数据:", result);
    return result;
  },
}));
