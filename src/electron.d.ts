export {}

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>
      uploadCode: (payload: {
        studentId: string
        experimentId: string
        code: string
        submitted: boolean
        files?: Array<{ name: string; content: string; type: string }>
      }) => Promise<{ ok: boolean; receivedAt: number }>
      executeCommand: (payload: {
        command: string
        cwd?: string
        files?: Array<{ name: string; content: string; type: string; path: string }>
        sessionId?: string
      }) => Promise<{
        stdout: string
        stderr: string
        code: number | null
        success: boolean
        error?: string
      }>
    }
  }
}
