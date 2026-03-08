import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStudentProfile, isApiError } from '../api/client'
import { useApp } from '../context/AppContext'
import type { StudentProfile as StudentProfileData } from '../types'
import './StudentProfile.css'

export function StudentProfile() {
  const { studentId } = useParams<{ studentId: string }>()
  const { currentUser, authToken } = useApp()
  const [profile, setProfile] = useState<StudentProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAccess = currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod' || currentUser.role === 'admin')
  if (!canAccess) return null

  useEffect(() => {
    if (!authToken || !studentId) return
    let cancelled = false

    setLoading(true)
    setError(null)
    getStudentProfile(authToken, studentId)
      .then((response) => {
        if (!cancelled) setProfile(response)
      })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null)
          setError(isApiError(err) ? err.message : 'Failed to load student profile')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authToken, studentId])

  const statusSummary = useMemo(() => {
    if (!profile) return []
    return [
      { label: 'Total', value: profile.stats.totalSubmissions },
      { label: 'Draft', value: profile.stats.draft },
      { label: 'Submitted', value: profile.stats.submitted },
      { label: 'Validated', value: profile.stats.validated },
      { label: 'On Time', value: profile.stats.onTimeCount },
      { label: 'Late', value: profile.stats.lateCount },
    ]
  }, [profile])

  return (
    <div className="student-profile-page">
      <div className="page-header">
        <h1>Student Profile</h1>
        <Link to="/students" className="back-link">
          Back to Students
        </Link>
      </div>

      {loading ? (
        <div className="profile-card">Loading student profile...</div>
      ) : error ? (
        <div className="profile-card error">{error}</div>
      ) : !profile ? (
        <div className="profile-card">No profile data found.</div>
      ) : (
        <div className="profile-layout">
          <section className="profile-card">
            <h2>Student Info</h2>
            <div className="info-grid">
              <div>
                <label>Name</label>
                <div>{profile.student.name}</div>
              </div>
              <div>
                <label>ID</label>
                <div>{profile.student.id}</div>
              </div>
              <div>
                <label>Roll No</label>
                <div>{profile.student.rollNo || '-'}</div>
              </div>
              <div>
                <label>Email</label>
                <div>{profile.student.email || '-'}</div>
              </div>
              <div>
                <label>Year</label>
                <div>{profile.student.year || '-'}</div>
              </div>
              <div>
                <label>Semester / Section</label>
                <div>
                  {(profile.student.semester || '-') + ' / ' + (profile.student.section || '-')}
                </div>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <h2>Statistics</h2>
            <div className="stats-grid">
              {statusSummary.map((stat) => (
                <div className="stat-item" key={stat.label}>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
              <div className="stat-item">
                <div className="stat-value">{profile.stats.averageScore ?? '-'}</div>
                <div className="stat-label">Average Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{profile.stats.bestScore ?? '-'}</div>
                <div className="stat-label">Best Score</div>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <h2>Submission Details</h2>
            {profile.submissions.length === 0 ? (
              <p className="muted">No submissions available.</p>
            ) : (
              <div className="submissions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Experiment</th>
                      <th>Lab</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Timing</th>
                      <th>Last Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.submissions.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div>{row.experimentTitle}</div>
                          <div className="muted small">{row.experimentId}</div>
                        </td>
                        <td>
                          <div>{row.labName}</div>
                          <div className="muted small">{row.labSubject || '-'}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${row.status}`}>{row.status}</span>
                        </td>
                        <td>{row.score ?? '-'}</td>
                        <td>{row.onTime ? 'On time' : 'Late'}</td>
                        <td>{row.lastSaved ? new Date(row.lastSaved).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
