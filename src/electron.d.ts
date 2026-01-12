export {}

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>
      uploadCode: (
        payload: Record<string, unknown>,
      ) => Promise<{ ok: boolean; receivedAt: number }>
    }
  }
}
