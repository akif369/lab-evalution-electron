import type {
  AppData,
  Experiment,
  Lab,
  ProjectFile,
  Submission,
  TeacherAssignment,
  User,
  UserRole,
} from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

type RequestOptions = RequestInit & {
  token?: string | null
}

type ApiSubmissionResponse = {
  submission: Submission
  files?: ProjectFile[]
  student?: { id: string; name: string } | null
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const mapUser = (raw: Record<string, unknown>): User => ({
  id: String(raw.id ?? raw._id ?? ''),
  name: String(raw.name ?? ''),
  role: String(raw.role ?? 'student') as UserRole,
  email: raw.email ? String(raw.email) : undefined,
  rollNo: raw.rollNo ? String(raw.rollNo) : undefined,
  batch: raw.batch ? String(raw.batch) : undefined,
  year: raw.year ? String(raw.year) : undefined,
  semester: raw.semester ? String(raw.semester) : undefined,
  section: raw.section ? String(raw.section) : undefined,
  courseIds: Array.isArray(raw.courseIds) ? raw.courseIds.map(String) : undefined,
  labIds: Array.isArray(raw.labIds) ? raw.labIds.map(String) : undefined,
})

const mapExperiment = (raw: Record<string, unknown>): Experiment => ({
  id: String(raw.id ?? raw._id ?? ''),
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  expectedOutput: String(raw.expectedOutput ?? ''),
  hints: Array.isArray(raw.hints) ? raw.hints.map(String) : [],
  helperLinks: Array.isArray(raw.helperLinks) ? raw.helperLinks.map(String) : undefined,
})

const mapSubmission = (raw: Record<string, unknown>): Submission => ({
  id: String(raw.id ?? raw._id ?? ''),
  studentId: String(raw.studentId ?? ''),
  experimentId: String(raw.experimentId ?? ''),
  status: (raw.status as Submission['status']) || 'draft',
  score: typeof raw.score === 'number' ? raw.score : null,
  feedback: raw.feedback ? String(raw.feedback) : undefined,
  lastSaved: String(raw.lastSaved ?? new Date().toISOString()),
})

const makeCourseId = (subject: string) =>
  subject
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'general'

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && ('message' in body || 'error' in body)
        ? String((body as { message?: string; error?: string }).message || (body as { error?: string }).error)
        : null) || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return body as T
}

export const apiBaseUrl = API_BASE_URL

export async function login(payload: {
  idOrUsername: string
  password: string
  role?: UserRole
}): Promise<{ token: string; user: User }> {
  const trimmed = payload.idOrUsername.trim()
  const requestBody: Record<string, unknown> = {
    idOrUsername: trimmed,
    password: payload.password,
    role: payload.role,
  }

  if (trimmed.includes('@')) {
    requestBody.email = trimmed
  }

  const result = await request<{ token: string; user: Record<string, unknown> }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  return {
    token: result.token,
    user: mapUser(result.user),
  }
}

export async function getMe(token: string): Promise<User> {
  const user = await request<Record<string, unknown>>('/auth/me', { token })
  return mapUser(user)
}

export async function getUsers(token: string, role?: UserRole): Promise<User[]> {
  const query = role ? `?role=${encodeURIComponent(role)}` : ''
  const users = await request<Array<Record<string, unknown>>>(`/users${query}`, { token })
  return users.map(mapUser)
}

