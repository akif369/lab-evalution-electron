import { useState, useRef, useEffect } from 'react'
import type { TerminalEntry, ProjectFile } from '../types'
import './Terminal.css'

interface TerminalProps {
  files: ProjectFile[]
  onExecute: (command: string) => void
  entries: TerminalEntry[]
  onRealExecute?: (command: string, files: ProjectFile[]) => Promise<void>
}

export function Terminal({ files, onExecute, entries, onRealExecute }: TerminalProps) {
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentPath] = useState('~')
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [entries])

  // Keep input focused when terminal mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Check if command tries to edit files
  const isFileEditCommand = (cmd: string): boolean => {
    const lowerCmd = cmd.toLowerCase()
    const editPatterns = [
      /echo\s+.*\s*[>]{1,2}/,  // echo > or >>
      /[>]{1,2}\s*\w+/,         // > or >> to file
      /\|\s*tee\s+/,            // | tee
      /vim\s+\w+/,              // vim file
      /vi\s+\w+/,               // vi file
      /nano\s+\w+/,             // nano file
      /edit\s+\w+/,             // edit file
      /rm\s+\w+/,               // rm file
      /del\s+\w+/,              // del file
      /delete\s+\w+/,           // delete file
      /ren\s+\w+/,              // ren file
      /rename\s+\w+/,           // rename file
      /mv\s+\w+/,               // mv file
      /cp\s+\w+.*\s+\w+/,       // cp file1 file2
      /copy\s+\w+.*\s+\w+/,     // copy file1 file2
    ]
    return editPatterns.some((pattern) => pattern.test(lowerCmd))
  }

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim() || isExecuting) return

    const trimmedCmd = cmd.trim()
    setCommandHistory((prev) => [...prev, trimmedCmd])
    setHistoryIndex(-1)
    setIsExecuting(true)

    // Show command prompt
    const prompt = `${currentPath} $ ${trimmedCmd}`
    onExecute(prompt)

    // Handle clear command
    if (trimmedCmd === 'clear' || trimmedCmd === 'cls') {
      onExecute('clear')
      setIsExecuting(false)
      return
    }

    // Block file editing commands
    if (isFileEditCommand(trimmedCmd)) {
      onExecute(
        'ERROR: File editing/deletion is disabled. Files are read-only in terminal.\n' +
          'Please use the code editor to modify files.',
      )
      setIsExecuting(false)
      return
    }

    // Built-in help
    if (trimmedCmd === 'help') {
      onExecute(
        [
          'Available commands:',
          '- clear / cls : clear the terminal output',
          '- help       : show this help',
          '- Any compile/run commands like `node main.js`, `python main.py`, `gcc main.c`',
          '',
          'Note: File editing and deletion commands are blocked. Use the code editor to change files.',
        ].join('\n'),
      )
      setIsExecuting(false)
      return
    }

    // Execute real command if handler provided
    if (onRealExecute) {
      try {
        await onRealExecute(trimmedCmd, files)
      } catch (error) {
        onExecute(
          `ERROR: ${error instanceof Error ? error.message : 'Command execution failed'}`,
        )
      }
    } else {
      // Fallback to simulated execution
      onExecute(`Command executed. (Simulated - Electron API not available)`)
    }

    setIsExecuting(false)
  }


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(commandHistory[newIndex])
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Basic tab completion for file names
      const parts = input.split(' ')
      const lastPart = parts[parts.length - 1]
      if (lastPart) {
        const matches = files
          .filter((f) => f.name.startsWith(lastPart) && f.type === 'file')
          .map((f) => f.name)
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0]
          setInput(parts.join(' ') + ' ')
        }
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      // Allow Ctrl+C to cancel (though we can't actually cancel running commands easily)
      e.preventDefault()
      if (isExecuting) {
        onExecute('^C')
        setIsExecuting(false)
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      // Block paste into terminal to reduce cheating
      e.preventDefault()
    }
  }

  return (
    <div
      className="terminal-container"
      onClick={() => {
        inputRef.current?.focus()
      }}
    >
      <div className="terminal-tabs">
        <div className="terminal-tab active">
          <span className="terminal-tab-icon">▸</span>
          <span className="terminal-tab-label">Terminal</span>
        </div>
      </div>
      <div className="terminal-content">
        <div className="terminal-output" ref={terminalRef}>
          {entries.length === 0 && (
            <div className="terminal-welcome">
              <div>Terminal ready. Type commands to execute.</div>
              <div className="terminal-hint">Files are read-only. Use the code editor to modify files.</div>
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className={`terminal-line ${entry.level}`}>
              {entry.message.split('\n').map((line, idx) => (
                <div key={idx} className="terminal-line-content">
                  {line}
                </div>
              ))}
            </div>
          ))}
          <div className="terminal-input-line">
            <span className="terminal-prompt">{currentPath} $</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="terminal-input"
              placeholder=""
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  )
}
