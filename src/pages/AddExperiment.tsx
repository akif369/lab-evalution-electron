import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { uid } from '../data'
import type { Experiment } from '../types'
import './AddExperiment.css'

export function AddExperiment() {
  const { currentUser, data, setData } = useApp()
  const navigate = useNavigate()
  const [labId, setLabId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  const [hints, setHints] = useState<string[]>([''])
  const [helperLinks, setHelperLinks] = useState<string[]>([''])

  if (!currentUser || currentUser.role !== 'teacher') {
    navigate('/dashboard')
    return null
  }

  const availableLabs = currentUser.labIds
    ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
    : []

  const addHint = () => setHints([...hints, ''])
  const removeHint = (idx: number) => setHints(hints.filter((_, i) => i !== idx))
  const updateHint = (idx: number, value: string) => {
    const newHints = [...hints]
    newHints[idx] = value
    setHints(newHints)
  }

  const addHelperLink = () => setHelperLinks([...helperLinks, ''])
  const removeHelperLink = (idx: number) => setHelperLinks(helperLinks.filter((_, i) => i !== idx))
  const updateHelperLink = (idx: number, value: string) => {
    const newLinks = [...helperLinks]
    newLinks[idx] = value
    setHelperLinks(newLinks)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!labId || !title || !description || !expectedOutput) {
      alert('Please fill in all required fields')
      return
    }

    const newExperiment: Experiment = {
      id: uid('exp'),
      title,
      description,
      expectedOutput,
      hints: hints.filter((h) => h.trim() !== ''),
      helperLinks: helperLinks.filter((l) => l.trim() !== ''),
    }

    setData((prev) => ({
      ...prev,
      labs: prev.labs.map((lab) =>
        lab.id === labId
          ? { ...lab, experiments: [...lab.experiments, newExperiment] }
          : lab,
      ),
    }))

    alert('Experiment added successfully!')
    navigate('/experiments')
  }

  return (
    <div className="add-experiment-page">
      <div className="page-header">
        <h1>Add New Experiment</h1>
      </div>

      <form onSubmit={handleSubmit} className="experiment-form">
        <div className="form-section">
          <label>
            Lab <span className="required">*</span>
            <select value={labId} onChange={(e) => setLabId(e.target.value)} required>
              <option value="">Select a lab</option>
              {availableLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-section">
          <label>
            Experiment Title <span className="required">*</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Process Scheduling Simulator"
              required
            />
          </label>
        </div>

        <div className="form-section">
          <label>
            Description <span className="required">*</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students need to implement..."
              rows={4}
              required
            />
          </label>
        </div>

        <div className="form-section">
          <label>
            Expected Output <span className="required">*</span>
            <input
              type="text"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="e.g., Average waiting time and turnaround time"
              required
            />
          </label>
        </div>

        <div className="form-section">
          <label>
            Hints
            <div className="hints-container">
              {hints.map((hint, idx) => (
                <div key={idx} className="hint-item">
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => updateHint(idx, e.target.value)}
                    placeholder={`Hint ${idx + 1}`}
                  />
                  {hints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHint(idx)}
                      className="remove-btn"
                    >
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
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateHelperLink(idx, e.target.value)}
                    placeholder="https://example.com"
                  />
                  {helperLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHelperLink(idx)}
                      className="remove-btn"
                    >
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
          <button type="submit" className="btn-primary">
            Create Experiment
          </button>
        </div>
      </form>
    </div>
  )
}
