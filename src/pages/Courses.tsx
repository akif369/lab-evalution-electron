import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { uid } from '../data'
import type { Course, Lab } from '../types'
import './Courses.css'

export function Courses() {
  const { currentUser, data, setData } = useApp()

  const [courseId, setCourseId] = useState('')
  const [courseName, setCourseName] = useState('')

  const [labTitle, setLabTitle] = useState('')
  const [labCourseId, setLabCourseId] = useState('')

  if (!currentUser || currentUser.role !== 'admin') return null

  const coursesSorted = useMemo(() => {
    return [...data.courses].sort((a, b) => a.id.localeCompare(b.id))
  }, [data.courses])

  const labsSorted = useMemo(() => {
    return [...data.labs].sort((a, b) => a.title.localeCompare(b.title))
  }, [data.labs])

  const addCourse = () => {
    const id = courseId.trim() || uid('csc')
    const name = courseName.trim()
    if (!name) {
      alert('Course name is required')
      return
    }

    const exists = data.courses.some((c) => c.id.toLowerCase() === id.toLowerCase())
    if (exists) {
      alert('Course ID already exists')
      return
    }

    const c: Course = { id, name, labs: [] }
    setData((prev) => ({
      ...prev,
      courses: [...prev.courses, c],
    }))

    setCourseId('')
    setCourseName('')
  }

  const updateCourse = (id: string, patch: Partial<Course>) => {
    setData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }

  const deleteCourse = (id: string) => {
    const c = data.courses.find((x) => x.id === id)
    if (!c) return
    const ok = confirm(`Delete course ${c.name} (${c.id})? This will also delete labs under this course.`)
    if (!ok) return

    setData((prev) => {
      const labsToDelete = prev.labs.filter((l) => l.courseId === id).map((l) => l.id)

      const nextLabs = prev.labs.filter((l) => l.courseId !== id)
      const nextCourses = prev.courses.filter((x) => x.id !== id)
      const nextAssignments = prev.teacherAssignments.filter((a) => a.courseId !== id && !labsToDelete.includes(a.labId))

      const nextUsers = prev.users.map((u) => {
        const nextCourseIds = (u.courseIds || []).filter((cid) => cid !== id)
        const nextLabIds = (u.labIds || []).filter((lid) => !labsToDelete.includes(lid))
        return {
          ...u,
          courseIds: u.courseIds ? nextCourseIds : u.courseIds,
          labIds: u.labIds ? nextLabIds : u.labIds,
        }
      })

      return {
        ...prev,
        courses: nextCourses,
        labs: nextLabs,
        teacherAssignments: nextAssignments,
        users: nextUsers,
      }
    })
  }

  const addLab = () => {
    const title = labTitle.trim()
    const cid = labCourseId || data.courses[0]?.id

    if (!cid) {
      alert('Create a course first')
      return
    }
    if (!title) {
      alert('Lab title is required')
      return
    }

    const lab: Lab = { id: uid('lab'), title, courseId: cid, experiments: [] }

    setData((prev) => ({
      ...prev,
      labs: [...prev.labs, lab],
      courses: prev.courses.map((c) => (c.id === cid ? { ...c, labs: [...c.labs, lab.id] } : c)),
    }))

    setLabTitle('')
    setLabCourseId('')
  }

  const updateLab = (labId: string, patch: Partial<Lab>) => {
    setData((prev) => {
      const currentLab = prev.labs.find((l) => l.id === labId)
      if (!currentLab) return prev

      const nextCourseId = patch.courseId ?? currentLab.courseId
      const oldCourseId = currentLab.courseId

      const nextLabs = prev.labs.map((l) => (l.id === labId ? { ...l, ...patch } : l))
      let nextCourses = prev.courses

      if (nextCourseId !== oldCourseId) {
        nextCourses = prev.courses.map((c) => {
          if (c.id === oldCourseId) return { ...c, labs: c.labs.filter((id) => id !== labId) }
          if (c.id === nextCourseId) return { ...c, labs: c.labs.includes(labId) ? c.labs : [...c.labs, labId] }
          return c
        })
      }

      return { ...prev, labs: nextLabs, courses: nextCourses }
    })
  }

  const deleteLab = (labId: string) => {
    const lab = data.labs.find((l) => l.id === labId)
    if (!lab) return
    const ok = confirm(`Delete lab ${lab.title} (${lab.id})? This will remove teacher assignments for this lab.`)
    if (!ok) return

    setData((prev) => {
      const nextLabs = prev.labs.filter((l) => l.id !== labId)
      const nextCourses = prev.courses.map((c) => ({
        ...c,
        labs: c.labs.filter((id) => id !== labId),
      }))
      const nextAssignments = prev.teacherAssignments.filter((a) => a.labId !== labId)

      const nextUsers = prev.users.map((u) => {
        const nextLabIds = (u.labIds || []).filter((id) => id !== labId)
        return {
          ...u,
          labIds: u.labIds ? nextLabIds : u.labIds,
        }
      })

      return {
        ...prev,
        labs: nextLabs,
        courses: nextCourses,
        teacherAssignments: nextAssignments,
        users: nextUsers,
      }
    })
  }

  return (
    <div className="courses-page">
      <div className="page-header">
        <h1>Courses & Labs</h1>
        <p className="muted">Admin: manage academic structure (mock server, persisted locally)</p>
      </div>

      <div className="grid">
        <div className="panel">
          <h2>Add Course</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Course ID (optional)</label>
              <input value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="e.g. csc-410" />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Course name" />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={addCourse}>
                Add
              </button>
            </div>
          </div>

          <h2 className="mt">All Courses</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Labs</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coursesSorted.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td>
                      <input value={c.name} onChange={(e) => updateCourse(c.id, { name: e.target.value })} />
                    </td>
                    <td>{c.labs.length}</td>
                    <td className="actions">
                      <button className="btn-danger" onClick={() => deleteCourse(c.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>Add Lab</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Course</label>
              <select value={labCourseId || data.courses[0]?.id || ''} onChange={(e) => setLabCourseId(e.target.value)}>
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Lab Title</label>
              <input value={labTitle} onChange={(e) => setLabTitle(e.target.value)} placeholder="Lab title" />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={addLab}>
                Add
              </button>
            </div>
          </div>

          <h2 className="mt">All Labs</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Experiments</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {labsSorted.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{l.id}</td>
                    <td>
                      <input value={l.title} onChange={(e) => updateLab(l.id, { title: e.target.value })} />
                    </td>
                    <td>
                      <select value={l.courseId} onChange={(e) => updateLab(l.id, { courseId: e.target.value })}>
                        {data.courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{l.experiments.length}</td>
                    <td className="actions">
                      <button className="btn-danger" onClick={() => deleteLab(l.id)}>
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
    </div>
  )
}
