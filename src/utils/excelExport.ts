import * as XLSX from "xlsx";

// 定义导出数据的接口
export interface ExportData {
  userName: string;
  commentContent: string;
  likeCount: number;
  customerLevel: string;
  reachContent: string;
}

// 简单的导出筛选结果功能
export const exportFilterResults = (data: ExportData[], keyword: string = "筛选结果") => {
  try {
    // 准备导出数据
    const exportData = data.map((item, index) => ({
      序号: index + 1,
      用户名: item.userName,
      评论内容: item.commentContent,
      点赞数: item.likeCount,
      意向级别: item.customerLevel,
      触达内容: item.reachContent,
    }));

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 8 }, // 序号
      { wch: 15 }, // 用户名
      { wch: 50 }, // 评论内容
      { wch: 10 }, // 点赞数
      { wch: 12 }, // 意向级别
      { wch: 50 }, // 触达内容
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "筛选结果");

    // 生成文件名（包含时间戳）
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_").slice(0, 19);
    const filename = `${keyword}_筛选结果_${timestamp}.xlsx`;

    // 导出文件
    XLSX.writeFile(workbook, filename);

    return { success: true, filename };
  } catch (error) {
    console.error("导出Excel失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
