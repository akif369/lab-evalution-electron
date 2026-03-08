import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  createVivaQuestion,
  deleteVivaQuestion,
  generateVivaQuestions,
  getVivaQuestions,
  isApiError,
  updateVivaQuestion,
} from '../api/client'
import type { VivaQuestionItem, VivaQuestionSet } from '../types'
import './VivaQuestions.css'

const QUESTIONS_PER_SET = 5

const blankQuestion = (): VivaQuestionItem => ({
  question: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
  explanation: '',
  difficulty: 'medium',
})

const blankSetQuestions = (): VivaQuestionItem[] => Array.from({ length: QUESTIONS_PER_SET }, () => blankQuestion())

const isQuestionValid = (row: VivaQuestionItem) => {
  const validOptions = row.options.map((opt) => opt.trim()).filter(Boolean)
  if (!row.question.trim()) return false
  if (validOptions.length < 2) return false
  return row.correctOptionIndex >= 0 && row.correctOptionIndex < row.options.length
}

export function VivaQuestions() {
  const { currentUser, authToken, data } = useApp()
  const [selectedLabId, setSelectedLabId] = useState('')
  const [selectedExperimentId, setSelectedExperimentId] = useState('')
  const [sets, setSets] = useState<VivaQuestionSet[]>([])
  const [customSet, setCustomSet] = useState<VivaQuestionItem[]>(blankSetQuestions)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [editingSet, setEditingSet] = useState<VivaQuestionItem[]>(blankSetQuestions)
  const [generateSetCount, setGenerateSetCount] = useState(1)
  const [topicsInput, setTopicsInput] = useState('')
  const [pendingDeleteSet, setPendingDeleteSet] = useState<VivaQuestionSet | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; text: string; tone: 'info' | 'success' | 'error' }>({
    open: false,
    text: '',
    tone: 'info',
  })
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const canAccess = currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod' || currentUser.role === 'admin')
  if (!canAccess) return null

  const visibleLabs =
    currentUser.role === 'teacher'
      ? data.labs.filter((lab) => currentUser.labIds?.includes(lab.id))
      : data.labs

  const selectedLab = visibleLabs.find((lab) => lab.id === selectedLabId) || visibleLabs[0]
  const availableExperiments = selectedLab?.experiments || []
  const selectedExperiment = availableExperiments.find((exp) => exp.id === selectedExperimentId) || availableExperiments[0]

  const resetNotice = (nextMessage?: string) => {
    setError(null)
    setMessage(nextMessage || null)
  }

  const showSnackbar = (text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setSnackbar({ open: true, text, tone })
  }

  useEffect(() => {
    if (!snackbar.open || pendingDeleteSet) return
    const timer = window.setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }))
    }, 3200)
    return () => window.clearTimeout(timer)
  }, [snackbar.open, pendingDeleteSet])

  const loadSets = async () => {
    if (!authToken || !selectedExperiment) {
      setSets([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await getVivaQuestions(authToken, selectedExperiment.id)
      setSets(rows)
    } catch (err) {
      setSets([])
      setError(isApiError(err) ? err.message : 'Failed to load viva sets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSets()
  }, [authToken, selectedExperiment?.id])

  const updateQuestionField = (
    source: 'custom' | 'edit',
    questionIndex: number,
    patch: Partial<VivaQuestionItem>,
  ) => {
    const setter = source === 'custom' ? setCustomSet : setEditingSet
    setter((prev) => prev.map((row, idx) => (idx === questionIndex ? { ...row, ...patch } : row)))
  }

  const updateOptionField = (
    source: 'custom' | 'edit',
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const setter = source === 'custom' ? setCustomSet : setEditingSet
    setter((prev) =>
      prev.map((row, qIdx) => {
        if (qIdx !== questionIndex) return row
        return {
          ...row,
          options: row.options.map((option, oIdx) => (oIdx === optionIndex ? value : option)),
        }
      }),
    )
  }

  const addCustomSet = async () => {
    if (!authToken || !selectedExperiment) return
    if (!customSet.every(isQuestionValid)) {
      setError(`Each set must have ${QUESTIONS_PER_SET} valid questions.`)
      return
    }

    setBusy(true)
    resetNotice()
    try {
      const created = await createVivaQuestion(authToken, selectedExperiment.id, { questions: customSet })
      setSets((prev) => [...prev, created].sort((a, b) => a.setNumber - b.setNumber))
      setCustomSet(blankSetQuestions())
      setMessage(`Custom set ${created.setNumber} added.`)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to add custom set')
    } finally {
      setBusy(false)
    }
  }

  const generateSets = async () => {
    if (!authToken || !selectedExperiment) return
    const safeCount = Math.max(1, Math.min(10, Number(generateSetCount) || 1))
    const topics = topicsInput
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean)

    setBusy(true)
    resetNotice()
    try {
      const response = await generateVivaQuestions(authToken, selectedExperiment.id, {
        setCount: safeCount,
        topics,
      })
      setSets((prev) => [...prev, ...response.sets].sort((a, b) => a.setNumber - b.setNumber))
      setMessage(response.meta?.message || `Generated ${response.sets.length} set(s).`)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to generate viva sets')
    } finally {
      setBusy(false)
    }
  }

  const startEditSet = (row: VivaQuestionSet) => {
    setEditingSetId(row.id)
    setEditingSet(row.questions.map((item) => ({ ...item, options: [...item.options] })))
  }

  const saveSetEdit = async () => {
    if (!authToken || !editingSetId) return
    if (!editingSet.every(isQuestionValid)) {
      setError(`Set update requires ${QUESTIONS_PER_SET} valid questions.`)
      return
    }

    setBusy(true)
    resetNotice()
    try {
      const updated = await updateVivaQuestion(authToken, editingSetId, { questions: editingSet })
      setSets((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      setEditingSetId(null)
      setMessage(`Set ${updated.setNumber} updated.`)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to update set')
    } finally {
      setBusy(false)
    }
  }

  const requestDeleteSet = (row: VivaQuestionSet) => {
    setPendingDeleteSet(row)
    showSnackbar(`Delete Set ${row.setNumber}?`, 'info')
  }

  const cancelDeleteSet = () => {
    setPendingDeleteSet(null)
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const confirmDeleteSet = async () => {
    if (!authToken || !pendingDeleteSet) return

    setBusy(true)
    resetNotice()
    try {
      await deleteVivaQuestion(authToken, pendingDeleteSet.id)
      setSets((prev) => prev.filter((row) => row.id !== pendingDeleteSet.id))
      setMessage('Viva set deleted.')
      setPendingDeleteSet(null)
      showSnackbar('Viva set deleted', 'success')
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to delete set')
      showSnackbar('Failed to delete viva set', 'error')
    } finally {
      setBusy(false)
    }
  }

  const renderQuestionEditor = (source: 'custom' | 'edit', question: VivaQuestionItem, questionIndex: number) => (
    <div className="viva-question-block" key={`${source}-${questionIndex}`}>
      <h4>Question {questionIndex + 1}</h4>
      <label>
        Question
        <textarea
          rows={2}
          value={question.question}
          onChange={(e) => updateQuestionField(source, questionIndex, { question: e.target.value })}
        />
      </label>
      <div className="viva-options-grid">
        {question.options.map((option, optionIndex) => (
          <label key={`${source}-${questionIndex}-opt-${optionIndex}`}>
            Option {optionIndex + 1}
            <input
              value={option}
              onChange={(e) => updateOptionField(source, questionIndex, optionIndex, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="viva-inline">
        <label>
          Correct Option (0-based index)
          <input
            type="number"
            min={0}
            max={question.options.length - 1}
            value={question.correctOptionIndex}
            onChange={(e) =>
              updateQuestionField(source, questionIndex, {
                correctOptionIndex: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Difficulty
          <select
            value={question.difficulty}
            onChange={(e) =>
              updateQuestionField(source, questionIndex, {
                difficulty: e.target.value as VivaQuestionItem['difficulty'],
              })
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      <label>
        Explanation
        <textarea
          rows={2}
          value={question.explanation}
          onChange={(e) => updateQuestionField(source, questionIndex, { explanation: e.target.value })}
        />
      </label>
    </div>
  )

  return (
    <div className="viva-page">
      <div className="page-header">
        <h1>Viva Question Sets</h1>
        <p className="muted">Set-wise viva: each set has exactly 5 questions.</p>
      </div>

      <div className="viva-filters">
        <div className="viva-filter-group">
          <label>Lab</label>
          <select
            value={selectedLabId || selectedLab?.id || ''}
            onChange={(e) => {
              setSelectedLabId(e.target.value)
              setSelectedExperimentId('')
            }}
          >
            {visibleLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.title}
              </option>
            ))}
          </select>
        </div>
        <div className="viva-filter-group">
          <label>Experiment</label>
          <select value={selectedExperimentId || selectedExperiment?.id || ''} onChange={(e) => setSelectedExperimentId(e.target.value)}>
            {availableExperiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="viva-panels">
        <section className="viva-card">
          <h2>AI Generate Sets</h2>
          <div className="viva-inline">
            <label>
              Number of Sets
              <input
                type="number"
                min={1}
                max={10}
                value={generateSetCount}
                onChange={(e) => setGenerateSetCount(Number(e.target.value))}
              />
            </label>
            <button className="btn-primary" onClick={generateSets} disabled={!selectedExperiment || busy}>
              {busy ? 'Generating...' : 'Generate Set(s)'}
            </button>
          </div>
          <label>
            Topics (comma separated)
            <input
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="e.g. arrays, loops, functions, recursion"
            />
          </label>
        </section>

        <section className="viva-card">
          <h2>Add Custom Set ({QUESTIONS_PER_SET} Questions)</h2>
          <div className="viva-set-editor">{customSet.map((row, idx) => renderQuestionEditor('custom', row, idx))}</div>
          <div className="viva-actions">
            <button className="btn-primary" onClick={addCustomSet} disabled={!selectedExperiment || busy}>
              Add Custom Set
            </button>
          </div>
        </section>
      </div>

      {error && <div className="viva-alert error">{error}</div>}
      {message && <div className="viva-alert success">{message}</div>}

      <div className="viva-list">
        {loading ? (
          <div className="empty-state">Loading sets...</div>
        ) : sets.length === 0 ? (
          <div className="empty-state">No viva sets yet for this experiment.</div>
        ) : (
          sets.map((row) => {
            const isEditing = editingSetId === row.id
            const viewQuestions = isEditing ? editingSet : row.questions
            return (
              <article key={row.id} className="viva-item">
                <div className="viva-item-header">
                  <div>
                    <strong>Set {row.setNumber}</strong>
                    <div className="muted small">
                      {row.source.toUpperCase()} | {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="viva-item-actions">
                    {isEditing ? (
                      <>
                        <button className="btn-secondary" onClick={() => setEditingSetId(null)} disabled={busy}>
                          Cancel
                        </button>
                        <button className="btn-primary" onClick={saveSetEdit} disabled={busy}>
                          Save Set
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-secondary" onClick={() => startEditSet(row)} disabled={busy}>
                          Edit Set
                        </button>
                        <button className="btn-danger" onClick={() => requestDeleteSet(row)} disabled={busy}>
                          Delete Set
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="viva-set-view">
                  {viewQuestions.map((question, qIndex) =>
                    isEditing ? (
                      renderQuestionEditor('edit', question, qIndex)
                    ) : (
                      <div className="viva-question-block" key={`${row.id}-${qIndex}`}>
                        <h4>
                          Q{qIndex + 1}. {question.question}
                        </h4>
                        <ol type="A" className="viva-option-list">
                          {question.options.map((option, optionIndex) => (
                            <li key={`${row.id}-${qIndex}-opt-${optionIndex}`} className={question.correctOptionIndex === optionIndex ? 'correct' : ''}>
                              {option}
                            </li>
                          ))}
                        </ol>
                        <div className="muted small">
                          Difficulty: {question.difficulty.toUpperCase()} | Correct: Option {question.correctOptionIndex + 1}
                        </div>
                        <div className="viva-explanation">
                          <strong>Explanation:</strong> {question.explanation || 'Not provided'}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>

      <div className={`viva-snackbar ${snackbar.tone} ${snackbar.open ? 'show' : ''}`}>
        <span>{snackbar.text}</span>
        {pendingDeleteSet && (
          <div className="viva-snackbar-actions">
            <button className="btn-secondary" onClick={cancelDeleteSet} disabled={busy}>
              Cancel
            </button>
            <button className="btn-danger" onClick={confirmDeleteSet} disabled={busy}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
