// src/utils/request.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { message } from 'antdv-next'; // 如果你使用 Ant Design Vue
// import { ElMessage } from 'element-plus'; // 如果使用 Element Plus
// import { Toast } from 'vant'; // 如果使用 Vant

// 定义响应数据结构
export interface ResponseData<T = any> {
  success: boolean;
  code: number;
  message: string; 
  data: T;
}

// 定义请求配置
interface RequestConfig extends AxiosRequestConfig {
  showLoading?: boolean; // 是否显示 loading
  showError?: boolean;   // 是否显示错误提示
  retry?: number;        // 重试次数
  retryDelay?: number;   // 重试延迟
}

// Token 管理
class TokenManager {
  private static TOKEN_KEY = 'token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  static removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static clearAll(): void {
    this.removeToken();
    this.removeRefreshToken();
  }
}

// 请求队列（用于处理 token 刷新）
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

// 添加到等待队列
const addPendingRequest = (callback: (token: string) => void) => {
  pendingRequests.push(callback);
};

// 执行等待队列
const executePendingRequests = (token: string) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

class HttpClient {
  private instance: AxiosInstance;
  private loadingCount = 0;
  private loadingInstance: any = null;

  constructor() {
    this.instance = axios.create({
      // baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      baseURL:'/',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // 显示 loading
  private showLoading() {
    if (this.loadingCount === 0) {
      // 可以在这里调用全局 loading 组件
      // this.loadingInstance = ElLoading.service({ fullscreen: true });
      console.log('显示 loading');
    }
    this.loadingCount++;
  }

  // 隐藏 loading
  private hideLoading() {
    this.loadingCount--;
    if (this.loadingCount === 0 && this.loadingInstance) {
      // this.loadingInstance.close();
      console.log('隐藏 loading');
    }
  }

  // 设置拦截器
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: any) => {
        // 显示 loading
        if (config.showLoading !== false) {
          this.showLoading();
        }

        // 添加 token
        const token = TokenManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加时间戳防止缓存
        if (config.method === 'get' && config.noCache === false) {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        return config;
      },
      (error: AxiosError) => {
        this.hideLoading();
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.hideLoading();
        
        const { data, config } = response;
        
        // 根据后端返回的数据结构判断请求是否成功
        if (data.success === false || data.code !== 200) {
          // token 过期处理
          if (data.code === 401) {
            return this.handleTokenExpired(config);
          }
          
          // 显示错误提示
          if ((config as any).showError !== false) {
            message.error(data.message || '请求失败');
          }
          
          return Promise.reject(new Error(data.message || '请求失败'));
        }
        
        return data;
      },
      async (error: AxiosError) => {
        this.hideLoading();
        
        const { response, config } = error;
        
        // 网络错误处理
        if (!response) {
          message.error('网络连接异常，请检查网络设置');
          return Promise.reject(error);
        }
        
        // 处理 401 未授权
        if (response.status === 401) {
          return this.handleTokenExpired(config as any);
        }
        
        // 处理其他状态码
        const errorMessage = this.getErrorMessage(response.status);
        if ((config as any)?.showError !== false) {
          message.error(errorMessage);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // 处理 token 过期
  private async handleTokenExpired(config: RequestConfig): Promise<any> {
    // 获取 refresh token
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      // 没有 refresh token，跳转到登录页
      this.redirectToLogin();
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 如果正在刷新 token，将请求加入队列
    if (!isRefreshing) {
      isRefreshing = true;
      
      try {
        // 调用刷新 token 接口
        const newToken = await this.refreshToken(refreshToken);
        TokenManager.setToken(newToken);
        isRefreshing = false;
        
        // 执行等待队列中的请求
        executePendingRequests(newToken);
        
        // 重试当前请求
        if (config) {
          config.headers.Authorization = `Bearer ${newToken}`;
          return this.instance.request(config);
        }
      } catch (error) {
        isRefreshing = false;
        TokenManager.clearAll();
        this.redirectToLogin();
        return Promise.reject(error);
      }
    } else {
      // 等待 token 刷新完成
      return new Promise((resolve) => {
        addPendingRequest((newToken: string) => {
          if (config) {
            config.headers.Authorization = `Bearer ${newToken}`;
            resolve(this.instance.request(config));
          }
        });
      });
    }
  }
  
  // 刷新 token
  private async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      });
      
      if (response.data.success && response.data.data.token) {
        return response.data.data.token;
      }
      throw new Error('刷新 token 失败');
    } catch (error) {
      throw error;
    }
  }
  
  // 跳转到登录页
  private redirectToLogin() {
    // 清除所有登录信息
    TokenManager.clearAll();
    
    // 跳转到登录页
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
  
  // 获取错误信息
  private getErrorMessage(status: number): string {
    const errorMessages: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '拒绝访问',
      404: '请求资源不存在',
      405: '请求方法未允许',
      408: '请求超时',
      500: '服务器内部错误',
      501: '服务未实现',
      502: '网关错误',
      503: '服务不可用',
      504: '网关超时',
    };
    
    return errorMessages[status] || `连接错误 ${status}`;
  }
  
  // 公共请求方法
  request<T = any>(config: RequestConfig): Promise<ResponseData<T>> {
    return this.instance.request(config);
  }
  
  get<T = any>(url: string, params?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.instance.get(url, { params, ...config });
  }
  
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.instance.post(url, data, config);
  }
  
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.instance.put(url, data, config);
  }
  
  delete<T = any>(url: string, params?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    return this.instance.delete(url, { params, ...config });
  }
  
  upload<T = any>(url: string, file: File, config?: RequestConfig): Promise<ResponseData<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
  }
  
  download(url: string, params?: any, filename?: string): Promise<void> {
    return this.instance.get(url, {
      params,
      responseType: 'blob',
    }).then((response) => {
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    });
  }
}

// 导出实例
export const http = new HttpClient();

// 导出 Token 管理工具
export { TokenManager };

// 默认导出
export default http;