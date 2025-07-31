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
interface PrivateMessageResult {
  value: number; // 总数量
  chartData: { key: string; value: number }[]; // 图表数据
}
type DashEchartStore = {
  gainQuantity: TaskData[]; // 总任务数组
  gainQuantity_day: number; // 今日任务数量
  setGainQuantity: (gainQuantity: TaskData[]) => void;
  setGainQuantity_day: (gainQuantity_day: number) => void;
  getGainQuantity: () => GainQuantityResult;
  // 私信数据
  privateMessageData: any;
  setPrivateMessageData: (privateMessageData: any) => void;
  getPrivateMessageData: () => PrivateMessageResult;
};

export const useDashEchartStore = create<DashEchartStore>((set, get) => ({
  gainQuantity: [],
  gainQuantity_day: 0,
  privateMessageData: [],

  setGainQuantity: (gainQuantity: TaskData[]) => {
    set({ gainQuantity });
  },

  setGainQuantity_day: (gainQuantity_day: number) => {
    set({ gainQuantity_day });
  },
  setPrivateMessageData: (privateMessageData: any) => {
    set({ privateMessageData });
  },
  getGainQuantity: () => {
    const { gainQuantity } = get();

    // 获取当前时间（只比较日期，忽略时分秒）
    const nowTime = new Date();
    const today = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());

    // 获取一周前的时间
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    //筛选出状态是成功
    const success = gainQuantity.filter((task) => {
      return task.state === "success" && task.note !== "paused";
    });
    // 筛选出最近一周的任务
    const recentWeekTasks = success.filter((task) => {
      const taskTime = new Date(task.start_date);
      const taskDate = new Date(taskTime.getFullYear(), taskTime.getMonth(), taskTime.getDate());
      return taskDate >= oneWeekAgo;
    });

    // 筛选出今日的成功任务（修复日期比较逻辑）
    const todayTasks = success.filter((task) => {
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

    // 计算总的 max_notes 数量
    const totalMaxNotes = success.reduce((sum, task) => {
      return sum + (task.max_notes || 0);
    }, 0);

    // 计算今日的 max_notes 数量
    const todayMaxNotes = todayTasks.reduce((sum, task) => {
      return sum + (task.max_notes || 0);
    }, 0);

    const result: GainQuantityResult = {
      value: totalMaxNotes, // 总数量：所有成功任务的max_notes总和
      dailyValue: todayMaxNotes, // 今日数量：今日成功任务的max_notes总和
      chartData, // 每日任务数量图表数据
    };

    // console.log("处理后的数据:", result);
    return result;
  },
  getPrivateMessageData: () => {
    const { privateMessageData } = get();
    const originalData = privateMessageData;
    const total = Object.values(originalData).flatMap((arr) => arr).length;
    const deviceCounts = Object.fromEntries(
      Object.entries(originalData).map(([id, list]: any) => [id, list.length])
    );

    // console.log(deviceCounts, "deviceCounts"); // 减少日志输出
    return {
      value: total,
      chartData: deviceCounts,
    };
  },
}));
