## Backend API Specification – Lab Evaluation App

This document describes the backend REST API needed to support the Electron lab-evaluation application.  
All examples assume a base URL of `/api` (e.g. `https://lab.example.edu/api/...`).

---

## 1. Data Models (JSON Shapes)

These match the current frontend types (see `src/types.ts` and `src/data.ts`).

### 1.1 User

```json
{
  "id": "stu-01",
  "name": "Aisha Khan",
  "role": "student",          // "student" | "teacher" | "hod" | "admin"
  "courseIds": ["csc-410"],
  "labIds": ["lab-os", "lab-net"]
}
```

> Passwords are handled only by the backend and **never** sent back to the client.

### 1.2 Course

```json
{
  "id": "csc-410",
  "name": "Advanced Systems (CSE)",
  "labs": ["lab-os", "lab-net"]
}
```

### 1.3 Experiment

```json
{
  "id": "exp-sched",
  "title": "Process Scheduling Simulator",
  "description": "Build a scheduler...",
  "expectedOutput": "Average waiting time and turnaround time per algorithm.",
  "hints": [
    "Start with a queue abstraction for Round Robin.",
    "Validate time quantum > 0 before running."
  ],
  "helperLinks": [
    "https://en.wikipedia.org/wiki/Round-robin_scheduling"
  ]
}
```

### 1.4 Lab

```json
{
  "id": "lab-os",
  "title": "Operating Systems Lab",
  "courseId": "csc-410",
  "experiments": [ /* array of Experiment objects */ ]
}
```

### 1.5 TeacherAssignment

```json
{
  "id": "assign-1",
  "teacherId": "t-01",
  "courseId": "csc-410",
  "labId": "lab-os"
}
```

### 1.6 Submission

```json
{
  "id": "sub-abc123",
  "studentId": "stu-01",
  "experimentId": "exp-sched",
  "status": "submitted",        // "draft" | "submitted" | "validated"
  "score": 92,                  // optional, 0–100
  "lastSaved": "2026-01-29T12:34:56.000Z"
}
```

### 1.7 Code File (ProjectFile)

```json
{
  "id": "file-xyz123",
  "name": "main.js",
  "content": "// student code here",
  "type": "file",              // "file" | "folder"
  "path": "main.js",
  "isReadonly": false          // optional, for template files
}
```

This is the format used when sending code to the backend for saving or grading.

---

## 2. Authentication & Session

### 2.1 `POST /api/auth/login`

**Description**: Log in as student/teacher/HOD/admin.

**Request (JSON)**

```json
{
  "idOrUsername": "stu-01",
  "password": "student"
}
```

**Response 200 (JSON)**

```json
{
  "token": "JWT_OR_SESSION_TOKEN",
  "user": {
    "id": "stu-01",
    "name": "Aisha Khan",
    "role": "student",
    "courseIds": ["csc-410"],
    "labIds": ["lab-os", "lab-net"]
  }
}
```

**Error 401**

```json
{ "error": "Invalid credentials" }
```

The `token` is sent in `Authorization: Bearer <token>` header for subsequent requests.

### 2.2 `GET /api/  c v/me`

**Description**: Get current logged-in user from token.

**Headers**

- `Authorization: Bearer <token>`

**Response 200**

```json
{
  "id": "stu-01",
  "name": "Aisha Khan",
  "role": "student",
  "courseIds": ["csc-410"],
  "labIds": ["lab-os", "lab-net"]
}
```

---

## 3. Courses, Labs, Experiments

These endpoints provide the static academic structure that is currently mocked in `data.ts`.

### 3.1 `GET /api/courses`

**Response 200**

```json
[
  {
    "id": "csc-410",
    "name": "Advanced Systems (CSE)",
    "labs": ["lab-os", "lab-net"]
  }
]
```

### 3.2 `GET /api/labs?courseId={courseId}`

**Example**: `/api/labs?courseId=csc-410`

**Response 200**

```json
[
  {
    "id": "lab-os",
    "title": "Operating Systems Lab",
    "courseId": "csc-410"
  }
]
```

(Optionally include `experiments` here to avoid extra calls.)

### 3.3 `GET /api/labs/:labId`

**Example**: `/api/labs/lab-os`

**Response 200**

```json
{
  "id": "lab-os",
  "title": "Operating Systems Lab",
  "courseId": "csc-410",
  "experiments": [
    {
      "id": "exp-sched",
      "title": "Process Scheduling Simulator",
      "description": "Build a scheduler...",
      "expectedOutput": "Average waiting time and turnaround time per algorithm.",
      "hints": [ "...", "..." ],
      "helperLinks": [ "...optional..." ]
    }
  ]
}
```

### 3.4 `GET /api/experiments/:experimentId`

**Example**: `/api/experiments/exp-sched`

**Response 200**

```json
{
  "id": "exp-sched",
  "title": "Process Scheduling Simulator",
  "description": "Build a scheduler...",
  "expectedOutput": "Average waiting time and turnaround time per algorithm.",
  "hints": [ "...", "..." ],
  "helperLinks": [ "...optional..." ]
}
```

### 3.5 (Optional) Teacher management of experiments

Used from teacher UI (Add Experiment, edit, etc.).

- **POST `/api/experiments`**
- **PUT `/api/experiments/:experimentId`**
- **DELETE `/api/experiments/:experimentId`**

Payload matches the Experiment JSON above.

---

## 4. Submissions (Student Side)

These endpoints persist what is currently kept only in frontend state (`submissions` + localStorage) and receive the code from the editor.

### 4.1 `POST /api/submissions`

