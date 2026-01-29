import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { User } from '../types'
import './Students.css'

type BulkRow = {
  id: string
  name: string
  password: string
  year?: string
  semester?: string
  section?: string
}

export function Students() {
  const { currentUser, data, setData } = useApp()
  const [selectedLabId, setSelectedLabId] = useState('')

  const [filterYear, setFilterYear] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [filterSection, setFilterSection] = useState('')

  const [bulkText, setBulkText] = useState('')
  const [bulkYear, setBulkYear] = useState('')
  const [bulkSemester, setBulkSemester] = useState('')
  const [bulkSection, setBulkSection] = useState('')
  const [bulkEnrollLabId, setBulkEnrollLabId] = useState('')

  if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'hod')) return null

  const visibleLabs =
    currentUser.role === 'teacher'
      ? currentUser.labIds
        ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
        : []
      : data.labs

  const parseBulk = (): BulkRow[] => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    return lines
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim())
        const [id, name, password] = parts
        if (!id || !name) return null
        return {
          id,
          name,
          password: password || 'student',
          year: bulkYear.trim() ? bulkYear.trim() : undefined,
          semester: bulkSemester.trim() ? bulkSemester.trim() : undefined,
          section: bulkSection.trim() ? bulkSection.trim() : undefined,
        }
      })
      .filter(Boolean) as BulkRow[]
  }

  const bulkOnboardStudents = () => {
    const rows = parseBulk()
    if (rows.length === 0) {
      alert('No valid rows found. Use format: id,name,password (password optional)')
      return
    }

    const conflicts = rows.filter((r) => data.users.some((u) => u.id.toLowerCase() === r.id.toLowerCase()))
    if (conflicts.length > 0) {
      alert(`Some IDs already exist: ${conflicts.map((c) => c.id).join(', ')}`)
      return
    }

    const enrollLab = bulkEnrollLabId ? data.labs.find((l) => l.id === bulkEnrollLabId) : undefined
    const enrollLabIds = enrollLab ? [enrollLab.id] : []
    const enrollCourseIds = enrollLab ? [enrollLab.courseId] : []

    const newUsers: User[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: 'student',
      password: r.password || 'student',
      courseIds: [...enrollCourseIds],
      labIds: [...enrollLabIds],
      year: r.year,
      semester: r.semester,
      section: r.section,
    }))

    setData((prev) => ({
      ...prev,
      users: [...prev.users, ...newUsers],
    }))

    setBulkText('')
    alert(`Imported ${newUsers.length} student(s).`)
  }

  const studentList = useMemo(() => {
    const studentUsers = data.users
      .filter((u) => u.role === 'student')
      .filter((u) => (filterYear.trim() ? (u.year || '') === filterYear.trim() : true))
      .filter((u) => (filterSemester.trim() ? (u.semester || '') === filterSemester.trim() : true))
      .filter((u) => (filterSection.trim() ? (u.section || '') === filterSection.trim() : true))

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
  }, [data.submissions, data.labs, selectedLabId, data.users, filterYear, filterSemester, filterSection])

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>Students</h1>
        <div className="filters-row">
          <div className="filter-group">
            <label>Filter by Lab</label>
            <select value={selectedLabId} onChange={(e) => setSelectedLabId(e.target.value)}>
              <option value="">All Labs</option>
              {visibleLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.title}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Year</label>
            <input value={filterYear} onChange={(e) => setFilterYear(e.target.value)} placeholder="e.g. 2025-26" />
          </div>
          <div className="filter-group">
            <label>Semester</label>
            <input value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} placeholder="e.g. 6" />
          </div>
          <div className="filter-group">
            <label>Batch / Section</label>
            <input value={filterSection} onChange={(e) => setFilterSection(e.target.value)} placeholder="e.g. A" />
          </div>
        </div>
      </div>

      <div className="students-onboard">
        <h2>Bulk Add Students</h2>
        <p className="muted small">Format per line: id,name,password (password optional)</p>

        <div className="students-onboard-meta">
          <div className="students-onboard-group">
            <label>Year</label>
            <input value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} placeholder="e.g. 2025-26" />
          </div>
          <div className="students-onboard-group">
            <label>Semester</label>
            <input value={bulkSemester} onChange={(e) => setBulkSemester(e.target.value)} placeholder="e.g. 6" />
          </div>
          <div className="students-onboard-group">
            <label>Batch / Section</label>
            <input value={bulkSection} onChange={(e) => setBulkSection(e.target.value)} placeholder="e.g. A" />
          </div>
          <div className="students-onboard-group">
            <label>Enroll into Lab (optional)</label>
            <select value={bulkEnrollLabId} onChange={(e) => setBulkEnrollLabId(e.target.value)}>
              <option value="">No enrollment</option>
              {visibleLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          className="students-onboard-textarea"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="stu-03,John Doe,student\nstu-04,Jane Smith\n..."
          rows={6}
        />

        <div className="students-onboard-actions">
          <button className="students-btn-primary" onClick={bulkOnboardStudents}>
            Import Students
          </button>
        </div>
      </div>

      <div className="students-grid">
        {studentList.map((student) => (
          <div key={student.id} className="student-card">
            <div className="student-header">
              <h3>{student.name}</h3>
              <span className="student-id">{student.id}</span>
            </div>
            <div className="student-meta">
              <span className="meta-pill">Year: {student.year || '-'}</span>
              <span className="meta-pill">Sem: {student.semester || '-'}</span>
              <span className="meta-pill">Batch: {student.section || '-'}</span>
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