export async function createUser(
  token: string,
  payload: {
    name: string
    email: string
    password: string
    role: UserRole
    rollNo?: string
    batch?: string
    year?: string
    semester?: string
    section?: string
    courseIds?: string[]
    labIds?: string[]
  },
): Promise<User> {
  const response = await request<{ user: Record<string, unknown> }>('/users', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  return mapUser(response.user)
}

export async function updateUser(
  token: string,
  userId: string,
  payload: Partial<{
    name: string
    email: string
    password: string
    role: UserRole
    rollNo: string
    batch: string
    year: string
    semester: string
    section: string
    courseIds: string[]
    labIds: string[]
  }>,
): Promise<User> {
  const response = await request<{ user: Record<string, unknown> }>(`/users/${userId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
  return mapUser(response.user)
}

export async function changeMyPassword(
  token: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<void> {
  await request<{ message: string }>('/users/me/password', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export async function changeUserPassword(
  token: string,
  userId: string,
  payload: { newPassword: string },
): Promise<void> {
  await request<{ message: string }>(`/users/${userId}/password`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export async function deleteUser(token: string, userId: string): Promise<void> {
  await request<{ message: string }>(`/users/${userId}`, {
    method: 'DELETE',
    token,
  })
}

type RawLab = {
  _id: string
  name: string
  subject?: string
  assignedTeachers?: Array<string | { _id?: string; id?: string }>
}

export async function getLabs(token: string): Promise<RawLab[]> {
  return request<RawLab[]>('/labs', { token })
}

export async function getProblemsByLab(
  token: string,
  labId: string,
): Promise<Array<Record<string, unknown>>> {
  return request<Array<Record<string, unknown>>>(`/problems/lab/${labId}`, { token })
}

export async function createExperiment(
  token: string,
  payload: {
    labId: string
    title: string
    description: string
    expectedOutput: string
    hints: string[]
    helperLinks?: string[]
  },
): Promise<Experiment> {
  const response = await request<{ problem: Record<string, unknown> }>('/problems', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  return mapExperiment(response.problem)
}

export async function updateExperiment(
  token: string,
  experimentId: string,
  payload: Partial<{
    title: string
    description: string
    expectedOutput: string
    hints: string[]
    helperLinks: string[]
  }>,
): Promise<Experiment> {
  const response = await request<{ problem: Record<string, unknown> }>(`/problems/${experimentId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
  return mapExperiment(response.problem)
}

export async function deleteExperiment(token: string, experimentId: string): Promise<void> {
  await request<{ message: string }>(`/problems/${experimentId}`, {
    method: 'DELETE',
    token,
  })
}

export async function upsertSubmission(
  token: string,
  payload: {
    experimentId: string
    status: 'draft' | 'submitted'
    files: ProjectFile[]
  },
): Promise<Submission> {
  const response = await request<ApiSubmissionResponse>('/submissions', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  return mapSubmission(response.submission as unknown as Record<string, unknown>)
}

export async function getMySubmission(
  token: string,
  experimentId: string,
): Promise<{ submission: Submission | null; files: ProjectFile[] }> {
  const response = await request<{ submission: Record<string, unknown> | null; files?: ProjectFile[] }>(
    `/submissions?experimentId=${encodeURIComponent(experimentId)}`,
    { token },
  )
  return {
    submission: response.submission ? mapSubmission(response.submission) : null,
    files: Array.isArray(response.files) ? response.files : [],
  }
}

export async function getExperimentSubmissions(
  token: string,
  experimentId: string,
): Promise<Array<{ submission: Submission; student: { id: string; name: string; email?: string } }>> {
  const response = await request<
    Array<{
      submission: Record<string, unknown>
      student: { id?: string; _id?: string; name?: string; email?: string }
    }>
  >(`/experiments/${experimentId}/submissions`, { token })

  return response.map((row) => ({
    submission: mapSubmission(row.submission),
    student: {
      id: String(row.student.id ?? row.student._id ?? ''),
      name: String(row.student.name ?? ''),
      email: row.student.email,
    },
  }))
}

export async function getSubmissionById(
  token: string,
  submissionId: string,
): Promise<{ submission: Submission; files: ProjectFile[]; student: { id: string; name: string } | null }> {
  const response = await request<{
    submission: Record<string, unknown>
    files?: ProjectFile[]
    student?: { id?: string; name?: string } | null
  }>(`/submissions/${submissionId}`, { token })

  return {
    submission: mapSubmission(response.submission),
    files: Array.isArray(response.files) ? response.files : [],
    student: response.student
      ? {
          id: String(response.student.id ?? ''),
          name: String(response.student.name ?? ''),
        }
      : null,
  }
}

export async function validateSubmission(
  token: string,
  submissionId: string,
  payload: { score: number; feedback?: string },
): Promise<Submission> {
  const response = await request<ApiSubmissionResponse>(`/submissions/${submissionId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
  return mapSubmission(response.submission as unknown as Record<string, unknown>)
}

export async function loadAppData(token: string): Promise<Pick<AppData, 'users' | 'courses' | 'labs' | 'teacherAssignments'>> {
  const [users, rawLabs] = await Promise.all([
    getUsers(token).catch(() => [] as User[]),
    getLabs(token),
  ])

  const experimentsByLab = await Promise.all(
    rawLabs.map(async (lab) => {
      const experiments = await getProblemsByLab(token, lab._id).catch(() => [])
      return { labId: lab._id, experiments: experiments.map(mapExperiment) }
    }),
  )

  const experimentsLookup = new Map(experimentsByLab.map((row) => [row.labId, row.experiments]))
  const labs: Lab[] = rawLabs.map((lab) => ({
    id: lab._id,
    title: lab.name,
    courseId: makeCourseId(lab.subject || 'General'),
    experiments: experimentsLookup.get(lab._id) || [],
  }))

  const courseMap = new Map<string, { id: string; name: string; labs: string[] }>()
  for (const lab of rawLabs) {
    const courseId = makeCourseId(lab.subject || 'General')
    const existing = courseMap.get(courseId)
    if (existing) {
      existing.labs.push(lab._id)
    } else {
      courseMap.set(courseId, {
        id: courseId,
        name: lab.subject || 'General',
        labs: [lab._id],
      })
    }
  }

  const teacherAssignments: TeacherAssignment[] = rawLabs.flatMap((lab) => {
    const courseId = makeCourseId(lab.subject || 'General')
    const teachers = Array.isArray(lab.assignedTeachers) ? lab.assignedTeachers : []
    return teachers
      .map((teacher) => {
        const teacherId = typeof teacher === 'string' ? teacher : teacher?._id || teacher?.id
        if (!teacherId) return null
        return {
          id: `assign-${teacherId}-${lab._id}`,
          teacherId: String(teacherId),
          courseId,
          labId: lab._id,
        }
      })
      .filter((item): item is TeacherAssignment => item !== null)
  })

  const teacherLabMap = new Map<string, Set<string>>()
  const teacherCourseMap = new Map<string, Set<string>>()
  for (const assignment of teacherAssignments) {
    if (!teacherLabMap.has(assignment.teacherId)) teacherLabMap.set(assignment.teacherId, new Set())
    if (!teacherCourseMap.has(assignment.teacherId)) teacherCourseMap.set(assignment.teacherId, new Set())
    teacherLabMap.get(assignment.teacherId)?.add(assignment.labId)
    teacherCourseMap.get(assignment.teacherId)?.add(assignment.courseId)
  }

  const allLabIds = labs.map((lab) => lab.id)
  const allCourseIds = Array.from(courseMap.keys())
  const patchedUsers = users.map((user) => {
    if (user.role === 'teacher') {
      return {
        ...user,
        labIds: Array.from(teacherLabMap.get(user.id) || []),
        courseIds: Array.from(teacherCourseMap.get(user.id) || []),
      }
    }

    if (user.role === 'student') {
      return {
        ...user,
        labIds: user.labIds && user.labIds.length > 0 ? user.labIds : allLabIds,
        courseIds: user.courseIds && user.courseIds.length > 0 ? user.courseIds : allCourseIds,
      }
    }

    return {
      ...user,
      labIds: user.labIds && user.labIds.length > 0 ? user.labIds : allLabIds,
      courseIds: user.courseIds && user.courseIds.length > 0 ? user.courseIds : allCourseIds,
    }
  })

  return {
    users: patchedUsers,
    courses: Array.from(courseMap.values()),
    labs,
    teacherAssignments,
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
