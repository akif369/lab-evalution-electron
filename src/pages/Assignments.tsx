import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { uid } from '../data'
import './Assignments.css'

export function Assignments() {
  const { currentUser, data, setData } = useApp()
  const [teacherId, setTeacherId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [labId, setLabId] = useState('')

  if (!currentUser || currentUser.role !== 'hod') return null

  const teachers = data.users
    .filter((u) => u.role === 'teacher')
    .map((u) => ({ id: u.id, name: u.name }))

  const handleAssign = () => {
    if (!teacherId || !courseId || !labId) {
      alert('Please select all fields')
      return
    }

    const alreadyAssigned = data.teacherAssignments.some(
      (a) => a.teacherId === teacherId && a.courseId === courseId && a.labId === labId,
    )
    if (alreadyAssigned) {
      alert('This assignment already exists')
      return
    }

    setData((prev) => ({
      ...prev,
      teacherAssignments: [
        ...prev.teacherAssignments,
        { id: uid('assign'), teacherId, courseId, labId },
      ],
      users: prev.users.map((u) => {
        if (u.id !== teacherId) return u
        const nextCourseIds = new Set(u.courseIds || [])
        nextCourseIds.add(courseId)
        const nextLabIds = new Set(u.labIds || [])
        nextLabIds.add(labId)
        return {
          ...u,
          courseIds: Array.from(nextCourseIds),
          labIds: Array.from(nextLabIds),
        }
      }),
    }))

    alert('Assignment created!')
    setTeacherId('')
    setCourseId('')
    setLabId('')
  }

  const handleDeleteAssignment = (assignmentId: string) => {
    const assignment = data.teacherAssignments.find((a) => a.id === assignmentId)
    if (!assignment) return
    const ok = confirm('Delete this assignment?')
    if (!ok) return

    setData((prev) => {
      const nextAssignments = prev.teacherAssignments.filter((a) => a.id !== assignmentId)
      const teacherAssignmentsForTeacher = nextAssignments.filter(
        (a) => a.teacherId === assignment.teacherId,
      )

      const nextUsers = prev.users.map((u) => {
        if (u.id !== assignment.teacherId) return u
        const nextLabIds = teacherAssignmentsForTeacher
          .map((a) => a.labId)
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
        const nextCourseIds = teacherAssignmentsForTeacher
          .map((a) => a.courseId)
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
        return {
          ...u,
          labIds: nextLabIds,
          courseIds: nextCourseIds,
        }
      })

      return {
        ...prev,
        teacherAssignments: nextAssignments,
        users: nextUsers,
      }
    })
  }

  return (
    <div className="assignments-page">
      <div className="page-header">
        <h1>Teacher Assignments</h1>
      </div>

      <div className="assign-form-section">
        <h2>Assign Lab to Teacher</h2>
        <div className="assign-form">
          <div className="form-group">
            <label>Teacher</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select course</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Lab</label>
            <select value={labId} onChange={(e) => setLabId(e.target.value)}>
              <option value="">Select lab</option>
              {data.labs
                .filter((l) => !courseId || l.courseId === courseId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
            </select>
          </div>
          <button onClick={handleAssign} className="btn-primary">
            Create Assignment
          </button>
        </div>
      </div>

      <div className="assignments-list-section">
        <h2>Current Assignments</h2>
        <div className="assignments-grid">
          {data.teacherAssignments.map((assign) => {
            const teacher = data.users.find((u) => u.id === assign.teacherId)
            const course = data.courses.find((c) => c.id === assign.courseId)
            const lab = data.labs.find((l) => l.id === assign.labId)
            return (
              <div key={assign.id} className="assignment-card">
                <div className="assignment-header">
                  <h3>{teacher?.name || assign.teacherId}</h3>
                </div>
                <div className="assignment-details">
                  <div className="detail-item">
                    <strong>Course:</strong> {course?.name || assign.courseId}
                  </div>
                  <div className="detail-item">
                    <strong>Lab:</strong> {lab?.title || assign.labId}
                  </div>
                </div>
                <div className="assignment-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleDeleteAssignment(assign.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
