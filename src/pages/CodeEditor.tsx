import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { uid, nowStamp } from '../data'
import { FileExplorer } from '../components/FileExplorer'
import { Terminal } from '../components/Terminal'
import type { TerminalEntry, ProjectFile } from '../types'
import './CodeEditor.css'

export function CodeEditor() {
  const { labId, experimentId } = useParams<{ labId: string; experimentId: string }>()
  const { currentUser, data, setData } = useApp()
  const navigate = useNavigate()

  const selectedLab = useMemo(
    () => data.labs.find((l) => l.id === labId),
    [data.labs, labId],
  )
  const selectedExperiment = useMemo(() => {
    return selectedLab?.experiments.find((exp) => exp.id === experimentId)
  }, [selectedLab, experimentId])

  const [files, setFiles] = useState<ProjectFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [terminal, setTerminal] = useState<TerminalEntry[]>([])
  const [editorWarning, setEditorWarning] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Initialize files for this experiment
  useEffect(() => {
    if (!selectedExperiment || !currentUser) return

    const storageKey = `files_${currentUser.id}_${experimentId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFiles(parsed)
        if (parsed.length > 0 && !activeFileId) {
          const firstFile = parsed.find((f: ProjectFile) => f.type === 'file')
          if (firstFile) setActiveFileId(firstFile.id)
        }
      } catch {
        // Invalid saved data, use defaults
      }
    } else {
      // Create default files
      const defaultFiles: ProjectFile[] = [
        {
          id: uid('file'),
          name: 'main.js',
          content: '// Start coding your solution here...\n',
          type: 'file',
          path: 'main.js',
        },
      ]
      setFiles(defaultFiles)
      setActiveFileId(defaultFiles[0].id)
    }
  }, [selectedExperiment, experimentId, currentUser])

  // Save files to localStorage
  useEffect(() => {
    if (!currentUser || !experimentId || files.length === 0) return
    const storageKey = `files_${currentUser.id}_${experimentId}`
    localStorage.setItem(storageKey, JSON.stringify(files))
  }, [files, currentUser, experimentId])

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/dashboard')
      return
    }

    if (!selectedExperiment) {
      navigate('/experiments')
      return
    }
  }, [currentUser, selectedExperiment, navigate])

  const activeFile = useMemo(() => files.find((f) => f.id === activeFileId), [files, activeFileId])

  const preventPaste = (event: React.ClipboardEvent | React.DragEvent | React.KeyboardEvent) => {
    event.preventDefault()
    setEditorWarning('Copy/paste and drag-drop are disabled to protect evaluation integrity.')
    setTimeout(() => setEditorWarning(null), 3000)
  }

  const appendTerminal = (message: string, level: TerminalEntry['level'] = 'info') => {
    if (message.trim() === '') return // Skip empty messages
    const entry: TerminalEntry = { id: uid('term'), message, level }
    setTerminal((prev) => [...prev.slice(-99), entry])
  }

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId)
  }

  const handleFileCreate = (name: string) => {
    const fileName = name.includes('.') ? name : `${name}.js`
    const newFile: ProjectFile = {
      id: uid('file'),
      name: fileName,
      content: '',
      type: 'file',
      path: fileName,
    }
    setFiles((prev) => [...prev, newFile])
    setActiveFileId(newFile.id)
    appendTerminal(`Created file: ${fileName}`, 'success')
  }

  const handleFileDelete = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      if (activeFileId === fileId) {
        const remaining = files.filter((f) => f.id !== fileId && f.type === 'file')
        setActiveFileId(remaining.length > 0 ? remaining[0].id : null)
      }
      appendTerminal(`Deleted file: ${file.name}`, 'info')
    }
  }

  const handleFolderCreate = (name: string) => {
    const newFolder: ProjectFile = {
      id: uid('folder'),
      name,
      content: '',
      type: 'folder',
      path: name,
    }
    setFiles((prev) => [...prev, newFolder])
    appendTerminal(`Created folder: ${name}`, 'success')
  }

  const updateFileContent = (fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content } : f)),
    )
  }

  const handleTerminalExecute = async (command: string, filesForTerminal: ProjectFile[]) => {
    const cmd = command.trim()

    if (cmd === 'clear' || cmd === 'cls') {
      setTerminal([{ id: uid('term'), message: '', level: 'info' }])
      return
    }

    // Check if Electron API is available
    if (!window.electronAPI?.executeCommand) {
      appendTerminal(
        'ERROR: Electron API not available. Please run this application in Electron, not in a browser.',
        'error',
      )
      console.error('Electron API not available:', window.electronAPI)
      return
    }

    // Execute real command via Electron
    try {
      const sessionId = `user-${currentUser?.id}-exp-${experimentId}`
      const result = await window.electronAPI.executeCommand({
        command: cmd,
        files: filesForTerminal.filter((f) => f.type === 'file'),
        sessionId,
      })

      // Show stdout
      if (result.stdout && result.stdout.trim()) {
        appendTerminal(result.stdout, result.success ? 'success' : 'info')
      }

      // Show stderr
      if (result.stderr && result.stderr.trim()) {
        appendTerminal(result.stderr, 'error')
      }

      // Show exit code if non-zero and no stderr
      if (result.code !== null && result.code !== 0 && !result.stderr && !result.stdout) {
        appendTerminal(`Process exited with code ${result.code}`, 'error')
      }

      // If there was an error in the result object
      if (result.error) {
        appendTerminal(`ERROR: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Command execution error:', error)
      appendTerminal(
        `ERROR: ${error instanceof Error ? error.message : 'Command execution failed'}`,
        'error',
      )
    }
  }

  const saveDraft = async (isSubmit: boolean) => {
    if (!currentUser || currentUser.role !== 'student' || !selectedExperiment) return

    setStatusMessage(isSubmit ? 'Submitting to server...' : 'Saving draft to server...')
    appendTerminal('Contacting backend (placeholder)...', 'info')

    const allCode = files
      .filter((f) => f.type === 'file')
      .map((f) => `// ${f.name}\n${f.content}`)
      .join('\n\n')

    if (window.electronAPI?.uploadCode) {
      await window.electronAPI.uploadCode({
        studentId: currentUser.id,
        experimentId: selectedExperiment.id,
        code: allCode,
        submitted: isSubmit,
        files: files.filter((f) => f.type === 'file'),
      })
    }

    setData((prev) => {
      const existing = prev.submissions.find(
        (s) => s.studentId === currentUser.id && s.experimentId === selectedExperiment.id,
      )
      if (existing) {
        return {
          ...prev,
          submissions: prev.submissions.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  status: isSubmit ? 'submitted' : 'draft',
                  lastSaved: nowStamp(),
                }
              : s,
          ),
        }
      }
      return {
        ...prev,
        submissions: [
          ...prev.submissions,
          {
            id: uid('sub'),
            studentId: currentUser.id,
            experimentId: selectedExperiment.id,
            status: isSubmit ? 'submitted' : 'draft',
            lastSaved: nowStamp(),
          },
        ],
      }
    })

    appendTerminal(
      isSubmit ? 'Submitted. Backend will validate output.' : 'Draft saved (placeholder).',
      'success',
    )
    setStatusMessage(null)
  }

  if (!selectedExperiment || !currentUser || currentUser.role !== 'student') {
    return null
  }

  const submission = data.submissions.find(
    (s) => s.studentId === currentUser.id && s.experimentId === experimentId,
  )

  return (
    <div className="code-editor-page">
      <div className="editor-layout">
        <div className="editor-left-panel">
          <div className="info-sidebar">
            <div className="sidebar-section">
              <h3>{selectedExperiment.title}</h3>
              <p className="muted">{selectedExperiment.description}</p>
            </div>

            <div className="sidebar-section">
              <h4>Expected Output</h4>
              <p className="muted small">{selectedExperiment.expectedOutput}</p>
            </div>

            <div className="sidebar-section">
              <h4>Hints & Helpers</h4>
              <ul className="hints-list">
                {selectedExperiment.hints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
              {selectedExperiment.helperLinks && selectedExperiment.helperLinks.length > 0 && (
                <div className="helper-links">
                  <strong>Links:</strong>
                  {selectedExperiment.helperLinks.map((link, idx) => (
                    <a key={idx} href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {submission && (
              <div className="sidebar-section">
                <h4>Status</h4>
                <div className={`status-badge ${submission.status}`}>
                  {submission.status}
                </div>
                {submission.score !== undefined && (
                  <div className="score">Score: {submission.score}/100</div>
                )}
                <div className="muted small">Last saved: {submission.lastSaved}</div>
              </div>
            )}
          </div>

          <div className="file-explorer-panel">
            <FileExplorer
              files={files}
              activeFileId={activeFileId}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              onFolderCreate={handleFolderCreate}
            />
          </div>
        </div>

        <div className="editor-main">
          <div className="editor-header">
            <div className="editor-title">
              {activeFile ? (
                <>
                  <span className="file-icon">{getFileIcon(activeFile.name)}</span>
                  <span className="file-name">{activeFile.name}</span>
                </>
              ) : (
                <span>No file selected</span>
              )}
            </div>
            <div className="editor-actions">
              <button onClick={() => saveDraft(false)} className="btn-secondary">
                Save Draft
              </button>
              <button onClick={() => saveDraft(true)} className="btn-primary">
                Submit for Validation
              </button>
            </div>
          </div>

          {activeFile ? (
            <textarea
              className="code-editor"
              spellCheck={false}
              value={activeFile.content}
              placeholder="// Start coding your solution..."
              onChange={(e) => updateFileContent(activeFile.id, e.target.value)}
              onPaste={preventPaste}
              onDrop={preventPaste}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') preventPaste(e)
              }}
            />
          ) : (
            <div className="no-file-selected">
              <p>Select a file from the file explorer to start coding</p>
            </div>
          )}

          {editorWarning && <div className="alert warning">{editorWarning}</div>}
          {statusMessage && <div className="status-message">{statusMessage}</div>}

          <div className="terminal-panel">
            <Terminal
              files={files}
              onExecute={(message) => {
                // Append message to terminal output
                appendTerminal(message, 'info')
              }}
              entries={terminal}
              onRealExecute={handleTerminalExecute}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    js: '📜',
    ts: '📘',
    jsx: '⚛️',
    tsx: '⚛️',
    py: '🐍',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    html: '🌐',
    css: '🎨',
    json: '📋',
    md: '📝',
    txt: '📄',
  }
  return iconMap[ext || ''] || '📄'
}
