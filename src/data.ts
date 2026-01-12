import type { User, Course, Lab, TeacherAssignment } from './types'

export const users: User[] = [
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

export const courses: Course[] = [
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

export const labs: Lab[] = [
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

export const teacherAssignments: TeacherAssignment[] = [
  { id: 'assign-1', teacherId: 't-01', courseId: 'csc-410', labId: 'lab-os' },
  { id: 'assign-2', teacherId: 't-02', courseId: 'csc-320', labId: 'lab-algo' },
]

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 8)}`
export const nowStamp = () => new Date().toISOString()
