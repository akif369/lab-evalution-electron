export {}

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>
      ensureWindowFocus: () => Promise<boolean>
      uploadCode: (payload: {
        token: string
        experimentId: string
        status: 'draft' | 'submitted'
        submitted: boolean
        files?: Array<{ id: string; name: string; content: string; type: 'file' | 'folder'; path: string; isReadonly?: boolean }>
        executionResult?: { command?: string; stdout?: string; stderr?: string; exitCode?: number | null }
      }) => Promise<{
        ok: boolean
        receivedAt: number
        submission?: {
          id: string
          studentId: string
          experimentId: string
          status: 'draft' | 'submitted' | 'validated'
          score?: number | null
          submittedAt?: string | null
          aiEvaluation?: Record<string, unknown> | null
          lastSaved: string
          feedback?: string
        }
      }>
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
