import type { User, Role, Permission } from "@/types/auth";

import { defineStore } from "pinia";
import { ref, computed } from "vue";

import avatarImg from "@/assets/images/avatar.png";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user_info";
const TOKEN_EXPIRES_KEY = "token_expires_at";

const DEFAULT_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const refreshTokenValue = ref<string | null>(
    localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  const tokenExpiresAt = ref<number | null>(null);
  const user = ref<User | null>(null);
  const roles = ref<Role[]>([]);
  const permissions = ref<Permission[]>([]);

  const savedExpires = localStorage.getItem(TOKEN_EXPIRES_KEY);
  if (savedExpires) {
    tokenExpiresAt.value = parseInt(savedExpires, 10);
  }

  const isTokenExpired = computed(() => {
    if (!token.value) return true;
    if (!tokenExpiresAt.value) return false;
    return Date.now() >= tokenExpiresAt.value;
  });

  const isLoggedIn = computed(
    () => !!token.value && !!user.value && !isTokenExpired.value,
  );
  const userRoles = computed(() => roles.value.map((role) => role.code));
  const userPermissions = computed(() =>
    permissions.value.map((perm) => perm.code),
  );

  const setToken = (
    newToken: string | null,
    newRefreshToken?: string | null,
    expiresIn?: number,
  ) => {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);

      let expiresAt: number;
      if (expiresIn !== undefined && expiresIn > 0) {
        expiresAt = Date.now() + expiresIn * 1000;
      } else {
        const payload = decodeJwtPayload(newToken);
        if (payload?.exp && typeof payload.exp === "number") {
          expiresAt = payload.exp * 1000;
        } else {
          expiresAt = Date.now() + DEFAULT_TOKEN_EXPIRY_MS;
        }
      }
      tokenExpiresAt.value = expiresAt;
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
    } else {
      localStorage.removeItem(TOKEN_KEY);
      tokenExpiresAt.value = null;
      localStorage.removeItem(TOKEN_EXPIRES_KEY);
    }

    if (newRefreshToken !== undefined) {
      refreshTokenValue.value = newRefreshToken;
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
  };

  const setUserInfo = (userInfo: User | null) => {
    user.value = userInfo;
    if (userInfo) {
      roles.value = userInfo.roles || [];
      permissions.value = userInfo.permissions || [];
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    } else {
      roles.value = [];
      permissions.value = [];
      localStorage.removeItem(USER_KEY);
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const isDemoMode =
      import.meta.env.VITE_USE_MOCK === "true" || apiBaseUrl === "/api";

    if (isDemoMode) {
      return loginDemo(username, password);
    }

    const { login: loginApi, getUserInfo } = await import("@/api/auth");

    const loginResult = await loginApi({ username, password });
    setToken(
      loginResult.data.token,
      loginResult.data.refreshToken,
      loginResult.data.expiresIn,
    );

    const userInfo = await getUserInfo();
    setUserInfo(userInfo.data);
  };

  const loginDemo = async (
    username: string,
    password: string,
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (
      (username === "admin" || username === "user") &&
      password === "123456"
    ) {
      const isAdmin = username === "admin";

      setToken(
        `demo-token-${isAdmin ? "1" : "2"}-${Date.now()}`,
        `demo-refresh-token-${isAdmin ? "1" : "2"}-${Date.now()}`,
        DEFAULT_TOKEN_EXPIRY_MS / 1000,
      );

      const userInfo: User = isAdmin
        ? {
            id: "1",
            username: "admin",
            email: "admin@example.com",
            realName: "Administrator",
            avatar: avatarImg,
            phone: "180........",
            gender: "male",
            birthDate: "1999-05-31",
            bio: "System Administrator",
            status: "active",
            createdAt: "2026-05-31T00:00:00.000Z",
            updatedAt: new Date().toISOString(),
            roles: [
              {
                id: "1",
                name: "Administrator",
                code: "admin",
                description: "System Administrator",
                permissions: [],
                createdAt: "2023-01-01T00:00:00.000Z",
                updatedAt: "2023-01-01T00:00:00.000Z",
              },
            ],
            permissions: [
              {
                id: "1",
                name: "All Permissions",
                code: "*",
                description: "Has all permissions",
                resource: "*",
                action: "*",
                type: "api",
              },
            ],
          }
        : {
            id: "2",
            username: "user",
            email: "user@example.com",
            realName: "Regular User",
            avatar: avatarImg,
            phone: "13800138001",
            gender: "female",
            birthDate: "1995-05-15",
            bio: "Regular User",
            status: "active",
            createdAt: "2023-01-01T00:00:00.000Z",
            updatedAt: new Date().toISOString(),
            roles: [
              {
                id: "2",
                name: "User",
                code: "user",
                description: "Regular User",
                permissions: [],
                createdAt: "2023-01-01T00:00:00.000Z",
                updatedAt: "2023-01-01T00:00:00.000Z",
              },
            ],
            permissions: [
              {
                id: "2",
                name: "View Dashboard",
                code: "dashboard.view",
                description: "Can view dashboard",
                resource: "dashboard",
                action: "view",
                type: "menu",
              },
            ],
          };

      setUserInfo(userInfo);
    } else {
      throw new Error("Invalid username or password");
    }
  };

  const logout = () => {
    setToken(null, null);
    setUserInfo(null);
  };

  const refreshToken = async (): Promise<string> => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const isDemoMode =
      import.meta.env.VITE_USE_MOCK === "true" || apiBaseUrl === "/api";

    if (isDemoMode) {
      await new Promise((resolve) => setTimeout(resolve, 700));

      if (!refreshTokenValue.value) {
        throw new Error("No refresh token available");
      }

      const newToken = `demo-token-refreshed-${Date.now()}`;
      setToken(
        newToken,
        refreshTokenValue.value,
        DEFAULT_TOKEN_EXPIRY_MS / 1000,
      );
      return newToken;
    }

    const { refreshToken: refreshTokenApi } = await import("@/api/auth");

    if (!refreshTokenValue.value) {
      throw new Error("No refresh token available");
    }

    const result = await refreshTokenApi(refreshTokenValue.value);
    setToken(
      result.data.token,
      result.data.refreshToken,
      result.data.expiresIn,
    );
    return result.data.token;
  };

  const hasRole = (role: string): boolean => {
    return userRoles.value.includes(role);
  };

  const hasAnyRole = (roleList: string[]): boolean => {
    return roleList.some((role) => hasRole(role));
  };

  const hasAllRoles = (roleList: string[]): boolean => {
    return roleList.every((role) => hasRole(role));
  };

  const hasPermission = (permission: string): boolean => {
    return (
      userPermissions.value.includes("*") ||
      userPermissions.value.includes(permission)
    );
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some((perm) => hasPermission(perm));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every((perm) => hasPermission(perm));
  };

  const initAuth = () => {
    if (isTokenExpired.value && token.value) {
      logout();
      return;
    }

    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        const userInfo = JSON.parse(savedUser);
        setUserInfo(userInfo);
      } catch (error) {
        console.error("Failed to parse saved user info:", error);
        localStorage.removeItem(USER_KEY);
      }
    }
  };

  return {
    token,
    refreshTokenValue,
    tokenExpiresAt,
    user,
    roles,
    permissions,
    isTokenExpired,
    isLoggedIn,
    userRoles,
    userPermissions,
    setToken,
    setUserInfo,
    login,
    logout,
    refreshToken,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    initAuth,
  };
});
