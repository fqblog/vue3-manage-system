// src/api/user.ts
import { http } from '@/utils/myRequest';

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

// 用户相关 API
export const userApi = { 
  // 登录
  login(loginData: LoginParams) {
    return http.post<LoginResponse>('/api/manage/login', loginData);
  },
  
  // 登出
  logout() {
    return http.post('/logout');
  },
  
  // 获取用户信息
  getUserInfo() {
    return http.get<UserInfo>('/user/info');
  },
  
  // 更新用户信息
  updateUserInfo(data: Partial<UserInfo>) {
    return http.put('/user/info', data);
  },
  
  // 修改密码
  changePassword(oldPassword: string, newPassword: string) {
    return http.post('/user/change-password', { oldPassword, newPassword });
  },
  
  // 上传头像
  uploadAvatar(file: File) {
    return http.upload('/user/avatar', file);
  },
};

// 导出所有 API
export default {
  user: userApi,
};