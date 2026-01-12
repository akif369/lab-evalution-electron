import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !!process.env.VITE_DEV_SERVER_URL

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1100,
    minHeight: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = pathToFileURL(
      path.join(__dirname, '../dist/index.html'),
    ).toString()
    win.loadURL(indexPath)
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('ping', () => 'pong')

ipcMain.handle('upload-code', async (_event, payload) => {
  // Placeholder stub for a future backend call
  console.info('Code upload request received', payload)
  return { ok: true, receivedAt: Date.now() }
})

// Store temp directories per session to maintain state
const sessionDirs = new Map()

// Terminal execution handler
ipcMain.handle('execute-command', async (_event, { command, cwd, files, sessionId }) => {
  return new Promise((resolve, reject) => {
    // Use session ID or create new one
    const sid = sessionId || `session-${Date.now()}`
    let userTempDir = sessionDirs.get(sid)

    // Create temp directory if it doesn't exist
    const setupDir = async () => {
      if (!userTempDir) {
        userTempDir = path.join(tmpdir(), `lab-eval-${sid}`)
        sessionDirs.set(sid, userTempDir)
        try {
          await fs.mkdir(userTempDir, { recursive: true })
        } catch (error) {
          reject({ error: `Failed to create directory: ${error.message}` })
          return false
        }
      }

      // Write/update files in temp directory
      if (files && Array.isArray(files)) {
        try {
          for (const file of files) {
            if (file.type === 'file') {
              const filePath = path.join(userTempDir, file.name)
              // Create parent directories if needed
              const fileDir = path.dirname(filePath)
              await fs.mkdir(fileDir, { recursive: true })
              await fs.writeFile(filePath, file.content || '', 'utf8')
            }
          }
        } catch (error) {
          reject({ error: `Failed to write files: ${error.message}` })
          return false
        }
      }
      return true
    }

    setupDir().then((success) => {
      if (!success) return

      // Determine shell based on platform
      const isWindows = process.platform === 'win32'
      const shellCmd = isWindows ? 'cmd.exe' : '/bin/bash'
      const shellArgs = isWindows ? ['/c'] : ['-c']

      // Execute command
      const child = spawn(shellCmd, [...shellArgs, command], {
        cwd: userTempDir,
        env: { ...process.env, PATH: process.env.PATH },
        shell: false,
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code,
          success: code === 0,
        })
      })

      child.on('error', (error) => {
        reject({ error: error.message })
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill()
          reject({ error: 'Command execution timeout' })
        }
      }, 30000)
    })
  })
})
