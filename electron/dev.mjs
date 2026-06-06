import { spawn } from 'node:child_process'
import process from 'node:process'
import waitOn from 'wait-on'

const VITE_URL = 'http://localhost:5173'
const isWin = process.platform === 'win32'
const npxCmd = isWin ? 'npx.cmd' : 'npx'

function spawnProc(command, args, name) {
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: isWin,
    env: {
      ...process.env,
      // Avoid noisy console attaching issues on Windows.
      ELECTRON_NO_ATTACH_CONSOLE: '1',
    },
  })
  proc.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`)
      process.exit(code)
    }
  })
  return proc
}

const vite = spawnProc(npxCmd, ['vite', '--port', '5173'], 'vite')

await waitOn({
  resources: [VITE_URL],
  timeout: 60_000,
  validateStatus: (status) => status >= 200 && status < 500,
})

const electron = spawnProc(npxCmd, ['electron', '.'], 'electron')

function shutdown() {
  try { electron.kill() } catch {}
  try { vite.kill() } catch {}
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

