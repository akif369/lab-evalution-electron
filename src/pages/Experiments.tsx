import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './Experiments.css'

export function Experiments() {
  const { currentUser, data } = useApp()
  const [selectedLabId, setSelectedLabId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  if (!currentUser) return null

  const availableLabs =
    currentUser.role === 'student'
      ? currentUser.labIds
        ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
        : []
      : currentUser.role === 'teacher'
        ? currentUser.labIds
          ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
          : []
        : data.labs

  const selectedLab = availableLabs.find((l) => l.id === selectedLabId) || availableLabs[0]

  const filteredExperiments = useMemo(() => {
    if (!selectedLab) return []
    let exps = selectedLab.experiments

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      exps = exps.filter(
        (exp) =>
          exp.title.toLowerCase().includes(query) ||
          exp.description.toLowerCase().includes(query),
      )
    }

    return exps
  }, [selectedLab, searchQuery])

  const getSubmissionStatus = (expId: string) => {
    if (currentUser.role !== 'student') return null
    const sub = data.submissions.find(
      (s) => s.studentId === currentUser.id && s.experimentId === expId,
    )
    return sub?.status || null
  }

  return (
    <div className="experiments-page">
      <div className="page-header">
        <h1>Experiments</h1>
        {currentUser.role === 'teacher' && (
          <Link to="/add-experiment" className="btn-primary">
            Add New Experiment
          </Link>
        )}
      </div>

      <div className="experiments-filters">
        <div className="filter-group">
          <label>Select Lab</label>
          <select
            value={selectedLabId || availableLabs[0]?.id || ''}
            onChange={(e) => setSelectedLabId(e.target.value)}
          >
            {availableLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.title}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {selectedLab && (
        <div className="experiments-content">
          <div className="lab-info">
            <h2>{selectedLab.title}</h2>
            <p className="muted">
              Course: {data.courses.find((c) => c.id === selectedLab.courseId)?.name}
            </p>
          </div>

          {filteredExperiments.length > 0 ? (
            <div className="experiments-grid">
              {filteredExperiments.map((exp) => {
                const status = getSubmissionStatus(exp.id)
                return (
                  <div key={exp.id} className="experiment-card">
                    <div className="experiment-header">
                      <h3>{exp.title}</h3>
                      {status && (
                        <span className={`status-badge ${status}`}>{status}</span>
                      )}
                    </div>
                    <p className="experiment-description">{exp.description}</p>
                    <div className="experiment-meta">
                      <div className="meta-item">
                        <strong>Expected Output:</strong>
                        <span className="muted">{exp.expectedOutput}</span>
                      </div>
                      <div className="meta-item">
                        <strong>Hints:</strong>
                        <span className="muted">{exp.hints.length} available</span>
                      </div>
                    </div>
                    <div className="experiment-actions">
                      <Link
                        to={`/editor/${selectedLab.id}/${exp.id}`}
                        className="btn-primary"
                      >
                        {currentUser.role === 'student' ? 'Start Coding' : 'View Details'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No experiments found{searchQuery && ` matching "${searchQuery}"`}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
