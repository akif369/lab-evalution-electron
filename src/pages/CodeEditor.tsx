import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { uid, nowStamp } from '../data'
import type { TerminalEntry } from '../types'
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

  const [draftValue, setDraftValue] = useState('')
  const [terminal, setTerminal] = useState<TerminalEntry[]>([
    { id: uid('term'), message: 'Terminal ready', level: 'info' },
  ])
  const [editorWarning, setEditorWarning] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/dashboard')
      return
    }

    if (!selectedExperiment) {
      navigate('/experiments')
      return
    }

    // Load existing draft if any
    const existingSubmission = data.submissions.find(
      (s) => s.studentId === currentUser.id && s.experimentId === experimentId,
    )
    if (existingSubmission) {
      // In a real app, load code from backend
      setDraftValue('// Your code will be loaded here...')
    }
  }, [currentUser, selectedExperiment, experimentId, navigate, data.submissions])

  const preventPaste = (event: React.ClipboardEvent | React.DragEvent | React.KeyboardEvent) => {
    event.preventDefault()
    setEditorWarning('Copy/paste and drag-drop are disabled to protect evaluation integrity.')
    setTimeout(() => setEditorWarning(null), 3000)
  }

  const appendTerminal = (entry: TerminalEntry) =>
    setTerminal((prev) => [...prev.slice(-9), entry])

  const saveDraft = async (isSubmit: boolean) => {
    if (!currentUser || currentUser.role !== 'student' || !selectedExperiment) return

    setStatusMessage(isSubmit ? 'Submitting to server...' : 'Saving draft to server...')
    appendTerminal({ id: uid('term'), message: 'Contacting backend (placeholder)...', level: 'info' })

    if (window.electronAPI?.uploadCode) {
      await window.electronAPI.uploadCode({
        studentId: currentUser.id,
        experimentId: selectedExperiment.id,
        code: draftValue,
        submitted: isSubmit,
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

    appendTerminal({
      id: uid('term'),
      message: isSubmit ? 'Submitted. Backend will validate output.' : 'Draft saved (placeholder).',
      level: 'success',
    })
    setStatusMessage(null)
  }

  const runCode = () => {
    appendTerminal({ id: uid('term'), message: 'Running code in sandbox...', level: 'info' })
    setTimeout(() => {
      appendTerminal({
        id: uid('term'),
        message: 'Execution finished. Check backend validation results.',
        level: 'success',
      })
    }, 800)
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
        <div className="editor-sidebar">
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

        <div className="editor-main">
          <div className="editor-header">
            <div>
              <h2>Code Editor</h2>
              <p className="muted small">
                Paste, drag-drop and Ctrl/Cmd+V are blocked by policy. Type code manually.
              </p>
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

          <textarea
            className="code-editor"
            spellCheck={false}
            value={draftValue}
            placeholder="// Start coding your solution..."
            onChange={(e) => setDraftValue(e.target.value)}
            onPaste={preventPaste}
            onDrop={preventPaste}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') preventPaste(e)
            }}
          />

          {editorWarning && <div className="alert warning">{editorWarning}</div>}
          {statusMessage && <div className="status-message">{statusMessage}</div>}

          <div className="terminal-section">
            <div className="terminal-header">
              <h4>Terminal (Simulated)</h4>
              <button onClick={runCode} className="btn-secondary">
                Run / Test
              </button>
            </div>
            <div className="terminal">
              {terminal.map((entry) => (
                <div key={entry.id} className={`terminal-line ${entry.level}`}>
                  {entry.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
