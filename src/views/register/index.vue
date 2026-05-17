<<template>
  <div class="register-page">
    <!-- 顶部工具栏 -->
    <div class="top-tools">
      <LanguageSwitch />
      <ThemeToggle />
    </div>

    <!-- 注册卡片 -->
    <div class="register-card">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <img :src="logoImg" alt="logo" class="logo-img" />
        <h3 class="brand-name">ANTDV NEXT ADMIN</h3>
        <h1 class="page-title">用户注册</h1>
        <p class="page-subtitle">Create your workspace account</p>
      </div>

      <!-- 注册表单 -->
      <a-form
        :model="formState"
        :rules="rules"
        @finish="handleRegister"
        class="register-form"
      >
        <!-- 账号 -->
        <a-form-item name="username">
          <a-input
            v-model:value="formState.username"
            placeholder="请输入账号"
            size="large"
            :prefix="h(UserOutlined)"
            allow-clear
          />
        </a-form-item>

        <!-- 密码 -->
        <a-form-item name="password">
          <a-input-password
            v-model:value="formState.password"
            placeholder="请输入密码"
            size="large"
            :prefix="h(LockOutlined)"
            allow-clear
          />
        </a-form-item>

        <!-- 确认密码 -->
        <a-form-item name="confirmPassword">
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="请确认密码"
            size="large"
            :prefix="h(LockOutlined)"
            allow-clear
          />
        </a-form-item>

        <!-- 邮箱 -->
        <a-form-item name="email">
          <a-input
            v-model:value="formState.email"
            placeholder="请输入邮箱"
            size="large"
            :prefix="h(MailOutlined)"
            allow-clear
          />
        </a-form-item>

        <!-- 昵称 -->
        <a-form-item name="nickname">
          <a-input
            v-model:value="formState.nickname"
            placeholder="请输入昵称"
            size="large"
            :prefix="h(SmileOutlined)"
            allow-clear
          />
        </a-form-item>

        <!-- 性别 -->
        <a-form-item name="gender">
          <a-radio-group v-model:value="formState.gender" class="gender-group">
            <a-radio value="male">
              <span class="gender-option">
                <ManOutlined class="gender-icon male" />
                男
              </span>
            </a-radio>
            <a-radio value="female">
              <span class="gender-option">
                <WomanOutlined class="gender-icon female" />
                女
              </span>
            </a-radio>
            <a-radio value="secret">
              <span class="gender-option">
                <QuestionCircleOutlined class="gender-icon secret" />
                保密
              </span>
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 滑动验证 -->
        <a-form-item name="captcha">
          <SliderCaptcha
            v-model:value="formState.captcha"
            text="滑动验证身份"
          />
        </a-form-item>

        <!-- 注册按钮 -->
        <a-form-item>
          <a-button
            type="primary"
            size="large"
            html-type="submit"
            class="submit-btn"
            :loading="loading"
            :disabled="!formState.captcha"
          >
            注 册
          </a-button>
        </a-form-item>

        <!-- 底部链接 -->
        <div class="form-footer">
          <span class="footer-text">已有账号？</span>
          <a @click="goLogin" class="login-link">立即登录</a>
        </div>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  SmileOutlined,
  ManOutlined,
  WomanOutlined,
  QuestionCircleOutlined,
} from "@antdv-next/icons";
import { message } from "antdv-next";
import { reactive, ref, h } from "vue";
import { useRouter } from "vue-router";
import type { Rule } from "ant-design-vue/es/form";

import logoImg from "@/assets/images/logo.png";
import { SliderCaptcha } from "@/components/Captcha";
import LanguageSwitch from "@/components/Layout/LanguageSwitch.vue";
import ThemeToggle from "@/components/Layout/ThemeToggle.vue";
import { $t } from "@/locales";

const router = useRouter();
const loading = ref(false);

// 表单状态
const formState = reactive({
  username: "",
  password: "",
  confirmPassword: "",
  email: "",
  nickname: "",
  gender: "secret" as "male" | "female" | "secret",
  captcha: false,
});

// 自定义验证规则
const validateConfirmPassword = async (_rule: Rule, value: string) => {
  if (value === "") {
    return Promise.reject(new Error("请再次输入密码"));
  } else if (value !== formState.password) {
    return Promise.reject(new Error("两次输入的密码不一致"));
  } else {
    return Promise.resolve();
  }
};

