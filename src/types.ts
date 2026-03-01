export type UserRole = 'student' | 'teacher' | 'hod' | 'admin'

export type User = {
  id: string
  name: string
  role: UserRole
  email?: string
  password?: string
  rollNo?: string
  batch?: string
  courseIds?: string[]
  labIds?: string[]
  year?: string
  semester?: string
  section?: string
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
  dueAt?: string
  latePenaltyPerDay?: number
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
  score?: number | null
  feedback?: string
  submittedAt?: string | null
  aiEvaluation?: {
    provider?: string
    model?: string
    codeQualityScore?: number
    outputMatchScore?: number
    rawScore?: number
    latePenalty?: number
    finalScore?: number
    daysLate?: number
    dueAt?: string | null
    submittedAt?: string | null
    reasoning?: string
    outputVerification?: string
    outputMatched?: boolean
    mistakeFlags?: string[]
    suspectedCheating?: boolean
    cheatingReason?: string
    issues?: string[]
    teacherOverride?: boolean
    teacherOverrideBy?: string
    teacherOverrideAt?: string | null
    teacherOverrideScore?: number | null
  } | null
  lastSaved: string
}

export type TerminalEntry = {
  id: string
  message: string
  level: 'info' | 'success' | 'error' | 'command'
}

export type AppData = {
  users: User[]
  courses: Course[]
  labs: Lab[]
  teacherAssignments: TeacherAssignment[]
  submissions: Submission[]
  submissionFiles: Record<string, ProjectFile[]>
}

export type ProjectFile = {
  id: string
  name: string
  content: string
  type: 'file' | 'folder'
  path: string
  isReadonly?: boolean
}
