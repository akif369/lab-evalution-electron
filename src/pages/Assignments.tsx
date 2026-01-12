import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { users, uid } from '../data'
import './Assignments.css'

export function Assignments() {
  const { currentUser, data, setData } = useApp()
  const [teacherId, setTeacherId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [labId, setLabId] = useState('')

  if (!currentUser || currentUser.role !== 'hod') return null

  const teachers = data.teacherAssignments
    .map((a) => a.teacherId)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .map((id) => {
      const user = users.find((u) => u.id === id)
      return user ? { id: user.id, name: user.name } : null
    })
    .filter(Boolean) as Array<{ id: string; name: string }>

  const handleAssign = () => {
    if (!teacherId || !courseId || !labId) {
      alert('Please select all fields')
      return
    }

    setData((prev) => ({
      ...prev,
      teacherAssignments: [
        ...prev.teacherAssignments,
        { id: uid('assign'), teacherId, courseId, labId },
      ],
    }))

    alert('Assignment created!')
    setTeacherId('')
    setCourseId('')
    setLabId('')
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
            const teacher = users.find((u) => u.id === assign.teacherId)
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