// 表单验证规则
const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: "请输入账号", trigger: "blur" },
    { min: 4, max: 20, message: "账号长度应为 4-20 位", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "账号只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 20, message: "密码长度应为 6-20 位", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: "blur" },
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    {
      type: "email",
      message: "请输入有效的邮箱地址",
      trigger: "blur",
    },
  ],
  nickname: [
    { required: true, message: "请输入昵称", trigger: "blur" },
    { min: 2, max: 20, message: "昵称长度应为 2-20 位", trigger: "blur" },
  ],
  gender: [{ required: true, message: "请选择性别", trigger: "change" }],
  captcha: [
    {
      validator: (_rule: Rule, value: boolean) => {
        if (!value) {
          return Promise.reject(new Error("请完成滑动验证"));
        }
        return Promise.resolve();
      },
      trigger: "change",
    },
  ],
};

// 处理注册
const handleRegister = async () => {
  if (!formState.captcha) {
    message.warning("请先完成滑动验证");
    return;
  }

  loading.value = true;
  try {
    // TODO: 调用注册 API
    // const res = await registerApi({
    //   username: formState.username,
    //   password: formState.password,
    //   email: formState.email,
    //   nickname: formState.nickname,
    //   gender: formState.gender,
    // });

    // 模拟注册成功
    await new Promise((resolve) => setTimeout(resolve, 1000));
    message.success("注册成功，即将跳转到登录页");
    
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  } catch (error) {
    message.error("注册失败，请稍后重试");
  } finally {
    loading.value = false;
  }
};

// 跳转到登录页
const goLogin = () => {
  router.push("/login");
};
</script>

<style scoped lang="scss">
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%);
  position: relative;
  padding: 24px;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(
        circle at 20% 50%,
        rgba(255, 255, 255, 0.4) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 80%,
        rgba(255, 255, 255, 0.3) 0%,
        transparent 50%
      );
    pointer-events: none;
  }
}

.top-tools {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.register-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px 36px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15),
    0 2px 8px rgba(31, 38, 135, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  position: relative;
  z-index: 1;
}

.logo-section {
  text-align: center;
  margin-bottom: 32px;

  .logo-img {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    object-fit: contain;
  }

  .brand-name {
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    letter-spacing: 2px;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: 14px;
    color: #94a3b8;
    margin: 0;
  }
}

.register-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.ant-input-affix-wrapper) {
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.8);
    padding: 8px 16px;
    transition: all 0.3s ease;

    &:hover,
    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
      background: #ffffff;
    }

    .ant-input {
      background: transparent;
      font-size: 14px;

      &::placeholder {
        color: #cbd5e1;
      }
    }

    .ant-input-prefix {
      color: #94a3b8;
      margin-right: 10px;
      font-size: 16px;
    }

    .ant-input-suffix {
      color: #cbd5e1;
    }
  }

  :deep(.ant-input-password) {
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.8);
    padding: 8px 16px;
    transition: all 0.3s ease;

    &:hover,
    &:focus-within {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
      background: #ffffff;
    }

    input {
      background: transparent;
      font-size: 14px;

      &::placeholder {
        color: #cbd5e1;
      }
    }

    .ant-input-prefix {
      color: #94a3b8;
      margin-right: 10px;
      font-size: 16px;
    }
  }
}

.gender-group {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0 4px;

  :deep(.ant-radio-wrapper) {
    flex: 1;
    margin-right: 8px;
    text-align: center;
    padding: 8px 0;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.6);
    transition: all 0.3s ease;

    &:last-child {
      margin-right: 0;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.9);
      border-color: #bfdbfe;
    }

    &.ant-radio-wrapper-checked {
      background: #eff6ff;
      border-color: #3b82f6;

      .gender-icon {
        &.male {
          color: #3b82f6;
        }
        &.female {
          color: #ec4899;
        }
        &.secret {
          color: #6b7280;
        }
      }
    }
  }
}

.gender-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: #475569;
}

.gender-icon {
  font-size: 16px;
  transition: color 0.3s ease;

  &.male {
    color: #93c5fd;
  }
  &.female {
    color: #f9a8d4;
  }
  &.secret {
    color: #9ca3af;
  }
}

.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  border: none;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #cbd5e1;
    box-shadow: none;
    cursor: not-allowed;
  }
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);

  .footer-text {
    color: #94a3b8;
    font-size: 14px;
  }

  .login-link {
    color: #3b82f6;
    font-size: 14px;
    font-weight: 500;
    margin-left: 4px;
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
      color: #2563eb;
      text-decoration: underline;
    }
  }
}

// 响应式适配
@media (max-width: 480px) {
  .register-card {
    padding: 32px 24px;
    border-radius: 20px;
  }

  .logo-section {
    .page-title {
      font-size: 24px;
    }
  }

  .gender-group {
    :deep(.ant-radio-wrapper) {
      padding: 6px 0;
      
      span {
        font-size: 12px;
      }
    }
  }
}
</style>