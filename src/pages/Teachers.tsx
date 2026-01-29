import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { uid } from '../data'
import type { User } from '../types'
import './Teachers.css'

export function Teachers() {
  const { currentUser, data, setData } = useApp()
  const [newTeacherName, setNewTeacherName] = useState('')

  if (!currentUser || currentUser.role !== 'hod') return null

  const teacherList = data.users.filter((u) => u.role === 'teacher')

  const addTeacher = () => {
    if (!newTeacherName.trim()) return

    const newTeacher: User = {
      id: uid('t'),
      name: newTeacherName,
      role: 'teacher',
      password: 'teacher',
      courseIds: [],
      labIds: [],
    }

    setData((prev) => ({
      ...prev,
      users: [...prev.users, newTeacher],
    }))
    setNewTeacherName('')
    alert(`Teacher ${newTeacherName} added! Default password: teacher`)
  }

  const deleteTeacher = (teacherId: string) => {
    const teacher = data.users.find((u) => u.id === teacherId && u.role === 'teacher')
    if (!teacher) return
    const ok = confirm(`Delete teacher ${teacher.name} (${teacher.id})? This will remove assignments.`)
    if (!ok) return

    setData((prev) => {
      const nextAssignments = prev.teacherAssignments.filter((a) => a.teacherId !== teacherId)

      return {
        ...prev,
        users: prev.users.filter((u) => u.id !== teacherId),
        teacherAssignments: nextAssignments,
      }
    })
  }

  return (
    <div className="teachers-page">
      <div className="page-header">
        <h1>Manage Teachers</h1>
      </div>

      <div className="add-teacher-section">
        <h2>Add New Teacher</h2>
        <div className="add-form">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder="Teacher name"
            onKeyPress={(e) => e.key === 'Enter' && addTeacher()}
          />
          <button onClick={addTeacher} className="btn-primary">
            Add Teacher
          </button>
        </div>
      </div>

      <div className="teachers-grid">
        {teacherList.map((teacher) => {
          const assignments = data.teacherAssignments.filter(
            (a) => a.teacherId === teacher.id,
          )
          return (
            <div key={teacher.id} className="teacher-card">
              <div className="teacher-header">
                <h3>{teacher.name}</h3>
                <span className="teacher-id">{teacher.id}</span>
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
                  <button className="btn-danger" onClick={() => deleteTeacher(teacher.id)}>
                    Delete Teacher
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
