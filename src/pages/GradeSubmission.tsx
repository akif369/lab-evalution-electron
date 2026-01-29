import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { nowStamp } from '../data'
import type { ProjectFile } from '../types'
import './GradeSubmission.css'

export function GradeSubmission() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const { currentUser, data, setData } = useApp()
  const navigate = useNavigate()

  if (!currentUser || currentUser.role !== 'teacher') return null
  if (!submissionId) return null

  const submission = data.submissions.find((s) => s.id === submissionId)
  const student = submission ? data.users.find((u) => u.id === submission.studentId) : null

  const experiment = useMemo(() => {
    if (!submission) return null
    return data.labs.flatMap((l) => l.experiments).find((e) => e.id === submission.experimentId) || null
  }, [data.labs, submission])

  const files: ProjectFile[] = data.submissionFiles[submissionId] || []

  const [score, setScore] = useState<string>(() => (submission?.score !== undefined ? String(submission.score) : ''))
  const [feedback, setFeedback] = useState<string>(() => submission?.feedback || '')

  if (!submission) {
    return (
      <div className="grade-page">
        <div className="page-header">
          <h1>Submission not found</h1>
        </div>
      </div>
    )
  }

  const canValidate = submission.status === 'submitted' || submission.status === 'validated'

  const handleValidate = () => {
    if (!canValidate) {
      alert('Only submitted submissions can be validated')
      return
    }

    const n = score.trim() === '' ? NaN : Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      alert('Score must be a number between 0 and 100')
      return
    }

    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              status: 'validated',
              score: n,
              feedback: feedback.trim() ? feedback.trim() : undefined,
              lastSaved: nowStamp(),
            }
          : s,
      ),
    }))

    alert('Submission validated')
    navigate('/submissions')
  }

  return (
    <div className="grade-page">
      <div className="page-header">
        <h1>Grade Submission</h1>
        <p className="muted">
          Student: <strong>{student?.name || submission.studentId}</strong> | Experiment:{' '}
          <strong>{experiment?.title || submission.experimentId}</strong>
        </p>
      </div>

      <div className="grade-grid">
        <div className="panel">
          <h2>Submitted Files</h2>
          {files.length === 0 ? (
            <p className="muted">No files saved for this submission yet.</p>
          ) : (
            <div className="files-list">
              {files.map((f) => (
                <details key={f.id} className="file-item">
                  <summary>{f.path}</summary>
                  <pre>{f.content}</pre>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Validation</h2>

          <div className="form-group">
            <label>Status</label>
            <div>
              <span className={`status-badge ${submission.status}`}>{submission.status}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Score (0-100)</label>
            <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 92" />
          </div>

          <div className="form-group">
            <label>Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              placeholder="Write feedback for student..."
            />
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => navigate('/submissions')}>
              Back
            </button>
            <button className="btn-primary" onClick={handleValidate}>
              Validate & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
