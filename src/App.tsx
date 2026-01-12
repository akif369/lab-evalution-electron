import {
  type ClipboardEvent,
  type Dispatch,
  type DragEvent,
  type KeyboardEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './App.css'

type UserRole = 'student' | 'teacher' | 'hod' | 'admin'

type User = {
  id: string
  name: string
  role: UserRole
  password: string
  courseIds?: string[]
  labIds?: string[]
}

type Course = {
  id: string
  name: string
  labs: string[]
}

type Experiment = {
  id: string
  title: string
  description: string
  expectedOutput: string
  hints: string[]
  helperLinks?: string[]
}

type Lab = {
  id: string
  title: string
  courseId: string
  experiments: Experiment[]
}

type TeacherAssignment = {
  id: string
  teacherId: string
  courseId: string
  labId: string
}

type Submission = {
  id: string
  studentId: string
  experimentId: string
  status: 'draft' | 'submitted' | 'validated'
  score?: number
  lastSaved: string
}

type TerminalEntry = {
  id: string
  message: string
  level: 'info' | 'success' | 'error'
}

const users: User[] = [
  {
    id: 'stu-01',
    name: 'Aisha Khan',
    role: 'student',
    password: 'student',
    courseIds: ['csc-410'],
    labIds: ['lab-os', 'lab-net'],
  },
  {
    id: 'stu-02',
    name: 'Diego Silva',
    role: 'student',
    password: 'student',
    courseIds: ['csc-320'],
    labIds: ['lab-algo'],
  },
  {
    id: 't-01',
    name: 'Dr. Patel',
    role: 'teacher',
    password: 'teacher',
    courseIds: ['csc-410'],
    labIds: ['lab-os'],
  },
  {
    id: 't-02',
    name: 'Dr. Huang',
    role: 'teacher',
    password: 'teacher',
    courseIds: ['csc-320'],
    labIds: ['lab-algo'],
  },
  {
    id: 'hod-01',
    name: 'Prof. Amira Lee',
    role: 'hod',
    password: 'hod',
  },
  {
    id: 'admin-01',
    name: 'Admin',
    role: 'admin',
    password: 'admin',
  },
]

const courses: Course[] = [
  {
    id: 'csc-410',
    name: 'Advanced Systems (CSE)',
    labs: ['lab-os', 'lab-net'],
  },
  {
    id: 'csc-320',
    name: 'Algorithms & Complexity',
    labs: ['lab-algo'],
  },
]

const labs: Lab[] = [
  {
    id: 'lab-os',
    title: 'Operating Systems Lab',
    courseId: 'csc-410',
    experiments: [
      {
        id: 'exp-sched',
        title: 'Process Scheduling Simulator',
        description:
          'Build a scheduler that supports FCFS and Round Robin. Accept a list of processes with burst time.',
        expectedOutput: 'Average waiting time and turnaround time per algorithm.',
        hints: [
          'Start with a queue abstraction for Round Robin.',
          'Validate time quantum > 0 before running.',
          'Log each context switch for easier debugging.',
        ],
        helperLinks: ['https://en.wikipedia.org/wiki/Round-robin_scheduling'],
      },
      {
        id: 'exp-deadlock',
        title: 'Deadlock Detector',
        description:
          'Implement Bankers Algorithm to flag unsafe states. Input: allocation, need, available matrices.',
        expectedOutput: 'Safe/unsafe and an execution order if safe.',
        hints: [
          'Normalize matrix dimensions before processing.',
          'Prefer immutable updates so you can trace steps.',
        ],
      },
    ],
  },
  {
    id: 'lab-net',
    title: 'Networks Lab',
    courseId: 'csc-410',
    experiments: [
      {
        id: 'exp-ping',
        title: 'Ping Diagnostics',
        description:
          'Simulate ICMP echo requests with artificial latency and packet loss.',
        expectedOutput: 'Loss %, average latency, and min/max.',
        hints: ['Seed your RNG for repeatable tests.', 'Surface retry counts.'],
      },
    ],
  },
  {
    id: 'lab-algo',
    title: 'Algorithms Lab',
    courseId: 'csc-320',
    experiments: [
      {
        id: 'exp-dp',
        title: 'Dynamic Programming Warmup',
        description:
          'Solve coin change with memoization and tabulation. Input: denominations, target.',
        expectedOutput: 'Minimum coins + combination used.',
        hints: ['Cache by amount, not index.', 'Cover impossible cases early.'],
      },
    ],
  },
]

const teacherAssignments: TeacherAssignment[] = [
  { id: 'assign-1', teacherId: 't-01', courseId: 'csc-410', labId: 'lab-os' },
  { id: 'assign-2', teacherId: 't-02', courseId: 'csc-320', labId: 'lab-algo' },
]

const nowStamp = () => new Date().toISOString()
const uid = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 8)}`

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [data, setData] = useState<{
    courses: Course[]
    labs: Lab[]
    teacherAssignments: TeacherAssignment[]
    submissions: Submission[]
  }>({ courses, labs, teacherAssignments, submissions: [] })
  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0].id)
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>(
    labs[0].experiments[0].id,
  )
  const [terminal, setTerminal] = useState<TerminalEntry[]>([
    { id: uid('log'), message: 'Terminal ready', level: 'info' },
  ])
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({})
  const [editorWarning, setEditorWarning] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const selectedLab = useMemo(
    () => data.labs.find((lab) => lab.id === selectedLabId),
    [data.labs, selectedLabId],
  )
  const selectedExperiment = useMemo(() => {
    return selectedLab?.experiments.find((exp) => exp.id === selectedExperimentId)
  }, [selectedLab, selectedExperimentId])

  useEffect(() => {
    if (!selectedLab && data.labs.length > 0) {
      setSelectedLabId(data.labs[0].id)
      setSelectedExperimentId(data.labs[0].experiments[0]?.id ?? '')
    }
  }, [data.labs, selectedLab])

  const handleLogin = (id: string, password: string, role: UserRole) => {
    const found = users.find(
      (u) => u.id.toLowerCase() === id.toLowerCase() && u.password === password && u.role === role,
    )
    if (!found) {
      setAuthError('Invalid credentials or role')
      return
    }
    setAuthError(null)
    setCurrentUser(found)
    const firstLab = data.labs.find((lab) =>
      found.labIds ? found.labIds.includes(lab.id) : true,
    )
    if (firstLab) {
      setSelectedLabId(firstLab.id)
      setSelectedExperimentId(firstLab.experiments[0]?.id ?? '')
    }
  }

  const preventPaste = (event: ClipboardEvent | DragEvent | KeyboardEvent) => {
    event.preventDefault()
    setEditorWarning('Copy/paste and drag-drop are disabled to protect evaluation integrity.')
  }

  const appendTerminal = (entry: TerminalEntry) =>
    setTerminal((prev) => [...prev.slice(-6), entry])

  const saveDraft = async (isSubmit: boolean) => {
    if (!currentUser || currentUser.role !== 'student' || !selectedExperiment) return
    const draft = codeDrafts[selectedExperiment.id] ?? ''
    setStatusMessage(isSubmit ? 'Submitting to server...' : 'Saving draft to server...')
    appendTerminal({ id: uid('term'), message: 'Contacting backend (placeholder)...', level: 'info' })

    if (window.electronAPI?.uploadCode) {
      await window.electronAPI.uploadCode({
        studentId: currentUser.id,
        experimentId: selectedExperiment.id,
        code: draft,
        submitted: isSubmit,
      })
    }

    setData((prev) => {
      const existing = prev.submissions.find(
        (s) => s.studentId === currentUser.id && s.experimentId === selectedExperiment.id,
      )
      if (existing) {
        return {
          ...prev,
          submissions: prev.submissions.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  status: isSubmit ? 'submitted' : 'draft',
                  lastSaved: nowStamp(),
                }
              : s,
          ),
        }
      }
      return {
        ...prev,
        submissions: [
          ...prev.submissions,
          {
            id: uid('sub'),
            studentId: currentUser.id,
            experimentId: selectedExperiment.id,
            status: isSubmit ? 'submitted' : 'draft',
            lastSaved: nowStamp(),
          },
        ],
      }
    })

    appendTerminal({
      id: uid('term'),
      message: isSubmit ? 'Submitted. Backend will validate output.' : 'Draft saved (placeholder).',
      level: 'success',
    })
    setStatusMessage(null)
  }

  const runCode = () => {
    appendTerminal({ id: uid('term'), message: 'Running code in sandbox...', level: 'info' })
    setTimeout(() => {
      appendTerminal({
        id: uid('term'),
        message: 'Execution finished. Check backend validation results.',
        level: 'success',
      })
    }, 800)
  }

  const addTeacher = (name: string) => {
    const newTeacher: User = {
      id: uid('t'),
      name,
      role: 'teacher',
      password: 'teacher',
      courseIds: [],
      labIds: [],
    }
    users.push(newTeacher)
    setStatusMessage(`Created teacher account ${name} (default password: teacher)`)
  }

  const assignTeacher = (teacherId: string, courseId: string, labId: string) => {
    setData((prev) => ({
      ...prev,
      teacherAssignments: [
        ...prev.teacherAssignments,
        { id: uid('assign'), teacherId, courseId, labId },
      ],
    }))
  }

  const addExperiment = (labId: string, experiment: Omit<Experiment, 'id'>) => {
    setData((prev) => ({
      ...prev,
      labs: prev.labs.map((lab) =>
        lab.id === labId
          ? { ...lab, experiments: [...lab.experiments, { ...experiment, id: uid('exp') }] }
          : lab,
      ),
    }))
  }

  const studentSubmissions = useMemo(() => {
    if (!currentUser || currentUser.role !== 'student') return []
    return data.submissions.filter((s) => s.studentId === currentUser.id)
  }, [currentUser, data.submissions])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Lab Evaluation Workspace</h1>
          <p className="subtitle">
            Electron + React prototype with placeholder data. Backend hooks are stubbed for later.
          </p>
        </div>
        {currentUser ? (
          <div className="user-chip">
            <div>
              <strong>{currentUser.name}</strong>
              <span className="role-tag">{currentUser.role}</span>
            </div>
            <button className="ghost" onClick={() => setCurrentUser(null)}>
              Logout
            </button>
          </div>
        ) : null}
      </header>

      {!currentUser ? (
        <LoginForm onLogin={handleLogin} error={authError} />
      ) : (
        <main className="grid">
          {currentUser.role === 'student' && (
            <StudentPanel
              user={currentUser}
              data={data}
              selectedLabId={selectedLabId}
              onSelectLab={setSelectedLabId}
              selectedExperimentId={selectedExperimentId}
              onSelectExperiment={setSelectedExperimentId}
              codeDrafts={codeDrafts}
              setCodeDrafts={setCodeDrafts}
              preventPaste={preventPaste}
              editorWarning={editorWarning}
              terminal={terminal}
              runCode={runCode}
              saveDraft={saveDraft}
              statusMessage={statusMessage}
              submissions={studentSubmissions}
            />
          )}

          {currentUser.role === 'teacher' && (
            <TeacherPanel
              user={currentUser}
              data={data}
              onAddExperiment={addExperiment}
              terminal={terminal}
              runCode={runCode}
            />
          )}

          {currentUser.role === 'hod' && (
            <HodPanel
              data={data}
              onAddTeacher={addTeacher}
              onAssign={assignTeacher}
            />
          )}

          {currentUser.role === 'admin' && <AdminPanel data={data} />}
        </main>
      )}
    </div>
  )
}

type LoginFormProps = {
  onLogin: (id: string, password: string, role: UserRole) => void
  error: string | null
}

const LoginForm = ({ onLogin, error }: LoginFormProps) => {
  const [id, setId] = useState('stu-01')
  const [password, setPassword] = useState('student')
  const [role, setRole] = useState<UserRole>('student')

  return (
    <div className="panel login">
      <div>
        <h2>Sign in</h2>
        <p className="muted">Use hardcoded demo accounts (stu-01, t-01, hod-01, admin-01).</p>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <label>
        User ID
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="stu-01" />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="student"
        />
      </label>
      <label>
        Role
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="hod">HOD</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button onClick={() => onLogin(id, password, role)}>Enter workspace</button>
    </div>
  )
}

type StudentPanelProps = {
  user: User
  data: { courses: Course[]; labs: Lab[] }
  selectedLabId: string
  onSelectLab: (id: string) => void
  selectedExperimentId: string
  onSelectExperiment: (id: string) => void
  codeDrafts: Record<string, string>
  setCodeDrafts: Dispatch<SetStateAction<Record<string, string>>>
  preventPaste: (e: ClipboardEvent | DragEvent | KeyboardEvent) => void
  editorWarning: string | null
  terminal: TerminalEntry[]
  runCode: () => void
  saveDraft: (isSubmit: boolean) => void
  statusMessage: string | null
  submissions: Submission[]
}

const StudentPanel = ({
  user,
  data,
  selectedLabId,
  onSelectLab,
  selectedExperimentId,
  onSelectExperiment,
  codeDrafts,
  setCodeDrafts,
  preventPaste,
  editorWarning,
  terminal,
  runCode,
  saveDraft,
  statusMessage,
  submissions,
}: StudentPanelProps) => {
  const enrolledLabs = data.labs.filter((lab) => user.labIds?.includes(lab.id))
  const selectedLab = enrolledLabs.find((lab) => lab.id === selectedLabId) ?? enrolledLabs[0]
  const selectedExperiment =
    selectedLab?.experiments.find((exp) => exp.id === selectedExperimentId) ??
    selectedLab?.experiments[0]
  const draftValue = selectedExperiment ? codeDrafts[selectedExperiment.id] ?? '' : ''

  useEffect(() => {
    if (selectedLab && !selectedLab.experiments.find((exp) => exp.id === selectedExperimentId)) {
      onSelectExperiment(selectedLab.experiments[0]?.id ?? '')
    }
  }, [selectedLab, selectedExperimentId, onSelectExperiment])

  const submissionStatus = selectedExperiment
    ? submissions.find((s) => s.experimentId === selectedExperiment.id)
    : null

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Student workspace</h2>
            <p className="muted">
              Enrolled labs pulled from placeholder data. Copy/paste is disabled inside the editor.
            </p>
          </div>
          {submissionStatus ? (
            <span className="badge success">
              {submissionStatus.status} • {new Date(submissionStatus.lastSaved).toLocaleTimeString()}
            </span>
          ) : (
            <span className="badge">Not saved</span>
          )}
        </div>

        <div className="split">
          <div className="column">
            <label>
              Lab
              <select value={selectedLab?.id ?? ''} onChange={(e) => onSelectLab(e.target.value)}>
                {enrolledLabs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Experiment
              <select
                value={selectedExperiment?.id ?? ''}
                onChange={(e) => onSelectExperiment(e.target.value)}
              >
                {selectedLab?.experiments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.title}
                  </option>
                ))}
              </select>
            </label>

            {selectedExperiment ? (
              <div className="callout">
                <h3>{selectedExperiment.title}</h3>
                <p>{selectedExperiment.description}</p>
                <div className="muted small">
                  Expected output: {selectedExperiment.expectedOutput}
                </div>
              </div>
            ) : null}

            <div className="hints">
              <h4>Hints & helpers</h4>
              <ul>
                {selectedExperiment?.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
              {selectedExperiment?.helperLinks?.length ? (
                <div className="muted small">Links: {selectedExperiment.helperLinks.join(', ')}</div>
              ) : null}
            </div>
          </div>

          <div className="column editor">
            <div className="editor-header">
              <div>
                <h4>Code editor</h4>
                <p className="muted small">
                  Paste, drag-drop and Ctrl/Cmd+V are blocked by policy. Type code manually.
                </p>
              </div>
              <div className="actions">
                <button onClick={() => saveDraft(false)} disabled={!selectedExperiment}>
                  Save draft
                </button>
                <button className="primary" onClick={() => saveDraft(true)} disabled={!selectedExperiment}>
                  Submit for validation
                </button>
              </div>
            </div>
            <textarea
              className="code-editor"
              spellCheck={false}
              value={draftValue}
              placeholder="// Start coding your solution..."
              onChange={(e) =>
                selectedExperiment &&
                setCodeDrafts((prev) => ({ ...prev, [selectedExperiment.id]: e.target.value }))
              }
              onPaste={preventPaste}
              onDrop={preventPaste}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') preventPaste(e)
              }}
            />
            {editorWarning ? <div className="alert warning">{editorWarning}</div> : null}
            {statusMessage ? <div className="muted">{statusMessage}</div> : null}
          </div>
        </div>

        <div className="split terminal-row">
          <div className="column">
            <div className="panel-section">
              <div className="panel-header">
                <h4>Terminal (simulated)</h4>
                <button className="ghost" onClick={runCode}>
                  Run / Test
                </button>
              </div>
              <div className="terminal">
                {terminal.map((entry) => (
                  <div key={entry.id} className={`line ${entry.level}`}>
                    {entry.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="column">
            <div className="panel-section">
              <h4>Progress</h4>
              <ul className="progress">
                {selectedLab?.experiments.map((exp) => {
                  const submission = submissions.find((s) => s.experimentId === exp.id)
                  return (
                    <li key={exp.id}>
                      <div>
                        <strong>{exp.title}</strong>
                        <span className="muted small">{exp.id}</span>
                      </div>
                      <span className={`badge ${submission ? 'success' : ''}`}>
                        {submission ? submission.status : 'pending'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

type TeacherPanelProps = {
  user: User
  data: { courses: Course[]; labs: Lab[]; teacherAssignments: TeacherAssignment[] }
  onAddExperiment: (labId: string, experiment: Omit<Experiment, 'id'>) => void
  terminal: TerminalEntry[]
  runCode: () => void
}

const TeacherPanel = ({ user, data, onAddExperiment, terminal, runCode }: TeacherPanelProps) => {
  const assignedLabs = data.teacherAssignments
    .filter((a) => a.teacherId === user.id)
    .map((a) => data.labs.find((l) => l.id === a.labId))
    .filter(Boolean) as Lab[]
  const [labId, setLabId] = useState<string>(assignedLabs[0]?.id ?? '')
  const [form, setForm] = useState({
    title: '',
    description: '',
    expectedOutput: '',
    hints: '',
    helperLinks: '',
  })

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Teacher space</h2>
        <p className="muted">
          Add experiments with expected outputs, hints, and helper links. Students see hints in their
          sidebar.
        </p>
      </div>

      <div className="split">
        <div className="column">
          <h4>Assigned labs</h4>
          <ul className="list">
            {assignedLabs.map((lab) => (
              <li key={lab.id}>
                <div>
                  <strong>{lab.title}</strong>
                  <p className="muted small">
                    Experiments: {lab.experiments.length} • Course:{' '}
                    {data.courses.find((c) => c.id === lab.courseId)?.name}
                  </p>
                </div>
                <span className="badge">{lab.id}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="column">
          <h4>Add experiment</h4>
          <label>
            Target lab
            <select value={labId} onChange={(e) => setLabId(e.target.value)}>
              {assignedLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Thread-safe queue"
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <label>
            Expected output
            <input
              value={form.expectedOutput}
              onChange={(e) => setForm((p) => ({ ...p, expectedOutput: e.target.value }))}
              placeholder="What should be validated in backend"
            />
          </label>
          <label>
            Hints (comma separated)
            <input
              value={form.hints}
              onChange={(e) => setForm((p) => ({ ...p, hints: e.target.value }))}
              placeholder="Hint one, Hint two"
            />
          </label>
          <label>
            Helper links (comma separated)
            <input
              value={form.helperLinks}
              onChange={(e) => setForm((p) => ({ ...p, helperLinks: e.target.value }))}
              placeholder="Docs, References"
            />
          </label>
          <div className="actions">
            <button
              className="primary"
              onClick={() => {
                if (!labId) return
                onAddExperiment(labId, {
                  title: form.title || 'Untitled',
                  description: form.description || 'No description',
                  expectedOutput: form.expectedOutput || 'See backend check',
                  hints: form.hints
                    .split(',')
                    .map((h) => h.trim())
                    .filter(Boolean),
                  helperLinks: form.helperLinks
                    .split(',')
                    .map((h) => h.trim())
                    .filter(Boolean),
                })
                setForm({
                  title: '',
                  description: '',
                  expectedOutput: '',
                  hints: '',
                  helperLinks: '',
                })
              }}
            >
              Save experiment
            </button>
            <button className="ghost" onClick={runCode}>
              Open terminal
            </button>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-header">
          <h4>Terminal (shared view)</h4>
          <span className="muted small">Backend execution happens server-side; this is a stub.</span>
        </div>
        <div className="terminal">
          {terminal.map((entry) => (
            <div key={entry.id} className={`line ${entry.level}`}>
              {entry.message}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

type HodPanelProps = {
  data: { courses: Course[]; labs: Lab[]; teacherAssignments: TeacherAssignment[] }
  onAddTeacher: (name: string) => void
  onAssign: (teacherId: string, courseId: string, labId: string) => void
}

const HodPanel = ({ data, onAddTeacher, onAssign }: HodPanelProps) => {
  const [teacherName, setTeacherName] = useState('')
  const teacherList = users.filter((u) => u.role === 'teacher')
  const [assignment, setAssignment] = useState({
    teacherId: teacherList[0]?.id ?? '',
    courseId: data.courses[0]?.id ?? '',
    labId: data.labs[0]?.id ?? '',
  })

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>HOD control</h2>
        <p className="muted">
          Add teachers, assign labs and courses. Data is stored in-memory for prototyping.
        </p>
      </div>

      <div className="split">
        <div className="column">
          <h4>Add teacher</h4>
          <label>
            Name
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Dr. Smith"
            />
          </label>
          <button
            onClick={() => {
              if (!teacherName) return
              onAddTeacher(teacherName)
              setTeacherName('')
            }}
          >
            Create teacher
          </button>
          <p className="muted small">Default password set to "teacher".</p>
        </div>

        <div className="column">
          <h4>Assign lab to teacher</h4>
          <label>
            Teacher
            <select
              value={assignment.teacherId}
              onChange={(e) => setAssignment((p) => ({ ...p, teacherId: e.target.value }))}
            >
              {teacherList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Course
            <select
              value={assignment.courseId}
              onChange={(e) => setAssignment((p) => ({ ...p, courseId: e.target.value }))}
            >
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lab
            <select
              value={assignment.labId}
              onChange={(e) => setAssignment((p) => ({ ...p, labId: e.target.value }))}
            >
              {data.labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => onAssign(assignment.teacherId, assignment.courseId, assignment.labId)}>
            Assign
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h4>Current assignments</h4>
        <ul className="list">
          {data.teacherAssignments.map((a) => {
            const teacher = users.find((u) => u.id === a.teacherId)
            const lab = data.labs.find((l) => l.id === a.labId)
            const course = data.courses.find((c) => c.id === a.courseId)
            return (
              <li key={a.id}>
                <div>
                  <strong>{teacher?.name}</strong>
                  <p className="muted small">
                    {lab?.title} • {course?.name}
                  </p>
                </div>
                <span className="badge">{a.id}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

const AdminPanel = ({ data }: { data: { courses: Course[]; labs: Lab[]; teacherAssignments: TeacherAssignment[] } }) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Admin overview</h2>
        <p className="muted">System snapshot for quick QA of placeholder data.</p>
      </div>
      <div className="stats">
        <div className="stat">
          <strong>{users.filter((u) => u.role === 'student').length}</strong>
          <span>Students</span>
        </div>
        <div className="stat">
          <strong>{users.filter((u) => u.role === 'teacher').length}</strong>
          <span>Teachers</span>
        </div>
        <div className="stat">
          <strong>{data.labs.length}</strong>
          <span>Labs</span>
        </div>
        <div className="stat">
          <strong>{data.teacherAssignments.length}</strong>
          <span>Assignments</span>
        </div>
      </div>
      <div className="panel-section">
        <h4>Data integrity</h4>
        <ul className="list">
          <li>
            <div>
              <strong>Backend integration</strong>
              <p className="muted small">
                Electron preload exposes window.electronAPI.uploadCode for future server calls.
              </p>
            </div>
            <span className="badge success">stubbed</span>
          </li>
          <li>
            <div>
              <strong>Clipboard policy</strong>
              <p className="muted small">
                Copy/paste blocked in student editor via paste + drop intercept and Ctrl/Cmd+V guard.
              </p>
            </div>
            <span className="badge success">enforced</span>
          </li>
          <li>
            <div>
              <strong>Terminal & validation</strong>
              <p className="muted small">
                Terminal is simulated; actual evaluation belongs in backend service endpoints.
              </p>
            </div>
            <span className="badge">placeholder</span>
          </li>
        </ul>
      </div>
    </section>
  )
}

export default App
