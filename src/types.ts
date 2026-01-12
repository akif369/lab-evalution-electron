export type UserRole = 'student' | 'teacher' | 'hod' | 'admin'

export type User = {
  id: string
  name: string
  role: UserRole
  password: string
  courseIds?: string[]
  labIds?: string[]
}

export type Course = {
  id: string
  name: string
  labs: string[]
}

export type Experiment = {
  id: string
  title: string
  description: string
  expectedOutput: string
  hints: string[]
  helperLinks?: string[]
}

export type Lab = {
  id: string
  title: string
  courseId: string
  experiments: Experiment[]
}

export type TeacherAssignment = {
  id: string
  teacherId: string
  courseId: string
  labId: string
}

export type Submission = {
  id: string
  studentId: string
  experimentId: string
  status: 'draft' | 'submitted' | 'validated'
  score?: number
  lastSaved: string
}

export type TerminalEntry = {
  id: string
  message: string
  level: 'info' | 'success' | 'error' | 'command'
}

export type AppData = {
  courses: Course[]
  labs: Lab[]
  teacherAssignments: TeacherAssignment[]
  submissions: Submission[]
}

export type ProjectFile = {
  id: string
  name: string
  content: string
  type: 'file' | 'folder'
  path: string
  isReadonly?: boolean
}
