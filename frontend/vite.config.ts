import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_USE_MOCK === 'true'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true,
      // Only proxy to backend when not in mock mode
      ...(useMock ? {} : {
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
          '/bot/connect': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
          '/gateway': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
          '/socket.io': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            ws: true,
          }
        }
      })
    }
  }
})