**Description**: Create or update a submission (for both draft and submit flows). This is called from the Code Editor’s “Save Draft” and “Submit for Validation” buttons.

**Request (JSON)**

```json
{
  "studentId": "stu-01",
  "experimentId": "exp-sched",
  "status": "draft",              // "draft" | "submitted"
  "files": [
    {
      "id": "file-abc123",
      "name": "main.js",
      "content": "// Start coding your solution here...",
      "type": "file",
      "path": "main.js"
    }
  ]
}
```

**Response 200**

```json
{
  "submission": {
    "id": "sub-xyz789",
    "studentId": "stu-01",
    "experimentId": "exp-sched",
    "status": "draft",
    "score": null,
    "lastSaved": "2026-01-29T12:34:56.000Z"
  }
}
```

> If a submission already exists for that `(studentId, experimentId)`, the backend updates it instead of creating a new one.

### 4.2 `GET /api/submissions?studentId=&experimentId=`

**Example**: `/api/submissions?studentId=stu-01&experimentId=exp-sched`

**Response 200**

```json
{
  "submission": {
    "id": "sub-xyz789",
    "studentId": "stu-01",
    "experimentId": "exp-sched",
    "status": "submitted",
    "score": 85,
    "lastSaved": "2026-01-29T12:34:56.000Z"
  },
  "files": [
    {
      "id": "file-abc123",
      "name": "main.js",
      "content": "// student solution...",
      "type": "file",
      "path": "main.js"
    }
  ]
}
```

The frontend can use this to restore the student’s work when re-opening the experiment on another machine.

---

## 5. Submissions & Grading (Teacher / HOD)

### 5.1 `GET /api/experiments/:experimentId/submissions`

**Description**: List all submissions for an experiment (for teacher grading view).

**Response 200**

```json
[
  {
    "submission": {
      "id": "sub-xyz789",
      "studentId": "stu-01",
      "experimentId": "exp-sched",
      "status": "submitted",
      "score": 85,
      "lastSaved": "2026-01-29T12:34:56.000Z"
    },
    "student": {
      "id": "stu-01",
      "name": "Aisha Khan"
    }
  }
]
```

### 5.2 `GET /api/submissions/:submissionId`

Returns the submission plus associated files.

**Response 200**

```json
{
  "submission": { /* Submission */ },
  "files": [ /* array of ProjectFile */ ]
}
```

### 5.3 `PUT /api/submissions/:submissionId`

**Description**: Teacher validates and scores a submission.

**Request (JSON)**

```json
{
  "status": "validated",
  "score": 92,
  "feedback": "Good implementation, handle edge case X next time."
}
```

**Response 200**

```json
{
  "submission": {
    "id": "sub-xyz789",
    "studentId": "stu-01",
    "experimentId": "exp-sched",
    "status": "validated",
    "score": 92,
    "lastSaved": "2026-01-29T13:00:00.000Z"
  }
}
```

(Feedback can be stored either inside the `Submission` model or in a separate `comments` resource.)

---

## 6. Auto‑Grading / Code Execution (Optional but Recommended)

The frontend already sends code to Electron for **local execution**. A backend can provide remote grading by running the same code in a secure sandbox.

### 6.1 `POST /api/grade/run`

**Description**: Execute student code against test cases and compute a score.

**Request (JSON)**

```json
{
  "studentId": "stu-01",
  "experimentId": "exp-sched",
  "language": "js",                 // e.g. "c", "cpp", "py", "js"
  "files": [
    {
      "name": "main.js",
      "content": "// student solution...",
      "type": "file",
      "path": "main.js"
    }
  ]
}
```

**Response 200 (example)**

```json
{
  "score": 80,
  "passedCases": 4,
  "totalCases": 5,
  "stdout": "Test 1 passed\nTest 2 passed\n...",
  "stderr": "",
  "details": [
    { "case": 1, "input": "...", "expected": "...", "actual": "...", "passed": true }
  ]
}
```

The frontend can use this to display more detailed feedback or to automatically set `submission.score` before/after teacher review.

---

## 7. Teacher Assignment & Admin Endpoints (Optional)

These endpoints support HOD/admin workflows and navigation in the dashboard.

### 7.1 `GET /api/teacher-assignments?teacherId=`

Returns an array of `TeacherAssignment` for the teacher.

```json
[
  {
    "id": "assign-1",
    "teacherId": "t-01",
    "courseId": "csc-410",
    "labId": "lab-os"
  }
]
```

### 7.2 `GET /api/users?role=student|teacher|hod|admin`

For admin/HOD views of users.

### 7.3 `POST /api/users` / `PUT /api/users/:id` / `DELETE /api/users/:id`

Standard user-management endpoints, to be wired later into admin screens.

---

## 8. Integration Notes for the Existing Electron App

1. **Electron IPC → Backend**  
   Currently, the frontend calls `window.electronAPI.uploadCode(payload)` from `CodeEditor.tsx`. The Electron main process (`electron/main.js`) should translate this into an HTTP request to:
   - `POST /api/submissions` (for both drafts and submits), and optionally
   - `POST /api/grade/run` when `submitted: true` for auto‑grading.

2. **Data format**  
   - The `files` array sent from the renderer matches the `ProjectFile` schema above.
   - The backend should **not trust** `studentId` from the payload; instead, derive it from the authenticated token whenever possible.

3. **Offline / mock mode**  
   - While the backend is under development, the Electron main process can **short‑circuit** these HTTP calls and return mock responses with the same JSON shape described here.  
   - That guarantees the frontend does not need to change when the real backend is deployed.

This specification should be enough for a backend team to implement a secure REST API and for the Electron app to integrate later with minimal changes.

