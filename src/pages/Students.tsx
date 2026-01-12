import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { users } from '../data'
import './Students.css'

export function Students() {
  const { currentUser, data } = useApp()
  const [selectedLabId, setSelectedLabId] = useState('')

  if (!currentUser || currentUser.role !== 'teacher') return null

  const assignedLabs = currentUser.labIds
    ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
    : []

  const studentList = useMemo(() => {
    const studentUsers = users.filter((u) => u.role === 'student')
    return studentUsers.map((student) => {
      const studentSubmissions = data.submissions.filter((s) => s.studentId === student.id)
      const relevantSubmissions = selectedLabId
        ? studentSubmissions.filter((s) => {
            const lab = data.labs.find((l) => l.id === selectedLabId)
            return lab?.experiments.some((e) => e.id === s.experimentId)
          })
        : studentSubmissions

      return {
        ...student,
        submissions: relevantSubmissions,
        totalSubmissions: relevantSubmissions.length,
        submitted: relevantSubmissions.filter((s) => s.status === 'submitted').length,
        validated: relevantSubmissions.filter((s) => s.status === 'validated').length,
      }
    })
  }, [data.submissions, data.labs, selectedLabId])

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>Student Statistics</h1>
        <div className="filter-group">
          <label>Filter by Lab</label>
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
          >
            <option value="">All Labs</option>
            {assignedLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="students-grid">
        {studentList.map((student) => (
          <div key={student.id} className="student-card">
            <div className="student-header">
              <h3>{student.name}</h3>
              <span className="student-id">{student.id}</span>
            </div>
            <div className="student-stats">
              <div className="stat-item">
                <div className="stat-value">{student.totalSubmissions}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{student.submitted}</div>
                <div className="stat-label">Submitted</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{student.validated}</div>
                <div className="stat-label">Validated</div>
              </div>
            </div>
            {student.submissions.length > 0 && (
              <div className="submissions-list">
                <strong>Recent Submissions:</strong>
                <ul>
                  {student.submissions.slice(-3).map((sub) => {
                    const exp = data.labs
                      .flatMap((l) => l.experiments)
                      .find((e) => e.id === sub.experimentId)
                    return (
                      <li key={sub.id}>
                        <span>{exp?.title || sub.experimentId}</span>
                        <span className={`status-badge ${sub.status}`}>{sub.status}</span>
                        {sub.score !== undefined && (
                          <span className="score">Score: {sub.score}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
