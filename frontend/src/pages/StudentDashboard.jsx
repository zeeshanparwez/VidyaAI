import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentCourses, getStudentQuizzes, getStudyPlan, getLeaderboard } from '../api'

export default function StudentDashboard({ user }) {
    const [courses, setCourses] = useState([])
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('dashboard')
    const [studyPlan, setStudyPlan] = useState(null)
    const [loadingPlan, setLoadingPlan] = useState(false)
    const [leaderboards, setLeaderboards] = useState({})
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        loadData()
    }, [user])

    const loadData = async () => {
        setLoading(true)
        try {
            const [coursesData, quizzesData] = await Promise.all([
                getStudentCourses(user.user_id),
                getStudentQuizzes(user.user_id),
            ])
            setCourses(coursesData)
            setQuizzes(quizzesData)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const completedQuizzes = quizzes.filter(q => q.quiz_status === 'completed')
    const pendingQuizzes = quizzes.filter(q => q.quiz_status === 'not_started')

    const loadStudyPlan = async () => {
        setLoadingPlan(true)
        try {
            const data = await getStudyPlan(user.user_id)
            setStudyPlan(data)
        } catch (err) { console.error(err) }
        setLoadingPlan(false)
    }

    const priorityColor = (p) => p === 'high' ? 'badge-danger' : p === 'medium' ? 'badge-warning' : 'badge-info'

    const loadLeaderboards = async () => {
        if (!courses.length) return
        setLoadingLeaderboard(true)
        try {
            const results = await Promise.all(
                courses.map(c => getLeaderboard(c.id).then(data => ({ subjectId: c.id, subjectName: c.name, ...data })))
            )
            const map = {}
            results.forEach(r => { map[r.subjectId] = r })
            setLeaderboards(map)
        } catch (err) { console.error(err) }
        setLoadingLeaderboard(false)
    }

    if (loading) return <div className="loading"><div className="spinner" /><p>Loading dashboard...</p></div>

    return (
        <div>
            <div className="page-header">
                <h1>Welcome, {user?.name} 👋</h1>
                <p>Your student dashboard — view courses, quizzes, and track progress</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { id: 'dashboard', label: '🏠 Overview' },
                    { id: 'studyplan', label: '📚 Study Plan' },
                    { id: 'leaderboard', label: '🏆 Leaderboard' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => {
                            setActiveTab(tab.id)
                            if (tab.id === 'studyplan' && !studyPlan) loadStudyPlan()
                            if (tab.id === 'leaderboard' && !Object.keys(leaderboards).length) loadLeaderboards()
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Study Plan Tab */}
            {activeTab === 'studyplan' && (
                <div>
                    {loadingPlan && <div className="loading"><div className="spinner" /><p>AI is building your personalised study plan...</p></div>}

                    {!loadingPlan && studyPlan && (
                        <>
                            {/* Header */}
                            <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)' }}>
                                <div className="card-header">
                                    <span className="card-title">🎯 Your Weekly Study Plan</span>
                                    <span className="badge badge-accent">
                                        {studyPlan.plan?.daily_hours_recommended}h/day recommended
                                    </span>
                                </div>
                                {studyPlan.plan?.weekly_goal && (
                                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 8 }}>
                                        "{studyPlan.plan.weekly_goal}"
                                    </p>
                                )}
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                    Based on {studyPlan.based_on_quizzes} quiz result{studyPlan.based_on_quizzes !== 1 ? 's' : ''} across {studyPlan.enrolled_courses} course{studyPlan.enrolled_courses !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {/* Focus Areas */}
                            {studyPlan.plan?.focus_areas?.length > 0 && (
                                <div className="card" style={{ marginBottom: 20 }}>
                                    <h3 style={{ marginBottom: 16 }}>🎯 Focus Areas</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {studyPlan.plan.focus_areas.map((fa, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{fa.topic}</span>
                                                        <span className={`badge ${priorityColor(fa.priority)}`}>{fa.priority}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{fa.subject}</div>
                                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fa.reason}</div>
                                                </div>
                                                <div style={{ marginLeft: 16, textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{fa.suggested_hours}h</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>suggested</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Daily Schedule */}
                            {studyPlan.plan?.daily_schedule?.length > 0 && (
                                <div className="card" style={{ marginBottom: 20 }}>
                                    <h3 style={{ marginBottom: 16 }}>📅 Weekly Schedule</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                        {studyPlan.plan.daily_schedule.map((day, i) => (
                                            <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--accent)' }}>{day.day}</div>
                                                {day.tasks?.map((task, j) => (
                                                    <div key={j} style={{ marginBottom: 8 }}>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{task.time}</div>
                                                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.activity}</div>
                                                        {task.subject && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.subject}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Strengths & Tips */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                {studyPlan.plan?.strengths?.length > 0 && (
                                    <div className="card">
                                        <h4 style={{ marginBottom: 12, color: 'var(--success)' }}>💪 Your Strengths</h4>
                                        {studyPlan.plan.strengths.map((s, i) => (
                                            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>✓ {s}</div>
                                        ))}
                                    </div>
                                )}
                                {studyPlan.plan?.improvement_tips?.length > 0 && (
                                    <div className="card">
                                        <h4 style={{ marginBottom: 12, color: 'var(--warning)' }}>💡 Tips to Improve</h4>
                                        {studyPlan.plan.improvement_tips.map((tip, i) => (
                                            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>→ {tip}</div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button className="btn btn-secondary" onClick={loadStudyPlan} style={{ marginBottom: 24 }}>
                                🔄 Regenerate Plan
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
                <div>
                    {loadingLeaderboard && <div className="loading"><div className="spinner" /><p>Loading leaderboards...</p></div>}
                    {!loadingLeaderboard && courses.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                            <p style={{ color: 'var(--text-secondary)' }}>Enrol in a course to see leaderboards.</p>
                        </div>
                    )}
                    {!loadingLeaderboard && courses.map(c => {
                        const lb = leaderboards[c.id]
                        if (!lb) return null
                        const myRank = lb.leaderboard?.find(e => e.student_id === user.user_id)

                        return (
                            <div key={c.id} className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header" style={{ marginBottom: 16 }}>
                                    <span className="card-title">🏆 {c.name}</span>
                                    <span className="badge badge-info">{lb.total_quizzes} quiz{lb.total_quizzes !== 1 ? 'zes' : ''}</span>
                                </div>

                                {myRank && (
                                    <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: 20 }}>{myRank.rank === 1 ? '🥇' : myRank.rank === 2 ? '🥈' : myRank.rank === 3 ? '🥉' : `#${myRank.rank}`}</span>
                                        <span style={{ fontSize: 14 }}>Your rank: <strong>#{myRank.rank}</strong> with <strong>{myRank.average_score}%</strong> avg</span>
                                    </div>
                                )}

                                {lb.leaderboard?.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No quiz results yet.</p>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 48 }}>Rank</th>
                                                    <th>Student</th>
                                                    <th>Avg Score</th>
                                                    <th>Quizzes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lb.leaderboard.map(entry => (
                                                    <tr key={entry.student_id} style={{ background: entry.student_id === user.user_id ? 'rgba(108,99,255,0.06)' : 'transparent' }}>
                                                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 16 }}>
                                                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                                                        </td>
                                                        <td>
                                                            <span style={{ fontWeight: entry.student_id === user.user_id ? 700 : 400 }}>
                                                                {entry.student_name} {entry.student_id === user.user_id ? '(you)' : ''}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${entry.average_score >= 80 ? 'badge-success' : entry.average_score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                                                {entry.average_score}%
                                                            </span>
                                                        </td>
                                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{entry.quizzes_completed} done</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && <>
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-value">{courses.length}</div>
                    <div className="stat-label">Enrolled Courses</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-value">{quizzes.length}</div>
                    <div className="stat-label">Total Quizzes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">{completedQuizzes.length}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-value">{pendingQuizzes.length}</div>
                    <div className="stat-label">Pending</div>
                </div>
            </div>

            {/* Enrolled Courses */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <span className="card-title">📚 My Enrolled Courses</span>
                    <span className="badge badge-accent">{courses.length} courses</span>
                </div>
                {courses.length > 0 ? (
                    <div className="cards-grid" style={{ marginTop: 16 }}>
                        {courses.map(c => (
                            <div key={c.id} className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <h4 style={{ margin: 0 }}>{c.code || '📖'} {c.name}</h4>
                                </div>
                                {c.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{c.description}</p>}
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    👩‍🏫 {c.teacher_name || 'Unknown'} • {c.enrolled_count} students enrolled
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📚</div>
                        <p style={{ color: 'var(--text-secondary)' }}>You're not enrolled in any courses yet.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
                    </div>
                )}
            </div>

            {/* Pending Quizzes */}
            {pendingQuizzes.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <span className="card-title">⏳ Quizzes To Complete</span>
                        <span className="badge badge-warning">{pendingQuizzes.length} pending</span>
                    </div>
                    <div className="table-wrapper" style={{ marginTop: 12 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Quiz</th>
                                    <th>Subject</th>
                                    <th>Questions</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingQuizzes.map(q => (
                                    <tr key={q.id}>
                                        <td><strong>{q.title}</strong></td>
                                        <td>{q.subject_name}</td>
                                        <td>{q.total_questions}</td>
                                        <td><span className="badge badge-warning">⏳ Not Started</span></td>
                                        <td>
                                            <button className="btn btn-sm btn-primary" onClick={() => navigate(`/quiz/${q.id}`)}>
                                                📝 Start Quiz
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Completed Quizzes */}
            {completedQuizzes.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">✅ Completed Quizzes</span>
                        <span className="badge badge-success">{completedQuizzes.length} done</span>
                    </div>
                    <div className="table-wrapper" style={{ marginTop: 12 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Quiz</th>
                                    <th>Subject</th>
                                    <th>Score</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedQuizzes.map(q => (
                                    <tr key={q.id}>
                                        <td><strong>{q.title}</strong></td>
                                        <td>{q.subject_name}</td>
                                        <td>
                                            <span className={`badge ${q.score >= 70 ? 'badge-success' : q.score >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                                                {q.score?.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td><span className="badge badge-success">✅ Completed</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {quizzes.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                    <p style={{ color: 'var(--text-secondary)' }}>No quizzes available yet. Check back soon!</p>
                </div>
            )}
            </>}
        </div>
    )
}
