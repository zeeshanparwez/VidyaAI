import React, { useState } from 'react'
import { login, register, TokenStore } from '../api'

export default function Login({ onLogin }) {
    const [tab, setTab] = useState('login') // login | register
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState('student')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const data = await login(email, password)
            // Store JWT tokens
            TokenStore.setTokens(data.access_token, data.refresh_token)
            // Persist user info for session restore
            const userInfo = {
                user_id: data.user_id,
                name: data.name,
                email: data.email,
                role: data.role,
            }
            localStorage.setItem('ac_user', JSON.stringify(userInfo))
            onLogin(userInfo)
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        setLoading(true)
        setError('')
        try {
            await register(name, email, password, role)
            // Auto-login after register
            const data = await login(email, password)
            TokenStore.setTokens(data.access_token, data.refresh_token)
            const userInfo = { user_id: data.user_id, name: data.name, email: data.email, role: data.role }
            localStorage.setItem('ac_user', JSON.stringify(userInfo))
            onLogin(userInfo)
        } catch (err) {
            setError(err.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    const fillDemo = (demoEmail) => {
        setEmail(demoEmail)
        setPassword('password')
        setTab('login')
        setError('')
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 16 }}>🧠</div>
                <h1>AI Teacher Prep Portal</h1>
                <p className="subtitle">Smart session preparation powered by AI agents</p>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-primary)', borderRadius: 8, padding: 4 }}>
                    {[{ id: 'login', label: 'Sign In' }, { id: 'register', label: 'Create Account' }].map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setTab(t.id); setError('') }}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: 14, transition: 'all 0.15s',
                                background: tab === t.id ? 'var(--accent)' : 'transparent',
                                color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'login' ? (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {error && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{error}</div>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }} disabled={loading}>
                            {loading ? '⏳ Signing in...' : '🔐 Sign In'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your full name"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{error}</div>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }} disabled={loading}>
                            {loading ? '⏳ Creating account...' : '✅ Create Account'}
                        </button>
                    </form>
                )}

                {/* Demo accounts */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>Demo accounts (password: <code>password</code>)</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[
                            { label: '👩‍🏫 Sarah (Teacher)', email: 'sarah@school.edu' },
                            { label: '👨‍🏫 Mike (Teacher)', email: 'mike@school.edu' },
                            { label: '👩‍🎓 Alice (Student)', email: 'alice@school.edu' },
                            { label: '👨‍🎓 Bob (Student)', email: 'bob@school.edu' },
                        ].map(d => (
                            <button
                                key={d.email}
                                onClick={() => fillDemo(d.email)}
                                style={{ fontSize: 11, padding: '4px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
