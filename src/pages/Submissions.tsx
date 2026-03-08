import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Submission } from '../types'
import { getExperimentSubmissions, isApiError } from '../api/client'
import './Submissions.css'

export function Submissions() {
  const { currentUser, authToken, data } = useApp()
  const [selectedLabId, setSelectedLabId] = useState('')
  const [selectedExperimentId, setSelectedExperimentId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'validated'>('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Array<{
    submission: Submission
    studentName: string
    studentId: string
    studentRollNo: string
  }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!currentUser || currentUser.role !== 'teacher') return null

  const availableLabs = currentUser.labIds ? data.labs.filter((l) => currentUser.labIds?.includes(l.id)) : []
  const selectedLab = availableLabs.find((l) => l.id === selectedLabId) || availableLabs[0]
  const availableExperiments = selectedLab ? selectedLab.experiments : []

  const selectedExperiment =
    availableExperiments.find((e) => e.id === selectedExperimentId) || availableExperiments[0]

  useEffect(() => {
    if (!authToken || !selectedExperiment) {
      setRows([])
      return
    }

    let isCancelled = false
    setLoading(true)
    setError(null)

    getExperimentSubmissions(authToken, selectedExperiment.id)
      .then((response) => {
        if (isCancelled) return
        setRows(
          response.map((row) => ({
            submission: row.submission,
            studentName: row.student.name || row.submission.studentId,
            studentId: row.student.id || row.submission.studentId,
            studentRollNo: row.student.rollNo || '',
          })),
        )
      })
      .catch((err) => {
        if (isCancelled) return
        setRows([])
        setError(isApiError(err) ? err.message : 'Failed to load submissions')
      })
      .finally(() => {
        if (!isCancelled) setLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [authToken, selectedExperiment])

  const filteredRows = rows.filter((row) => {
    const statusOk = statusFilter === 'all' ? true : row.submission.status === statusFilter
    const query = search.trim().toLowerCase()
    const searchOk = query
      ? row.studentName.toLowerCase().includes(query) ||
        row.studentRollNo.toLowerCase().includes(query) ||
        row.studentId.toLowerCase().includes(query) ||
        row.submission.id.toLowerCase().includes(query)
      : true
    return statusOk && searchOk
  })

  return (
    <div className="submissions-page">
      <div className="page-header">
        <h1>Submissions</h1>
        <p className="muted">AI auto-validates submissions. Teacher reviews and confirms only when needed.</p>
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

        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="validated">Validated</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search Student</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type student name, student ID, or submission ID"
          />
        </div>
      </div>

      <div className="submissions-table">
        {loading ? (
          <div className="empty-state">
            <p>Loading submissions...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : filteredRows.length === 0 ? (
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
                <th>AI Flags</th>
                <th>Last Saved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.submission.id}>
                  <td>
                    <div>{r.studentName}</div>
                    {(r.studentRollNo || r.studentId) && (
                      <div className="muted small">ID: {r.studentRollNo || r.studentId}</div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${r.submission.status}`}>{r.submission.status}</span>
                  </td>
                  <td>{r.submission.score ?? '-'}{r.submission.score !== null && r.submission.score !== undefined ? '/10' : ''}</td>
                  <td>
                    {r.submission.aiEvaluation?.suspectedCheating ? (
                      <span className="risk-chip">High Risk</span>
                    ) : r.submission.aiEvaluation?.mistakeFlags?.length ? (
                      <span className="warn-chip">Needs Review</span>
                    ) : (
                      <span className="ok-chip">Clear</span>
                    )}
                  </td>
                  <td className="muted small">{r.submission.lastSaved}</td>
                  <td className="actions">
                    <Link to={`/grade/${r.submission.id}`} className="btn-primary">
                      Review / Confirm
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
