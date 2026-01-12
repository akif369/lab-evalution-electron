import { useApp } from '../context/AppContext'
import './Profile.css'

export function Profile() {
  const { currentUser, data } = useApp()

  if (!currentUser) return null

  const userSubmissions = data.submissions.filter((s) => s.studentId === currentUser.id)
  const enrolledCourses = currentUser.courseIds
    ? data.courses.filter((c) => currentUser.courseIds?.includes(c.id))
    : []
  const enrolledLabs = currentUser.labIds
    ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
    : []

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <div>{currentUser.name}</div>
            </div>
            <div className="info-item">
              <label>User ID</label>
              <div>{currentUser.id}</div>
            </div>
            <div className="info-item">
              <label>Role</label>
              <div className="role-badge">{currentUser.role.toUpperCase()}</div>
            </div>
          </div>
        </div>

        {currentUser.role === 'student' && (
          <>
            <div className="profile-card">
              <h2>Enrolled Courses</h2>
              {enrolledCourses.length > 0 ? (
                <ul className="course-list">
                  {enrolledCourses.map((course) => (
                    <li key={course.id}>
                      <strong>{course.name}</strong>
                      <span className="muted">({course.id})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No courses enrolled</p>
              )}
            </div>

            <div className="profile-card">
              <h2>Enrolled Labs</h2>
              {enrolledLabs.length > 0 ? (
                <ul className="lab-list">
                  {enrolledLabs.map((lab) => (
                    <li key={lab.id}>
                      <strong>{lab.title}</strong>
                      <span className="muted">({lab.id})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No labs enrolled</p>
              )}
            </div>

            <div className="profile-card">
              <h2>Submission Statistics</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{userSubmissions.length}</div>
                  <div className="stat-label">Total Submissions</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {userSubmissions.filter((s) => s.status === 'submitted').length}
                  </div>
                  <div className="stat-label">Submitted</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {userSubmissions.filter((s) => s.status === 'validated').length}
                  </div>
                  <div className="stat-label">Validated</div>
                </div>
              </div>
            </div>
          </>
        )}

        {currentUser.role === 'teacher' && (
          <div className="profile-card">
            <h2>Assigned Labs</h2>
            {currentUser.labIds && currentUser.labIds.length > 0 ? (
              <ul className="lab-list">
                {data.labs
                  .filter((l) => currentUser.labIds?.includes(l.id))
                  .map((lab) => (
                    <li key={lab.id}>
                      <strong>{lab.title}</strong>
                      <span className="muted">({lab.id})</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">No labs assigned</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
