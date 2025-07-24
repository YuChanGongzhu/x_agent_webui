import axios from "axios";

/**
 * Airflow API客户端接口，用于与Airflow REST API交互
 * 参考了x_agent_web项目中的airflow.py实现
 */

// 从环境变量中获取Airflow配置
const BASE_URL = process.env.REACT_APP_AIRFLOW_BASE_URL;
const USERNAME = process.env.REACT_APP_AIRFLOW_USERNAME;
const PASSWORD = process.env.REACT_APP_AIRFLOW_PASSWORD;

// 创建Axios实例，配置基础URL和认证信息
const airflowAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
    "Content-Type": "application/json",
  },
});

/**
 * 处理API请求的通用函数
 * @param request Axios请求Promise
 * @returns 请求结果数据
 */
const handleRequest = async <T>(request: Promise<any>): Promise<T> => {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Airflow API request failed: ${error.message}`);
    }
    throw error;
  }
};

interface DagRunRequest<T = any> {
  conf: T;
  dag_run_id: string;
  data_interval_end: string;
  data_interval_start: string;
  logical_date: string;
  note: string;
}

interface VariableResponse {
  description: string | null;
  key: string;
  value: string;
}

/**
 * 通用DAG运行相关接口
 * 参考了x_agent_web项目中的airflow.py实现
 */

/**
 * 获取指定DAG的运行记录
 * @param dagId DAG的ID
 * @param limit 返回结果的最大数量
 * @param orderBy 排序字段，默认按开始时间降序排序
 * @returns 包含DAG运行记录的响应
 */
export const getDagRuns = async (
  dagId: string,
  limit: number = 100,
  orderBy: string = "-start_date"
): Promise<any> => {
  const params = { limit, order_by: orderBy };
  return handleRequest(airflowAxios.get(`/dags/${dagId}/dagRuns`, { params }));
};

/**
 * 触发一个DAG运行
 * @param dagId DAG的ID
 * @param dagRunId 可选的DAG运行ID，如果不提供，Airflow会自动生成
 * @param conf 可选的配置参数
 * @param logicalDate 可选的逻辑执行日期，格式为ISO8601
 * @param note 可选的备注
 * @returns 包含新创建的DAG运行信息的响应
 */
export const triggerDagRun = async (
  dagId: string,
  dagRunId?: string,
  conf?: any,
  logicalDate?: string,
  note?: string
): Promise<any> => {
  // 构建请求体
  const payload: any = {};
  if (dagRunId) payload.dag_run_id = dagRunId;
  if (conf) payload.conf = conf;
  if (logicalDate) payload.logical_date = logicalDate;
  if (note) payload.note = note;

  return handleRequest(airflowAxios.post(`/dags/${dagId}/dagRuns`, payload));
};

/**
 * Airflow变量操作相关接口
 * 参考了x_agent_web项目中的airflow.py实现
 */

/**
 * 获取Airflow变量
 * @param key 变量的键名
 * @returns 变量的响应，包含键名、值和描述
 */
export const getVariable = async (key: string): Promise<VariableResponse> => {
  return handleRequest<VariableResponse>(airflowAxios.get(`/variables/${key}`));
};

/**
 * 设置Airflow变量
 * @param key 变量的键名
 * @param value 变量的值
 * @param description 变量的描述（可选）
 * @returns 变量的响应
 */
export const setVariable = async (
  key: string,
  value: string,
  description?: string
): Promise<VariableResponse> => {
  return handleRequest<VariableResponse>(
    airflowAxios.post("/variables", {
      key,
      value,
      description,
    })
  );
};

/**
 * 获取所有Airflow变量
 * @param limit 返回结果的最大数量
 * @param offset 结果的偏移量
 * @returns 包含变量列表的响应
 */
export const getAllVariables = async (limit: number = 100, offset: number = 0): Promise<any> => {
  const params = { limit, offset };
  return handleRequest(airflowAxios.get("/variables", { params }));
};

/**
 * 删除Airflow变量
 * @param key 要删除的变量的键名
 * @returns 删除操作的响应
 */
export const deleteVariable = async (key: string): Promise<any> => {
  return handleRequest(airflowAxios.delete(`/variables/${key}`));
};

/**
 * 获取DAG详情
 * @param dagId DAG的ID
 * @returns 包含DAG详情的响应
 */
export const getDagDetail = async (dagId: string): Promise<any> => {
  return handleRequest(airflowAxios.get(`/dags/${dagId}`));
};

/**
 * 获取DAG任务列表
 * @param dagId DAG的ID
 * @returns 包含DAG任务列表的响应
 */
export const getDagTasks = async (dagId: string): Promise<any> => {
  return handleRequest(airflowAxios.get(`/dags/${dagId}/tasks`));
};

/**
 * 获取特定DAG运行的详情
 * @param dagId DAG的ID
 * @param dagRunId DAG运行的ID
 * @returns 包含DAG运行详情的响应
 */
export const getDagRunDetail = async (dagId: string, dagRunId: string): Promise<any> => {
  return handleRequest(airflowAxios.get(`/dags/${dagId}/dagRuns/${dagRunId}`));
};

/**
 * 获取特定DAG运行的任务实例
 * @param dagId DAG的ID
 * @param dagRunId DAG运行的ID
 * @returns 包含任务实例列表的响应
 */
export const getDagRunTaskInstances = async (dagId: string, dagRunId: string): Promise<any> => {
  return handleRequest(airflowAxios.get(`/dags/${dagId}/dagRuns/${dagRunId}/taskInstances`));
};

/**
 * 获取特定任务实例的日志
 * @param dagId DAG的ID
 * @param dagRunId DAG运行的ID
 * @param taskId 任务的ID
 * @param taskTryNumber 任务尝试次数
 * @returns 包含任务日志的响应
 */
export const getTaskInstanceLog = async (
  dagId: string,
  dagRunId: string,
  taskId: string,
  taskTryNumber: number = 1
): Promise<any> => {
  return handleRequest(
    airflowAxios.get(
      `/dags/${dagId}/dagRuns/${dagRunId}/taskInstances/${taskId}/logs/${taskTryNumber}`
    )
  );
};

/**
 * 暂停DAG
 * @param dagId DAG的ID
 * @param dag_run_id DAG运行的ID
 * @returns 操作响应
 */
export const pauseDag = async (dagId: string, dag_run_id: string): Promise<any> => {
  return handleRequest(
    airflowAxios.patch(`/dags/${dagId}/dagRuns/${dag_run_id}`, { state: "success" })
  );
};
//设置note
export const setNote = async (dagId: string, dagRunId: string, note: string): Promise<any> => {
  return handleRequest(
    airflowAxios.patch(`/dags/${dagId}/dagRuns/${dagRunId}/setNote`, { note: note })
  );
};

/**
 * 恢复DAG
 * @param dagId DAG的ID
 * @returns 操作响应
 */
export const unpauseDag = async (dagId: string): Promise<any> => {
  return handleRequest(airflowAxios.patch(`/dags/${dagId}`, { is_paused: false }));
};

/**
 * 获取所有DAG列表
 * @param limit 返回结果的最大数量
 * @param offset 结果的偏移量
 * @returns 包含DAG列表的响应
 */
export const getAllDags = async (limit: number = 100, offset: number = 0): Promise<any> => {
  const params = { limit, offset };
  return handleRequest(airflowAxios.get("/dags", { params }));
};
