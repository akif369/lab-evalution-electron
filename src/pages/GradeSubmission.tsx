import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { ProjectFile, Submission } from '../types'
import { getSubmissionById, isApiError, runAiGrade, validateSubmission } from '../api/client'
import './GradeSubmission.css'

export function GradeSubmission() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const { currentUser, authToken, data, setData } = useApp()
  const navigate = useNavigate()

  if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'hod')) return null
  if (!submissionId) return null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [studentName, setStudentName] = useState<string>('')
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [score, setScore] = useState<string>('')
  const [feedback, setFeedback] = useState<string>('')
  const [expectedOutputOverride, setExpectedOutputOverride] = useState('')
  const [descriptionOverride, setDescriptionOverride] = useState('')
  const [isRechecking, setIsRechecking] = useState(false)

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

  useEffect(() => {
    if (!experiment) return
    if (!expectedOutputOverride) {
      setExpectedOutputOverride(experiment.expectedOutput || '')
    }
    if (!descriptionOverride) {
      setDescriptionOverride(experiment.description || '')
    }
  }, [experiment, expectedOutputOverride, descriptionOverride])

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

  const handleAiRecheck = async () => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    try {
      setIsRechecking(true)
      const result = await runAiGrade(authToken, {
        experimentId: submission.experimentId,
        files: files.filter((f) => f.type === 'file'),
        expectedOutputOverride: expectedOutputOverride.trim() || undefined,
        descriptionOverride: descriptionOverride.trim() || undefined,
      })

      setScore(String(result.score))
      setFeedback(result.feedback || '')
      setSubmission((prev) =>
        prev
          ? {
              ...prev,
              score: result.score,
              feedback: result.feedback,
              aiEvaluation: result.aiEvaluation || prev.aiEvaluation || null,
            }
          : prev,
      )
    } catch (err) {
      alert(isApiError(err) ? err.message : 'Failed to run AI re-check')
    } finally {
      setIsRechecking(false)
    }
  }

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
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      alert('Score must be a number between 0 and 10')
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
        <p className="muted small">AI auto-validates submissions. Teacher can re-check and confirm override if required.</p>
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
          <h2>AI Validation & Teacher Confirmation</h2>

          <div className="form-group">
            <label>Status</label>
            <div>
              <span className={`status-badge ${submission.status}`}>{submission.status}</span>
            </div>
          </div>

          {submission.aiEvaluation && (
            <div className="form-group">
              <label>AI Evaluation</label>
              <div className="ai-eval-box">
                <div className="ai-eval-row">
                  <span>Provider</span>
                  <strong>{submission.aiEvaluation.provider || 'unknown'}</strong>
                </div>
                <div className="ai-eval-row">
                  <span>Output verification</span>
                  <strong>{submission.aiEvaluation.outputMatchScore ?? '-'}/10</strong>
                </div>
                <div className="ai-eval-row">
                  <span>Code quality</span>
                  <strong>{submission.aiEvaluation.codeQualityScore ?? '-'}/10</strong>
                </div>
                <div className="ai-eval-row">
                  <span>Raw score</span>
                  <strong>{submission.aiEvaluation.rawScore ?? '-'}/10</strong>
                </div>
                <div className="ai-eval-row">
                  <span>Late penalty</span>
                  <strong>{submission.aiEvaluation.latePenalty ?? 0}</strong>
                </div>
                <div className="ai-eval-row">
                  <span>Final AI score</span>
                  <strong>{submission.aiEvaluation.finalScore ?? submission.score ?? '-'}/10</strong>
                </div>
                <div className="ai-eval-row">
                  <span>Output matched</span>
                  <strong>{submission.aiEvaluation.outputMatched ? 'Yes' : 'No'}</strong>
                </div>
                {submission.aiEvaluation.suspectedCheating && (
                  <div className="ai-warning">
                    Suspected cheating: {submission.aiEvaluation.cheatingReason || 'Print-only/hardcoded output pattern'}
                  </div>
                )}
                {submission.aiEvaluation.mistakeFlags && submission.aiEvaluation.mistakeFlags.length > 0 && (
                  <div className="muted small">Mistake flags: {submission.aiEvaluation.mistakeFlags.join(' | ')}</div>
                )}
                {submission.aiEvaluation.issues && submission.aiEvaluation.issues.length > 0 && (
                  <div className="muted small">Issues: {submission.aiEvaluation.issues.join(' | ')}</div>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Expected Output Override (Optional)</label>
            <textarea
              value={expectedOutputOverride}
              onChange={(e) => setExpectedOutputOverride(e.target.value)}
              rows={3}
              placeholder="Adjust expected output for AI re-check if experiment requirement changed."
            />
          </div>

          <div className="form-group">
            <label>Description Override (Optional)</label>
            <textarea
              value={descriptionOverride}
              onChange={(e) => setDescriptionOverride(e.target.value)}
              rows={3}
              placeholder="Optional problem description override for better output-match context."
            />
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={handleAiRecheck} disabled={isRechecking}>
              {isRechecking ? 'Re-checking...' : 'Run AI Re-check'}
            </button>
          </div>

          <div className="form-group">
            <label>Score (0-10)</label>
            <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 8.5" />
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
              Confirm Final Score
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
