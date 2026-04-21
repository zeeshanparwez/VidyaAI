import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StudentDashboard from './pages/StudentDashboard'
import SyllabusUpload from './pages/SyllabusUpload'
import Timetable from './pages/Timetable'
import SessionPrep from './pages/SessionPrep'
import LiveClassMode from './pages/LiveClassMode'
import QuizManager from './pages/QuizManager'
import StudentQuiz from './pages/StudentQuiz'
import Analytics from './pages/Analytics'
import CourseBrowser from './pages/CourseBrowser'
import Announcements from './pages/Announcements'
import AdminPanel from './pages/AdminPanel'

export default function App() {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('ac_user')
            return saved ? JSON.parse(saved) : null
        } catch { return null }
    })
    const [selectedSubject, setSelectedSubject] = useState(null)
    const [theme, setTheme] = useState(() => localStorage.getItem('acTheme') || 'dark')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('acTheme', theme)
    }, [theme])

    const handleLogout = () => {
        localStorage.removeItem('ac_user')
        localStorage.removeItem('ac_access_token')
        localStorage.removeItem('ac_refresh_token')
        setUser(null)
        setSelectedSubject(null)
    }

    if (!user) {
        return <Login onLogin={setUser} />
    }

    const isTeacher = user.role === 'teacher'

    return (
        <BrowserRouter>
            <Routes>
                {/* Fullscreen live mode — no sidebar */}
                {isTeacher && (
                    <Route path="/session/live/:planId" element={<LiveClassMode />} />
                )}

                {/* Main app layout */}
                <Route path="*" element={
                    <div className="app-layout">
                        <Sidebar user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
                        <main className="main-content">
                            <Routes>
                                {isTeacher ? (
                                    <>
                                        <Route path="/" element={<Dashboard user={user} selectedSubject={selectedSubject} onSelectSubject={setSelectedSubject} />} />
                                        <Route path="/syllabus" element={<SyllabusUpload user={user} selectedSubject={selectedSubject} />} />
                                        <Route path="/timetable" element={<Timetable user={user} selectedSubject={selectedSubject} />} />
                                        <Route path="/session" element={<SessionPrep user={user} selectedSubject={selectedSubject} />} />
                                        <Route path="/quizzes" element={<QuizManager user={user} selectedSubject={selectedSubject} />} />
                                        <Route path="/analytics" element={<Analytics user={user} selectedSubject={selectedSubject} />} />
                                        <Route path="/announcements" element={<Announcements user={user} selectedSubject={selectedSubject} />} />
                                    </>
                                ) : user.role === 'admin' ? (
                                    <>
                                        <Route path="/" element={<AdminPanel user={user} />} />
                                        <Route path="/admin" element={<AdminPanel user={user} />} />
                                    </>
                                ) : (
                                    <>
                                        <Route path="/" element={<StudentDashboard user={user} />} />
                                        <Route path="/courses" element={<CourseBrowser user={user} />} />
                                        <Route path="/quiz/:quizId" element={<StudentQuiz user={user} />} />
                                        <Route path="/announcements" element={<Announcements user={user} />} />
                                    </>
                                )}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </main>
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    )
}
