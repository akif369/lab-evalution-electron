import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { changeUserPassword, createUser, deleteUser, isApiError, updateUser } from '../api/client'
import { looksLikeHeader, parseCsvText } from '../utils/csv'
import './Students.css'

type BulkRow = {
  id: string
  name: string
  password: string
  year?: string
  semester?: string
  section?: string
}

type StudentDraft = {
  name: string
  email: string
  rollNo: string
  year: string
  semester: string
  section: string
}

type ImportPreviewRow = BulkRow & {
  lineNumber: number
  email: string
  valid: boolean
  issue?: string
}

const toStudentEmail = (rawId: string) => {
  const trimmed = rawId.trim().toLowerCase()
  return trimmed.includes('@') ? trimmed : `${trimmed}@leap.local`
}

const csvHint = 'id_or_email,name,password,year,semester,section'

export function Students() {
  const { currentUser, authToken, data, refreshFromBackend } = useApp()
  const [selectedLabId, setSelectedLabId] = useState('')

  const [filterYear, setFilterYear] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'submissions_desc' | 'validated_desc'>('name_asc')

  const [bulkText, setBulkText] = useState('')
  const [bulkYear, setBulkYear] = useState('')
  const [bulkSemester, setBulkSemester] = useState('')
  const [bulkSection, setBulkSection] = useState('')
  const [bulkEnrollLabId, setBulkEnrollLabId] = useState('')
  const [csvFileName, setCsvFileName] = useState('')

  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>({})
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isBulkActionBusy, setIsBulkActionBusy] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const csvInputRef = useRef<HTMLInputElement | null>(null)

  if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'hod' && currentUser.role !== 'admin')) {
    return null
  }

  useEffect(() => {
    const studentUsers = data.users.filter((u) => u.role === 'student')
    const next: Record<string, StudentDraft> = {}
    for (const student of studentUsers) {
      next[student.id] = {
        name: student.name || '',
        email: student.email || toStudentEmail(student.rollNo || student.id),
        rollNo: student.rollNo || student.id,
        year: student.year || '',
        semester: student.semester || '',
        section: student.section || '',
      }
    }
    setDrafts(next)
  }, [data.users])

  useEffect(() => {
    const validStudentIds = new Set(data.users.filter((u) => u.role === 'student').map((u) => u.id))
    setSelectedStudentIds((prev) => prev.filter((id) => validStudentIds.has(id)))
  }, [data.users])

  const visibleLabs =
    currentUser.role === 'teacher'
      ? currentUser.labIds
        ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
        : []
      : data.labs

  const importPreview = useMemo(() => {
    const parsed = parseCsvText(bulkText)
    if (parsed.length === 0) {
      return { rows: [] as ImportPreviewRow[], validRows: [] as BulkRow[], invalidCount: 0 }
    }

    const rowsToParse = looksLikeHeader(parsed[0].cells) ? parsed.slice(1) : parsed
    const existingEmails = new Set(data.users.filter((u) => u.role === 'student').map((u) => (u.email || '').toLowerCase()))
    const seenEmails = new Set<string>()

    const rows = rowsToParse.map((row): ImportPreviewRow => {
      const id = (row.cells[0] || '').trim()
      const name = (row.cells[1] || '').trim()
      const password = (row.cells[2] || '').trim() || 'student123'
      const year = (row.cells[3] || '').trim() || bulkYear.trim() || undefined
      const semester = (row.cells[4] || '').trim() || bulkSemester.trim() || undefined
      const section = (row.cells[5] || '').trim() || bulkSection.trim() || undefined
      const email = toStudentEmail(id)

      if (!id || !name) {
        return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: false, issue: 'Missing id or name' }
      }
      if (seenEmails.has(email)) {
        return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: false, issue: 'Duplicate in import' }
      }
      if (existingEmails.has(email)) {
        return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: false, issue: 'Already exists' }
      }

      seenEmails.add(email)
      return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: true }
    })

    return {
      rows,
      validRows: rows.filter((row) => row.valid).map((row) => ({
        id: row.id,
        name: row.name,
        password: row.password,
        year: row.year,
        semester: row.semester,
        section: row.section,
      })),
      invalidCount: rows.filter((row) => !row.valid).length,
    }
  }, [bulkText, bulkYear, bulkSemester, bulkSection, data.users])

  const studentList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const studentUsers = data.users
      .filter((u) => u.role === 'student')
      .filter((u) => (filterYear.trim() ? (u.year || '') === filterYear.trim() : true))
      .filter((u) => (filterSemester.trim() ? (u.semester || '') === filterSemester.trim() : true))
      .filter((u) => (filterSection.trim() ? (u.section || '') === filterSection.trim() : true))
      .filter((u) => {
        if (!query) return true
        const haystack = `${u.name || ''} ${u.email || ''} ${u.rollNo || ''} ${u.id}`.toLowerCase()
        return haystack.includes(query)
      })

    const decorated = studentUsers.map((student) => {
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

    return [...decorated].sort((a, b) => {
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '')
      if (sortBy === 'submissions_desc') return b.totalSubmissions - a.totalSubmissions
      if (sortBy === 'validated_desc') return b.validated - a.validated
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [data.submissions, data.labs, selectedLabId, data.users, filterYear, filterSemester, filterSection, searchQuery, sortBy])

  const selectedVisibleCount = studentList.filter((s) => selectedStudentIds.includes(s.id)).length

  const loadCsvFile = async (file: File) => {
    const text = await file.text()
    setCsvFileName(file.name)
    setBulkText(text)
  }

  const bulkOnboardStudents = async () => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    if (importPreview.validRows.length === 0) {
      alert(`No valid rows to import. Expected format: ${csvHint}`)
      return
    }

    setIsImporting(true)
    const enrollLab = bulkEnrollLabId ? data.labs.find((l) => l.id === bulkEnrollLabId) : undefined
    const enrollLabIds = enrollLab ? [enrollLab.id] : []
    const enrollCourseIds = enrollLab ? [enrollLab.courseId] : []

    let successCount = 0
    const errors: string[] = []

    for (const row of importPreview.validRows) {
      try {
        const rollNo = row.id.includes('@') ? undefined : row.id
        await createUser(authToken, {
          name: row.name,
          email: toStudentEmail(row.id),
          password: row.password,
          role: 'student',
          rollNo,
          year: row.year,
          semester: row.semester,
          section: row.section,
          batch: row.year,
          labIds: enrollLabIds,
          courseIds: enrollCourseIds,
        })
        successCount += 1
      } catch (error) {
        errors.push(`${row.id}: ${isApiError(error) ? error.message : 'Failed'}`)
      }
    }

    await refreshFromBackend()
    setIsImporting(false)
    setBulkText('')
    setCsvFileName('')

    if (errors.length === 0) {
      alert(`Imported ${successCount} student(s).`)
    } else {
      alert(`Imported ${successCount} student(s). Failed: ${errors.length}. ${errors.slice(0, 3).join(' | ')}`)
    }
  }

  const updateDraft = (studentId: string, patch: Partial<StudentDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...patch,
      },
    }))
  }

  const handleSaveStudent = async (studentId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const draft = drafts[studentId]
    if (!draft) return

    setBusyStudentId(studentId)
    try {
      await updateUser(authToken, studentId, {
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        rollNo: draft.rollNo.trim(),
        year: draft.year.trim(),
        semester: draft.semester.trim(),
        section: draft.section.trim(),
      })
      await refreshFromBackend()
      alert('Student updated successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to update student')
    } finally {
      setBusyStudentId(null)
    }
  }

  const handleResetPassword = async (studentId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    setBusyStudentId(studentId)
    try {
      await changeUserPassword(authToken, studentId, { newPassword: 'student123' })
      alert('Student password reset to: student123')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to reset password')
    } finally {
      setBusyStudentId(null)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const ok = confirm('Delete this student?')
    if (!ok) return

    setBusyStudentId(studentId)
    try {
      await deleteUser(authToken, studentId)
      await refreshFromBackend()
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId))
      alert('Student deleted successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to delete student')
    } finally {
      setBusyStudentId(null)
    }
  }

  const toggleSelected = (studentId: string) => {
    setSelectedStudentIds((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]))
  }

  const selectAllFiltered = () => {
    setSelectedStudentIds(studentList.map((student) => student.id))
  }

  const clearSelection = () => {
    setSelectedStudentIds([])
  }

  const bulkResetSelected = async () => {
    if (!authToken || selectedStudentIds.length === 0) return

    setIsBulkActionBusy(true)
    let success = 0
    for (const studentId of selectedStudentIds) {
      try {
        await changeUserPassword(authToken, studentId, { newPassword: 'student123' })
        success += 1
      } catch {
        // skip
      }
    }
    setIsBulkActionBusy(false)
    alert(`Password reset completed for ${success}/${selectedStudentIds.length} students.`)
  }

  const bulkDeleteSelected = async () => {
    if (!authToken || selectedStudentIds.length === 0) return

    const ok = confirm(`Delete ${selectedStudentIds.length} selected students?`)
    if (!ok) return

    setIsBulkActionBusy(true)
    let success = 0
    for (const studentId of selectedStudentIds) {
      try {
        await deleteUser(authToken, studentId)
        success += 1
      } catch {
        // skip
      }
    }

    await refreshFromBackend()
    setSelectedStudentIds([])
    setIsBulkActionBusy(false)
    alert(`Deleted ${success}/${selectedStudentIds.length} selected students.`)
  }

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>Students</h1>
        <div className="filters-row">
          <div className="filter-group">
            <label>Search</label>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search name / email / roll" />
          </div>
          <div className="filter-group">
            <label>Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="submissions_desc">Most Submissions</option>
              <option value="validated_desc">Most Validated</option>
            </select>
          </div>
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

      <div className="students-toolbar">
        <div className="students-toolbar-left">
          <strong>Selected: {selectedStudentIds.length}</strong>
          <span className="muted small">Visible selected: {selectedVisibleCount}</span>
        </div>
        <div className="students-toolbar-actions">
          <button className="students-btn-secondary" onClick={selectAllFiltered}>Select Filtered</button>
          <button className="students-btn-secondary" onClick={clearSelection}>Clear</button>
          <button className="students-btn-secondary" onClick={bulkResetSelected} disabled={selectedStudentIds.length === 0 || isBulkActionBusy}>
            Reset Password Selected
          </button>
          <button className="students-btn-danger" onClick={bulkDeleteSelected} disabled={selectedStudentIds.length === 0 || isBulkActionBusy}>
            Delete Selected
          </button>
        </div>
      </div>

      <div className="students-onboard">
        <h2>Bulk Add Students</h2>
        <p className="muted small">CSV/Text format: {csvHint}</p>

        <div className="import-format-warning">
          <strong>Format Warning:</strong>
          <span> Required columns are <code>id_or_email</code> and <code>name</code>. Optional: <code>password</code>, <code>year</code>, <code>semester</code>, <code>section</code>.</span>
        </div>

        <div className="students-onboard-meta">
          <div className="students-onboard-group">
            <label>Year (fallback)</label>
            <input value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} placeholder="e.g. 2025-26" />
          </div>
          <div className="students-onboard-group">
            <label>Semester (fallback)</label>
            <input value={bulkSemester} onChange={(e) => setBulkSemester(e.target.value)} placeholder="e.g. 6" />
          </div>
          <div className="students-onboard-group">
            <label>Batch / Section (fallback)</label>
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

        <div className="students-import-controls">
          <button className="students-btn-secondary" onClick={() => csvInputRef.current?.click()}>
            Load CSV File
          </button>
          {csvFileName && <span className="muted small">Loaded: {csvFileName}</span>}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                await loadCsvFile(file)
              } catch {
                alert('Failed to read CSV file')
              }
            }}
          />
        </div>

        <textarea
          className="students-onboard-textarea"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={`stu-03,John Doe,student123\n${csvHint}`}
          rows={6}
        />

        {importPreview.rows.length > 0 && (
          <div className="import-preview">
            <div className="import-preview-header">
              <strong>Preview</strong>
              <span className="muted small">Valid: {importPreview.validRows.length} | Invalid: {importPreview.invalidCount}</span>
            </div>
            <div className="import-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>ID/Email</th>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, 12).map((row) => (
                    <tr key={`${row.lineNumber}-${row.id}-${row.name}`}>
                      <td>{row.lineNumber}</td>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>
                        <span className={`import-status ${row.valid ? 'ok' : 'error'}`}>{row.valid ? 'Valid' : row.issue || 'Invalid'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="students-onboard-actions">
          <button className="students-btn-primary" onClick={bulkOnboardStudents} disabled={isImporting || importPreview.validRows.length === 0}>
            {isImporting ? 'Importing...' : `Confirm Import ${importPreview.validRows.length} Students`}
          </button>
        </div>
      </div>

      <div className="students-grid">
        {studentList.map((student) => {
          const draft = drafts[student.id] || {
            name: student.name || '',
            email: student.email || toStudentEmail(student.rollNo || student.id),
            rollNo: student.rollNo || student.id,
            year: student.year || '',
            semester: student.semester || '',
            section: student.section || '',
          }
          const busy = busyStudentId === student.id || isBulkActionBusy
          const selected = selectedStudentIds.includes(student.id)

          return (
            <div key={student.id} className={`student-card ${selected ? 'selected' : ''}`}>
              <div className="student-header">
                <div className="student-header-main">
                  <h3>{student.name}</h3>
                  <span className="student-id">{student.id}</span>
                </div>
                <label className="select-checkbox">
                  <input type="checkbox" checked={selected} onChange={() => toggleSelected(student.id)} />
                  Select
                </label>
              </div>

              <div className="student-edit-grid">
                <label>
                  Name
                  <input value={draft.name} onChange={(e) => updateDraft(student.id, { name: e.target.value })} />
                </label>
                <label>
                  Email
                  <input value={draft.email} onChange={(e) => updateDraft(student.id, { email: e.target.value })} />
                </label>
                <label>
                  Roll No
                  <input value={draft.rollNo} onChange={(e) => updateDraft(student.id, { rollNo: e.target.value })} />
                </label>
                <label>
                  Year
                  <input value={draft.year} onChange={(e) => updateDraft(student.id, { year: e.target.value })} />
                </label>
                <label>
                  Semester
                  <input value={draft.semester} onChange={(e) => updateDraft(student.id, { semester: e.target.value })} />
                </label>
                <label>
                  Section
                  <input value={draft.section} onChange={(e) => updateDraft(student.id, { section: e.target.value })} />
                </label>
              </div>

              <div className="student-actions">
                <button className="students-btn-primary" onClick={() => handleSaveStudent(student.id)} disabled={busy}>
                  {busyStudentId === student.id ? 'Saving...' : 'Save'}
                </button>
                <Link className="students-btn-secondary" to={`/students/${student.id}/profile`}>
                  View Profile
                </Link>
                <button className="students-btn-secondary" onClick={() => handleResetPassword(student.id)} disabled={busy}>
                  Reset Password
                </button>
                <button className="students-btn-danger" onClick={() => handleDeleteStudent(student.id)} disabled={busy}>
                  Delete
                </button>
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
                          {sub.score !== undefined && sub.score !== null && <span className="score">Score: {sub.score}</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
