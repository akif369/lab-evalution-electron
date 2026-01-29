import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { uid } from '../data'
import type { User, UserRole } from '../types'
import './Users.css'

type BulkRow = {
  id: string
  name: string
  password: string
  year?: string
  semester?: string
  section?: string
}

export function Users() {
  const { currentUser, data, setData } = useApp()

  const [newRole, setNewRole] = useState<UserRole>('student')
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newYear, setNewYear] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [newSection, setNewSection] = useState('')

  const [bulkText, setBulkText] = useState('')
  const [bulkYear, setBulkYear] = useState('')
  const [bulkSemester, setBulkSemester] = useState('')
  const [bulkSection, setBulkSection] = useState('')

  if (!currentUser || currentUser.role !== 'admin') return null

  const usersSorted = useMemo(() => {
    const roleOrder: Record<UserRole, number> = { admin: 0, hod: 1, teacher: 2, student: 3 }
    return [...data.users].sort((a, b) => {
      const ra = roleOrder[a.role]
      const rb = roleOrder[b.role]
      if (ra !== rb) return ra - rb
      return a.id.localeCompare(b.id)
    })
  }, [data.users])

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

  const addUser = () => {
    if (!newName.trim()) {
      alert('Name is required')
      return
    }

    const id = newId.trim() || uid(newRole === 'student' ? 'stu' : newRole === 'teacher' ? 't' : newRole)
    const exists = data.users.some((u) => u.id.toLowerCase() === id.toLowerCase())
    if (exists) {
      alert('User ID already exists')
      return
    }

    const user: User = {
      id,
      name: newName.trim(),
      role: newRole,
      password: newPassword.trim() || (newRole === 'student' ? 'student' : newRole),
      courseIds: newRole === 'student' || newRole === 'teacher' ? [] : undefined,
      labIds: newRole === 'student' || newRole === 'teacher' ? [] : undefined,
      year: newRole === 'student' && newYear.trim() ? newYear.trim() : undefined,
      semester: newRole === 'student' && newSemester.trim() ? newSemester.trim() : undefined,
      section: newRole === 'student' && newSection.trim() ? newSection.trim() : undefined,
    }

    setData((prev) => ({
      ...prev,
      users: [...prev.users, user],
    }))

    setNewId('')
    setNewName('')
    setNewPassword('')
    setNewYear('')
    setNewSemester('')
    setNewSection('')
  }

  const updateUserField = (userId: string, patch: Partial<User>) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    }))
  }

  const deleteUser = (userId: string) => {
    const u = data.users.find((x) => x.id === userId)
    if (!u) return
    if (u.role === 'admin') {
      alert('Cannot delete an admin user')
      return
    }

    const ok = confirm(`Delete user ${u.name} (${u.id})?`)
    if (!ok) return

    setData((prev) => {
      const nextUsers = prev.users.filter((x) => x.id !== userId)
      const nextAssignments = prev.teacherAssignments.filter((a) => a.teacherId !== userId)
      const nextSubmissions = prev.submissions.filter((s) => s.studentId !== userId)
      const nextSubmissionFiles = { ...prev.submissionFiles }
      for (const s of prev.submissions) {
        if (s.studentId === userId) delete nextSubmissionFiles[s.id]
      }

      return {
        ...prev,
        users: nextUsers,
        teacherAssignments: nextAssignments,
        submissions: nextSubmissions,
        submissionFiles: nextSubmissionFiles,
      }
    })
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

    const newUsers: User[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: 'student',
      password: r.password || 'student',
      courseIds: [],
      labIds: [],
      year: r.year,
      semester: r.semester,
      section: r.section,
    }))

    setData((prev) => ({
      ...prev,
      users: [...prev.users, ...newUsers],
    }))

    setBulkText('')
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Users</h1>
        <p className="muted">Admin: manage users and onboard students (mock server, persisted locally)</p>
      </div>

      <div className="panel">
        <h2>Add User</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="hod">HOD</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>User ID (optional)</label>
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="e.g. stu-10" />
          </div>

          <div className="form-group">
            <label>Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
          </div>

          <div className="form-group">
            <label>Password (optional)</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="defaults to role name"
            />
          </div>

          <div className={`form-group ${newRole !== 'student' ? 'disabled' : ''}`}>
            <label>Year</label>
            <input
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              disabled={newRole !== 'student'}
              placeholder="e.g. 2025-26"
            />
          </div>

          <div className={`form-group ${newRole !== 'student' ? 'disabled' : ''}`}>
            <label>Semester</label>
            <input
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              disabled={newRole !== 'student'}
              placeholder="e.g. 6"
            />
          </div>

          <div className={`form-group ${newRole !== 'student' ? 'disabled' : ''}`}>
            <label>Section</label>
            <input
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              disabled={newRole !== 'student'}
              placeholder="e.g. A"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={addUser}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Bulk Onboard Students</h2>
        <p className="muted small">Format per line: id,name,password (password optional)</p>

        <div className="bulk-meta">
          <div className="form-group">
            <label>Year</label>
            <input value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} placeholder="e.g. 2025-26" />
          </div>
          <div className="form-group">
            <label>Semester</label>
            <input value={bulkSemester} onChange={(e) => setBulkSemester(e.target.value)} placeholder="e.g. 6" />
          </div>
          <div className="form-group">
            <label>Section</label>
            <input value={bulkSection} onChange={(e) => setBulkSection(e.target.value)} placeholder="e.g. A" />
          </div>
        </div>

        <textarea
          className="bulk-textarea"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="stu-03,John Doe,student\nstu-04,Jane Smith\n..."
          rows={6}
        />

        <div className="form-actions">
          <button className="btn-primary" onClick={bulkOnboardStudents}>
            Import Students
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>All Users</h2>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Year</th>
                <th>Sem</th>
                <th>Sec</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usersSorted.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td>
                    <input
                      value={u.name}
                      onChange={(e) => updateUserField(u.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserField(u.id, { role: e.target.value as UserRole })}
                      disabled={u.role === 'admin'}
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="hod">hod</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={u.year || ''}
                      onChange={(e) => updateUserField(u.id, { year: e.target.value })}
                      disabled={u.role !== 'student'}
                    />
                  </td>
                  <td>
                    <input
                      value={u.semester || ''}
                      onChange={(e) => updateUserField(u.id, { semester: e.target.value })}
                      disabled={u.role !== 'student'}
                    />
                  </td>
                  <td>
                    <input
                      value={u.section || ''}
                      onChange={(e) => updateUserField(u.id, { section: e.target.value })}
                      disabled={u.role !== 'student'}
                    />
                  </td>
                  <td className="actions">
                    <button className="btn-danger" onClick={() => deleteUser(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
