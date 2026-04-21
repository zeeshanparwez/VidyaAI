import React, { useState, useEffect } from 'react'
import { getTeacherQuizzes, getQuizResponses, getEnrolledStudents } from '../api'

export default function QuizManager({ user, selectedSubject }) {
    const [quizzes, setQuizzes] = useState([])
    const [responses, setResponses] = useState({})
    const [expandedQuiz, setExpandedQuiz] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (user) loadQuizzes()
    }, [user, selectedSubject])

    const loadQuizzes = async () => {
        setLoading(true)
        try {
            const data = await getTeacherQuizzes(user.user_id)
            // If a subject is selected, filter to that subject
            const filtered = selectedSubject
                ? data.filter(q => q.subject_id === selectedSubject.id)
                : data
            setQuizzes(filtered)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const loadResponses = async (quizId) => {
        try {
            const data = await getQuizResponses(quizId)
            setResponses(prev => ({ ...prev, [quizId]: data }))
        } catch (err) { console.error(err) }
    }

    const toggleExpand = (quizId) => {
        if (expandedQuiz === quizId) {
            setExpandedQuiz(null)
        } else {
            setExpandedQuiz(quizId)
            if (!responses[quizId]) loadResponses(quizId)
        }
    }

    const parseQuestions = (json) => {
        try { return JSON.parse(json) } catch { return [] }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div>
            <div className="page-header">
                <h1>📝 Quiz Dashboard{selectedSubject ? ` — ${selectedSubject.name}` : ''}</h1>
                <p>View all AI-generated quizzes, track student participation and completion</p>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 24 }}>
                💡 <strong>Tip:</strong> Create quizzes from the <strong>Session Prep</strong> page — click "Create Quiz" on any topic to auto-generate an AI quiz.
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /><p>Loading quizzes...</p></div>
            ) : quizzes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {quizzes.map(quiz => {
                        const questions = parseQuestions(quiz.questions_json)
                        const qResponses = responses[quiz.id]
                        const isExpanded = expandedQuiz === quiz.id
                        const participationPct = quiz.enrolled_count > 0
                            ? ((quiz.responses_count / quiz.enrolled_count) * 100).toFixed(0)
                            : 0

                        return (
                            <div key={quiz.id} className="card" style={{ borderLeft: `4px solid ${quiz.is_complete ? 'var(--success, #22c55e)' : 'var(--accent)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <h3 style={{ margin: 0, marginBottom: 4 }}>{quiz.title}</h3>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span>📚 {quiz.subject_name}</span>
                                            <span>📅 {formatDate(quiz.created_at)}</span>
                                            <span>❓ {questions.length} questions</span>
                                            <span>🤖 AI Generated</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span className={`badge ${quiz.is_complete ? 'badge-success' : 'badge-warning'}`}>
                                            {quiz.is_complete ? '✅ Completed' : '🔄 In Progress'}
                                        </span>
                                    </div>
                                </div>

                                {/* Participation Bar */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                                            📊 Participation: {quiz.responses_count} / {quiz.enrolled_count} students
                                        </span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{participationPct}%</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8 }}>
                                        <div className="progress-fill" style={{
                                            width: `${participationPct}%`,
                                            background: quiz.is_complete ? 'var(--success, #22c55e)' : 'var(--accent)',
                                        }} />
                                    </div>
                                </div>

                                <button className="btn btn-sm btn-secondary" onClick={() => toggleExpand(quiz.id)}>
                                    {isExpanded ? '🔼 Collapse' : '🔽 View Details'}
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                                        {/* Questions */}
                                        <h4 style={{ marginBottom: 12 }}>📋 Quiz Questions</h4>
                                        {questions.map((q, i) => (
                                            <div key={i} className="concept-card" style={{ marginBottom: 8 }}>
                                                <h4 style={{ margin: 0 }}>Q{q.id || i + 1}: {q.question}</h4>
                                                <div style={{ marginTop: 6 }}>
                                                    {q.options?.map((opt, oi) => (
                                                        <div key={oi} style={{
                                                            padding: '4px 8px',
                                                            fontSize: 13,
                                                            color: opt.charAt(0).toUpperCase() === q.correct?.charAt(0).toUpperCase() ? 'var(--success, #22c55e)' : 'var(--text-secondary)',
                                                            fontWeight: opt.charAt(0).toUpperCase() === q.correct?.charAt(0).toUpperCase() ? 600 : 400,
                                                        }}>
                                                            {opt.charAt(0).toUpperCase() === q.correct?.charAt(0).toUpperCase() ? '✅ ' : '  '}{opt}
                                                        </div>
                                                    ))}
                                                </div>
                                                {q.explanation && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>💡 {q.explanation}</p>}
                                            </div>
                                        ))}

                                        {/* Responses */}
                                        <h4 style={{ marginTop: 20, marginBottom: 12 }}>👨‍🎓 Student Responses ({qResponses?.length || 0})</h4>
                                        {qResponses && qResponses.length > 0 ? (
                                            <div className="table-wrapper">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Student</th>
                                                            <th>Score</th>
                                                            <th>Submitted</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {qResponses.map(r => (
                                                            <tr key={r.id}>
                                                                <td>{r.student_name || `Student #${r.student_id}`}</td>
                                                                <td>
                                                                    <span className={`badge ${r.score >= 70 ? 'badge-success' : r.score >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                                                                        {r.score?.toFixed(0)}%
                                                                    </span>
                                                                </td>
                                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(r.submitted_at)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No responses yet.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                    <p style={{ color: 'var(--text-secondary)' }}>No quizzes created yet.</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Go to Session Prep to generate AI quizzes from your topics.</p>
                </div>
            )}
        </div>
    )
}
