import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { nowStamp } from '../data'
import type { Experiment } from '../types'
import './EditExperiment.css'

export function EditExperiment() {
  const { labId, experimentId } = useParams<{ labId: string; experimentId: string }>()
  const { currentUser, data, setData } = useApp()
  const navigate = useNavigate()

  const lab = useMemo(() => data.labs.find((l) => l.id === labId) || null, [data.labs, labId])
  const experiment = useMemo(() => {
    if (!lab || !experimentId) return null
    return lab.experiments.find((e) => e.id === experimentId) || null
  }, [lab, experimentId])

  const [title, setTitle] = useState(() => experiment?.title || '')
  const [description, setDescription] = useState(() => experiment?.description || '')
  const [expectedOutput, setExpectedOutput] = useState(() => experiment?.expectedOutput || '')
  const [hints, setHints] = useState<string[]>(() => (experiment?.hints?.length ? experiment.hints : ['']))
  const [helperLinks, setHelperLinks] = useState<string[]>(() =>
    experiment?.helperLinks?.length ? experiment.helperLinks : [''],
  )

  if (!currentUser || currentUser.role !== 'teacher') return null

  if (!lab || !experiment) {
    return (
      <div className="edit-experiment-page">
        <div className="page-header">
          <h1>Edit Experiment</h1>
          <p className="muted">Experiment not found</p>
        </div>
      </div>
    )
  }

  const isTeacherAllowed = currentUser.labIds?.includes(lab.id)
  if (!isTeacherAllowed) {
    return (
      <div className="edit-experiment-page">
        <div className="page-header">
          <h1>Edit Experiment</h1>
          <p className="muted">You are not assigned to this lab</p>
        </div>
      </div>
    )
  }

  const addHint = () => setHints((prev) => [...prev, ''])
  const removeHint = (idx: number) => setHints((prev) => prev.filter((_, i) => i !== idx))
  const updateHint = (idx: number, value: string) => {
    setHints((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  const addHelperLink = () => setHelperLinks((prev) => [...prev, ''])
  const removeHelperLink = (idx: number) => setHelperLinks((prev) => prev.filter((_, i) => i !== idx))
  const updateHelperLink = (idx: number, value: string) => {
    setHelperLinks((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !description.trim() || !expectedOutput.trim()) {
      alert('Please fill in all required fields')
      return
    }

    const updated: Experiment = {
      id: experiment.id,
      title: title.trim(),
      description: description.trim(),
      expectedOutput: expectedOutput.trim(),
      hints: hints.map((h) => h.trim()).filter(Boolean),
      helperLinks: helperLinks.map((l) => l.trim()).filter(Boolean),
    }

    setData((prev) => ({
      ...prev,
      labs: prev.labs.map((l) =>
        l.id === lab.id
          ? {
              ...l,
              experiments: l.experiments.map((e) => (e.id === experiment.id ? updated : e)),
            }
          : l,
      ),
    }))

    alert('Experiment updated')
    navigate('/experiments')
  }

  const handleDelete = () => {
    const ok = confirm(`Delete experiment ${experiment.title}? This will remove related submissions.`)
    if (!ok) return

    setData((prev) => {
      const submissionsToDelete = prev.submissions.filter((s) => s.experimentId === experiment.id)
      const nextSubmissionFiles = { ...prev.submissionFiles }
      for (const s of submissionsToDelete) {
        delete nextSubmissionFiles[s.id]
      }

      return {
        ...prev,
        labs: prev.labs.map((l) =>
          l.id === lab.id ? { ...l, experiments: l.experiments.filter((e) => e.id !== experiment.id) } : l,
        ),
        submissions: prev.submissions.filter((s) => s.experimentId !== experiment.id),
        submissionFiles: nextSubmissionFiles,
      }
    })

    alert('Experiment deleted')
    navigate('/experiments')
  }

  return (
    <div className="edit-experiment-page">
      <div className="page-header">
        <h1>Edit Experiment</h1>
        <p className="muted">
          Lab: <strong>{lab.title}</strong> | Last change stored locally ({nowStamp()})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="experiment-form">
        <div className="form-section">
          <label>
            Experiment Title <span className="required">*</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
        </div>

        <div className="form-section">
          <label>
            Description <span className="required">*</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
          </label>
        </div>

        <div className="form-section">
          <label>
            Expected Output <span className="required">*</span>
            <input value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} required />
          </label>
        </div>

        <div className="form-section">
          <label>
            Hints
            <div className="hints-container">
              {hints.map((hint, idx) => (
                <div key={idx} className="hint-item">
                  <input value={hint} onChange={(e) => updateHint(idx, e.target.value)} placeholder={`Hint ${idx + 1}`} />
                  {hints.length > 1 && (
                    <button type="button" onClick={() => removeHint(idx)} className="remove-btn">
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addHint} className="add-btn">
                + Add Hint
              </button>
            </div>
          </label>
        </div>

        <div className="form-section">
          <label>
            Helper Links
            <div className="links-container">
              {helperLinks.map((link, idx) => (
                <div key={idx} className="link-item">
                  <input value={link} onChange={(e) => updateHelperLink(idx, e.target.value)} placeholder="https://example.com" />
                  {helperLinks.length > 1 && (
                    <button type="button" onClick={() => removeHelperLink(idx)} className="remove-btn">
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addHelperLink} className="add-btn">
                + Add Link
              </button>
            </div>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/experiments')} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleDelete} className="btn-danger">
            Delete Experiment
          </button>
          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
