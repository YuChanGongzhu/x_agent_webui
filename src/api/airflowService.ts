import axios from 'axios';

// Base URL for Airflow API - should be configurable for different environments
const API_BASE_URL = process.env.REACT_APP_AIRFLOW_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance with default config
const airflowApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
airflowApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('airflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interface for DAG related data
interface DAG {
  dag_id: string;
  description: string;
  is_paused: boolean;
  is_active: boolean;
  last_run?: string;
  // Add more fields as needed
}

// Interface for DAG run data
interface DAGRun {
  dag_run_id: string;
  dag_id: string;
  execution_date: string;
  start_date: string;
  state: string;
  // Add more fields as needed
}

// API service for Airflow
const airflowService = {
  // Authentication
  login: async (username: string, password: string) => {
    // Note: This is a placeholder. Airflow API doesn't have a direct login endpoint.
    // You may need to implement a custom authentication solution
    const response = await axios.post('/auth/login', { username, password });
    localStorage.setItem('airflow_token', response.data.token);
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('airflow_token');
  },
  
  // DAGs
  getAllDags: async (): Promise<DAG[]> => {
    const response = await airflowApi.get('/dags');
    return response.data.dags;
  },
  
  getDag: async (dagId: string): Promise<DAG> => {
    const response = await airflowApi.get(`/dags/${dagId}`);
    return response.data;
  },
  
  toggleDagPause: async (dagId: string, isPaused: boolean): Promise<void> => {
    await airflowApi.patch(`/dags/${dagId}`, { is_paused: isPaused });
  },
  
  // DAG Runs
  getDagRuns: async (dagId: string): Promise<DAGRun[]> => {
    const response = await airflowApi.get(`/dags/${dagId}/dagRuns`);
    return response.data.dag_runs;
  },
  
  createDagRun: async (dagId: string, config: any): Promise<DAGRun> => {
    const response = await airflowApi.post(`/dags/${dagId}/dagRuns`, config);
    return response.data;
  },
  
  // Tasks
  getTaskInstances: async (dagId: string, dagRunId: string) => {
    const response = await airflowApi.get(`/dags/${dagId}/dagRuns/${dagRunId}/taskInstances`);
    return response.data.task_instances;
  },
  
  // Crawler specific endpoints (these would connect to your custom API)
  getCrawlerStatus: async () => {
    const response = await axios.get('/api/crawler/status');
    return response.data;
  },
  
  submitCrawlJob: async (config: any) => {
    const response = await axios.post('/api/crawler/jobs', config);
    return response.data;
  },
  
  getCrawlResults: async (jobId: string) => {
    const response = await axios.get(`/api/crawler/jobs/${jobId}/results`);
    return response.data;
  }
};

export default airflowService;
