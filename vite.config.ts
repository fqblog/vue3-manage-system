import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { mockDevServerPlugin } from "vite-plugin-mock-dev-server";
import { fileURLToPath, URL } from "node:url";
import pkg from "./package.json";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
    // 生产环境使用子路径，开发环境使用根路径
  const base = mode === 'production' ? '/vue3-manage-system/' : '/';
   return {
    base,
     define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    tailwindcss(),
    mockDevServerPlugin({
      prefix: "/api",
      log: "error",
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["legacy-js-api"],
      },
      sass: {
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
        // 代理所有 /api 开头的请求
        '/api': {
          target: 'http://localhost:3001/',  // 后端地址
          changeOrigin: true,  // 改变请求源
          // rewrite: (path) => path.replace(/^\/api/, ''),  // 可选：去掉 /api 前缀
          // 如果后端接口没有 /api 前缀，使用 rewrite
          // 如果后端接口有 /api 前缀，则不需要 rewrite
        },
    },
  },
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/vue-router/") ||
            id.includes("node_modules/pinia/")
          ) {
            return "vue-vendor";
          }
          if (
            id.includes("node_modules/antdv-next/") ||
            id.includes("node_modules/@antdv-next/")
          ) {
            return "antdv-vendor";
          }
          if (
            id.includes("node_modules/echarts/") ||
            id.includes("node_modules/vue-echarts/")
          ) {
            return "chart-vendor";
          }
        },
      },
    },
  },
  }

});
// export default defineConfig({
//   // base: "/",
//    base: mode === 'production' ? '/vue3-manage-system/' : '/';
//     // base: '/vue3-manage-system/',  // 👈 加上这一行，路径是你的仓库名 为了让github pages能访问静态资源
 
// });
