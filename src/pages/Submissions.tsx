import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './Submissions.css'

export function Submissions() {
  const { currentUser, data } = useApp()
  const [selectedLabId, setSelectedLabId] = useState('')
  const [selectedExperimentId, setSelectedExperimentId] = useState('')

  if (!currentUser || currentUser.role !== 'teacher') return null

  const availableLabs = currentUser.labIds ? data.labs.filter((l) => currentUser.labIds?.includes(l.id)) : []
  const selectedLab = availableLabs.find((l) => l.id === selectedLabId) || availableLabs[0]
  const availableExperiments = selectedLab ? selectedLab.experiments : []

  const selectedExperiment =
    availableExperiments.find((e) => e.id === selectedExperimentId) || availableExperiments[0]

  const rows = useMemo(() => {
    if (!selectedExperiment) return []

    const submissions = data.submissions
      .filter((s) => s.experimentId === selectedExperiment.id)
      .sort((a, b) => (a.lastSaved < b.lastSaved ? 1 : -1))

    return submissions.map((s) => {
      const student = data.users.find((u) => u.id === s.studentId)
      return {
        submission: s,
        studentName: student?.name || s.studentId,
      }
    })
  }, [data.submissions, data.users, selectedExperiment])

  return (
    <div className="submissions-page">
      <div className="page-header">
        <h1>Submissions</h1>
        <p className="muted">Review and validate student submissions</p>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Lab</label>
          <select
            value={selectedLabId || selectedLab?.id || ''}
            onChange={(e) => {
              setSelectedLabId(e.target.value)
              setSelectedExperimentId('')
            }}
          >
            {availableLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.title}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Experiment</label>
          <select
            value={selectedExperimentId || selectedExperiment?.id || ''}
            onChange={(e) => setSelectedExperimentId(e.target.value)}
          >
            {availableExperiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="submissions-table">
        {rows.length === 0 ? (
          <div className="empty-state">
            <p>No submissions found</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Score</th>
                <th>Last Saved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.submission.id}>
                  <td>{r.studentName}</td>
                  <td>
                    <span className={`status-badge ${r.submission.status}`}>{r.submission.status}</span>
                  </td>
                  <td>{r.submission.score ?? '-'}</td>
                  <td className="muted small">{r.submission.lastSaved}</td>
                  <td className="actions">
                    <Link to={`/grade/${r.submission.id}`} className="btn-primary">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
