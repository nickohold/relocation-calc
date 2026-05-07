import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const tryGit = (args) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}

// package.json is the single source of truth for the displayed version.
// Bump it when shipping a new version. SHA + build date are diagnostic only.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || tryGit('rev-parse HEAD') || 'dev').slice(0, 7)
const date = new Date().toISOString().slice(0, 10)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
    __APP_SHA__: JSON.stringify(sha),
    __APP_BUILD_DATE__: JSON.stringify(date),
  },
})
