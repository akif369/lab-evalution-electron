import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { changeUserPassword, createUser, deleteUser, isApiError, updateUser } from '../api/client'
import './Teachers.css'

type TeacherDraft = {
  name: string
  email: string
}

const toTeacherEmail = (name: string) => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
  return `${slug || 'teacher'}@leap.local`
}

export function Teachers() {
  const { currentUser, authToken, data, refreshFromBackend } = useApp()
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherEmail, setNewTeacherEmail] = useState('')
  const [newTeacherPassword, setNewTeacherPassword] = useState('teacher123')

  const [drafts, setDrafts] = useState<Record<string, TeacherDraft>>({})
  const [busyTeacherId, setBusyTeacherId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  if (!currentUser || currentUser.role !== 'hod') return null

  const teacherList = useMemo(() => data.users.filter((u) => u.role === 'teacher'), [data.users])

  useEffect(() => {
    const next: Record<string, TeacherDraft> = {}
    for (const teacher of teacherList) {
      next[teacher.id] = {
        name: teacher.name || '',
        email: teacher.email || toTeacherEmail(teacher.name || teacher.id),
      }
    }
    setDrafts(next)
  }, [teacherList])

  const addTeacher = async () => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const name = newTeacherName.trim()
    if (!name) {
      alert('Teacher name is required')
      return
    }

    const email = (newTeacherEmail.trim() || toTeacherEmail(name)).toLowerCase()
    const password = newTeacherPassword.trim() || 'teacher123'

    setIsAdding(true)
    try {
      await createUser(authToken, {
        name,
        email,
        password,
        role: 'teacher',
        courseIds: [],
        labIds: [],
      })
      await refreshFromBackend()
      setNewTeacherName('')
      setNewTeacherEmail('')
      setNewTeacherPassword('teacher123')
      alert(`Teacher added. Login: ${email} / ${password}`)
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to add teacher')
    } finally {
      setIsAdding(false)
    }
  }

  const saveTeacher = async (teacherId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const draft = drafts[teacherId]
    if (!draft) return

    setBusyTeacherId(teacherId)
    try {
      await updateUser(authToken, teacherId, {
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
      })
      await refreshFromBackend()
      alert('Teacher updated successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to update teacher')
    } finally {
      setBusyTeacherId(null)
    }
  }

  const resetTeacherPassword = async (teacherId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    setBusyTeacherId(teacherId)
    try {
      await changeUserPassword(authToken, teacherId, { newPassword: 'teacher123' })
      alert('Teacher password reset to: teacher123')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to reset teacher password')
    } finally {
      setBusyTeacherId(null)
    }
  }

  const removeTeacher = async (teacherId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const ok = confirm('Delete this teacher account?')
    if (!ok) return

    setBusyTeacherId(teacherId)
    try {
      await deleteUser(authToken, teacherId)
      await refreshFromBackend()
      alert('Teacher deleted successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to delete teacher')
    } finally {
      setBusyTeacherId(null)
    }
  }

  return (
    <div className="teachers-page">
      <div className="page-header">
        <h1>Manage Teachers</h1>
      </div>

      <div className="add-teacher-section">
        <h2>Add New Teacher</h2>
        <div className="teacher-form-grid">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder="Teacher name"
          />
          <input
            type="email"
            value={newTeacherEmail}
            onChange={(e) => setNewTeacherEmail(e.target.value)}
            placeholder="teacher@example.com (optional)"
          />
          <input
            type="text"
            value={newTeacherPassword}
            onChange={(e) => setNewTeacherPassword(e.target.value)}
            placeholder="Default password"
          />
          <button onClick={addTeacher} className="btn-primary" disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Teacher'}
          </button>
        </div>
      </div>

      <div className="teachers-grid">
        {teacherList.map((teacher) => {
          const assignments = data.teacherAssignments.filter((a) => a.teacherId === teacher.id)
          const draft = drafts[teacher.id] || { name: teacher.name || '', email: teacher.email || '' }
          const busy = busyTeacherId === teacher.id

          return (
            <div key={teacher.id} className="teacher-card">
              <div className="teacher-header">
                <h3>{teacher.name}</h3>
                <span className="teacher-id">{teacher.id}</span>
              </div>

              <div className="teacher-edit-grid">
                <label>
                  Name
                  <input value={draft.name} onChange={(e) => setDrafts((prev) => ({ ...prev, [teacher.id]: { ...draft, name: e.target.value } }))} />
                </label>
                <label>
                  Email
                  <input value={draft.email} onChange={(e) => setDrafts((prev) => ({ ...prev, [teacher.id]: { ...draft, email: e.target.value } }))} />
                </label>
              </div>

              <div className="teacher-info">
                <div className="info-item">
                  <strong>Assigned Labs:</strong>
                  <span>{assignments.length}</span>
                </div>
                {assignments.length > 0 && (
                  <div className="assignments-list">
                    {assignments.map((assign) => {
                      const lab = data.labs.find((l) => l.id === assign.labId)
                      const course = data.courses.find((c) => c.id === assign.courseId)
                      return (
                        <div key={assign.id} className="assignment-item">
                          {course?.name} - {lab?.title}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="teacher-actions">
                  <button className="btn-primary" onClick={() => saveTeacher(teacher.id)} disabled={busy}>
                    {busy ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn-secondary" onClick={() => resetTeacherPassword(teacher.id)} disabled={busy}>
                    Reset Password
                  </button>
                  <button className="btn-danger" onClick={() => removeTeacher(teacher.id)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}