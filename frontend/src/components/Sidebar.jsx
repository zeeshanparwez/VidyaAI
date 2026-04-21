import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getNotifications } from '../api'

const TEACHER_NAV = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/syllabus', icon: '📚', label: 'Syllabus' },
    { path: '/timetable', icon: '📅', label: 'Timetable' },
    { path: '/session', icon: '🎯', label: 'Session Prep' },
    { path: '/quizzes', icon: '📝', label: 'Quizzes' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
    { path: '/announcements', icon: '📢', label: 'Announcements' },
]

const STUDENT_NAV = [
    { path: '/', icon: '📊', label: 'My Dashboard' },
    { path: '/courses', icon: '📚', label: 'Browse Courses' },
    { path: '/announcements', icon: '📢', label: 'Announcements' },
]

const ADMIN_NAV = [
    { path: '/', icon: '🛡️', label: 'Admin Panel' },
]

const THEMES = [
    { id: 'dark',  icon: '🌙', label: 'Dark' },
    { id: 'study', icon: '📖', label: 'Study' },
    { id: 'light', icon: '☀️', label: 'Light' },
]

export default function Sidebar({ user, onLogout, theme, setTheme }) {
    const location = useLocation()
    const navigate = useNavigate()
    const isTeacher = user?.role === 'teacher'
    const isAdmin   = user?.role === 'admin'
    const navItems = isAdmin ? ADMIN_NAV : isTeacher ? TEACHER_NAV : STUDENT_NAV

    const [notifs, setNotifs] = useState([])
    const [bellOpen, setBellOpen] = useState(false)
    const bellRef = useRef(null)

    useEffect(() => {
        if (!user?.user_id) return
        getNotifications(user.user_id)
            .then(data => setNotifs(data.notifications || []))
            .catch(() => {})
    }, [user?.user_id])

    useEffect(() => {
        const close = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    return (
        <aside className="sidebar">
            <div className="sidebar-logo" style={{ position: 'relative' }}>
                <div className="logo-icon">🧠</div>
                <div style={{ flex: 1 }}>
                    <h2>AI Prep Portal</h2>
                    <span>{isTeacher ? 'Teacher Portal' : 'Student Portal'}</span>
                </div>
                {/* Bell */}
                <div ref={bellRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        onClick={() => setBellOpen(o => !o)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, position: 'relative', padding: 4, color: 'var(--text-secondary)' }}
                        title="Notifications"
                    >
                        🔔
                        {notifs.length > 0 && (
                            <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {notifs.length > 9 ? '9+' : notifs.length}
                            </span>
                        )}
                    </button>
                    {bellOpen && (
                        <div style={{ position: 'absolute', top: '110%', right: 0, width: 280, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 999, maxHeight: 320, overflowY: 'auto' }}>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
                                🔔 Notifications {notifs.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>({notifs.length})</span>}
                            </div>
                            {notifs.length === 0 ? (
                                <div style={{ padding: '20px 14px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>All caught up! ✓</div>
                            ) : (
                                notifs.map((n, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { navigate(n.link || '/'); setBellOpen(false) }}
                                        style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8, background: 'transparent' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ flexShrink: 0, marginTop: 1 }}>{n.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                        <span style={{ color: 'var(--text-primary)' }}>{n.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-text">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="theme-switcher">
                <span className="theme-switcher-label">Theme</span>
                <div className="theme-btns">
                    {THEMES.map(t => (
                        <button
                            key={t.id}
                            className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                            onClick={() => setTheme(t.id)}
                            title={t.label}
                        >
                            {t.icon}
                            <span className="theme-btn-label">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="user-info">
                <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                <div style={{ flex: 1 }}>
                    <div className="user-name">{user?.name}</div>
                    <div className="user-role">{user?.role}</div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={onLogout} title="Log out">↪</button>
            </div>
        </aside>
    )
}
