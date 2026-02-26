import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { ProjectFile } from '../types'
import { getSubmissionById, isApiError, validateSubmission } from '../api/client'
import './GradeSubmission.css'

export function GradeSubmission() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const { currentUser, authToken, data, setData } = useApp()
  const navigate = useNavigate()

  if (!currentUser || currentUser.role !== 'teacher') return null
  if (!submissionId) return null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<{
    id: string
    studentId: string
    experimentId: string
    status: 'draft' | 'submitted' | 'validated'
    score?: number | null
    feedback?: string
    lastSaved: string
  } | null>(null)
  const [studentName, setStudentName] = useState<string>('')
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [score, setScore] = useState<string>('')
  const [feedback, setFeedback] = useState<string>('')

  useEffect(() => {
    if (!authToken) {
      setError('Authentication required. Please login again.')
      setLoading(false)
      return
    }

    let isCancelled = false
    setLoading(true)
    setError(null)

    getSubmissionById(authToken, submissionId)
      .then((response) => {
        if (isCancelled) return
        setSubmission(response.submission)
        setFiles(response.files)
        setStudentName(response.student?.name || response.submission.studentId)
        setScore(
          response.submission.score === undefined || response.submission.score === null
            ? ''
            : String(response.submission.score),
        )
        setFeedback(response.submission.feedback || '')
      })
      .catch((err) => {
        if (isCancelled) return
        setError(isApiError(err) ? err.message : 'Failed to load submission')
        setSubmission(null)
      })
      .finally(() => {
        if (!isCancelled) setLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [authToken, submissionId])

  const experiment = useMemo(() => {
    if (!submission) return null
    return data.labs.flatMap((l) => l.experiments).find((e) => e.id === submission.experimentId) || null
  }, [data.labs, submission])

  if (loading) {
    return (
      <div className="grade-page">
        <div className="page-header">
          <h1>Grade Submission</h1>
          <p className="muted">Loading submission...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grade-page">
        <div className="page-header">
          <h1>Grade Submission</h1>
          <p className="muted">{error}</p>
        </div>
      </div>
    )
  }

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

  const handleValidate = async () => {
    if (!canValidate) {
      alert('Only submitted submissions can be validated')
      return
    }
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const n = score.trim() === '' ? NaN : Number(score)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      alert('Score must be a number between 0 and 100')
      return
    }

    try {
      const updated = await validateSubmission(authToken, submissionId, {
        score: n,
        feedback: feedback.trim() ? feedback.trim() : undefined,
      })

      const merged = {
        ...updated,
        feedback: feedback.trim() ? feedback.trim() : undefined,
      }

      setSubmission(merged)
      setData((prev) => {
        const existing = prev.submissions.find((s) => s.id === merged.id)
        return {
          ...prev,
          submissions: existing
            ? prev.submissions.map((s) => (s.id === merged.id ? merged : s))
            : [...prev.submissions, merged],
          submissionFiles: {
            ...prev.submissionFiles,
            [merged.id]: files,
          },
        }
      })

      alert('Submission validated')
      navigate('/submissions')
    } catch (err) {
      alert(isApiError(err) ? err.message : 'Failed to validate submission')
    }
  }

  return (
    <div className="grade-page">
      <div className="page-header">
        <h1>Grade Submission</h1>
        <p className="muted">
          Student: <strong>{studentName || submission.studentId}</strong> | Experiment:{' '}
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
