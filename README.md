# Lab Evaluation System - Electron Application

A desktop application for college lab evaluation and assessment, built with Electron, React, TypeScript, and Vite.

## Features

### Student Features
- **Dashboard**: View enrolled labs, submission statistics, and recent activity
- **Profile Page**: View personal information, enrolled courses/labs, and submission statistics
- **All Experiments Page**: Browse and search experiments by lab
- **Code Editor Page**: 
  - Code editor with copy/paste restrictions (for evaluation integrity)
  - Sidebar with experiment hints and helpers
  - Terminal simulation for running/testing code
  - Save draft and submit for validation
  - View submission status and scores

### Teacher Features
- **Dashboard**: Overview of assigned labs and student statistics
- **Add Experiment**: Create new experiments with descriptions, expected outputs, hints, and helper links
- **Students Page**: View student statistics and submissions
- **Experiments Page**: Manage experiments

### HOD Features
- **Teachers Management**: Add new teachers
- **Assignments**: Assign labs and courses to teachers
- **Dashboard**: Overview of system

### Admin Features
- **Dashboard**: System overview
- **User Management**: Manage all users
- **Course Management**: Manage courses

## Tech Stack

- **Electron**: Desktop application framework
- **React**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing

## Installation

```bash
npm install
```

## Development

Run the application in development mode (starts both Vite dev server and Electron):

```bash
npm run dev
```

This will:
1. Start the Vite dev server on `http://localhost:5173`
2. Launch Electron and load the dev server URL

## Building

Build the React app for production:

```bash
npm run build
```

Run the production Electron app:

```bash
npm start
```

## Demo Accounts

### Student
- **ID**: `stu-01`
- **Password**: `student`
- **Name**: Aisha Khan

### Teacher
- **ID**: `t-01`
- **Password**: `teacher`
- **Name**: Dr. Patel

### HOD
- **ID**: `hod-01`
- **Password**: `hod`
- **Name**: Prof. Amira Lee

### Admin
- **ID**: `admin-01`
- **Password**: `admin`
- **Name**: Admin

## Project Structure

```
electron-lab/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script for IPC
├── src/
│   ├── components/
│   │   ├── Layout.tsx    # Main layout with sidebar navigation
│   │   └── Layout.css
│   ├── context/
│   │   └── AppContext.tsx # Global app state management
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Profile.tsx
│   │   ├── Experiments.tsx
│   │   ├── CodeEditor.tsx
│   │   ├── AddExperiment.tsx
│   │   ├── Students.tsx
│   │   ├── Teachers.tsx
│   │   └── Assignments.tsx
│   ├── types.ts          # TypeScript type definitions
│   ├── data.ts           # Hardcoded placeholder data
│   ├── App.tsx           # Main app component with routing
│   └── main.tsx          # React entry point
└── package.json
```

## Key Features

### Code Editor Restrictions
- Copy/paste is disabled (Ctrl/Cmd+V blocked)
- Drag and drop is disabled
- Students must type code manually to ensure evaluation integrity

### Backend Integration Points
The application is designed to integrate with a backend API. Key integration points:

1. **Code Upload**: `electron/main.js` - `upload-code` IPC handler
2. **Code Validation**: Backend should validate submitted code and return results
3. **User Authentication**: Currently using hardcoded users, should connect to backend
4. **Data Fetching**: All data is currently hardcoded, should fetch from backend

### IPC Communication
The app uses Electron IPC for communication between renderer and main process:

- `window.electronAPI.uploadCode()` - Upload code to backend
- `window.electronAPI.ping()` - Test IPC connection

## Future Enhancements

- [ ] Connect to real backend API
- [ ] Implement actual code execution/validation
- [ ] Add real terminal integration
- [ ] Add file upload/download capabilities
- [ ] Implement real-time updates
- [ ] Add more comprehensive error handling
- [ ] Add unit and integration tests

## License

MIT
