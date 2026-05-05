import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

const getVersion = () => {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || tryGit('rev-parse HEAD') || 'dev').slice(0, 7)
  const count = process.env.VERCEL_GIT_COMMIT_COUNT || tryGit('rev-list --count HEAD') || '?'
  const date = new Date().toISOString().slice(0, 10)
  return { sha, count, date }
}

const tryGit = (args) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}

const v = getVersion()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(`v0.0.${v.count}`),
    __APP_SHA__: JSON.stringify(v.sha),
    __APP_BUILD_DATE__: JSON.stringify(v.date),
  },
})
