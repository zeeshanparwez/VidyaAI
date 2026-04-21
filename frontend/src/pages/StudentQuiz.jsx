import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuiz, submitQuiz, saveConfidence } from '../api'

const CONFIDENCE_EMOJIS = [
    { value: 1, emoji: '😕', label: 'Very unsure' },
    { value: 2, emoji: '😐', label: 'Unsure' },
    { value: 3, emoji: '🙂', label: 'Okay' },
    { value: 4, emoji: '😃', label: 'Confident' },
    { value: 5, emoji: '🤩', label: 'Very confident' },
]

function FlashCard({ front, back }) {
    const [flipped, setFlipped] = useState(false)
    return (
        <div onClick={() => setFlipped(f => !f)} style={{ cursor: 'pointer', perspective: 800, height: 160, userSelect: 'none' }}>
            <div style={{
                position: 'relative', width: '100%', height: '100%',
                transition: 'transform 0.5s',
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}>
                {/* Front */}
                <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', border: '1.5px solid var(--accent)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 8 }}>Question</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{front}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 12 }}>Tap to reveal answer →</div>
                </div>
                {/* Back */}
                <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.4)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(34,197,94,0.7)', marginBottom: 8 }}>Answer</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>{back.answer}</div>
                    {back.explanation && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{back.explanation}</div>}
                </div>
            </div>
        </div>
    )
}

export default function StudentQuiz({ user }) {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const [quiz, setQuiz] = useState(null)
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({})
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [confidence, setConfidence] = useState(null)
    const [confidenceSaved, setConfidenceSaved] = useState(false)
    const [showFlashcards, setShowFlashcards] = useState(false)

    useEffect(() => { loadQuiz() }, [quizId])

    const loadQuiz = async () => {
        try {
            const data = await getQuiz(quizId)
            setQuiz(data)
            const parsed = JSON.parse(data.questions_json || '[]')
            setQuestions(parsed)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const res = await submitQuiz(quizId, {
                student_id: user?.user_id || 4,
                student_name: user?.name || 'Unknown Student',
                answers_json: JSON.stringify(answers),
            })
            setResult(res)
        } catch (err) { alert(err.message) }
        setSubmitting(false)
    }

    if (loading) return <div className="loading"><div className="spinner" /><p>Loading quiz...</p></div>
    if (!quiz) return <div className="loading"><p>Quiz not found</p></div>

    const handleConfidence = async (val) => {
        setConfidence(val)
        try {
            await saveConfidence(quizId, user?.user_id, val)
            setConfidenceSaved(true)
        } catch { /* non-critical */ }
    }

    if (result) {
        const wrongQuestions = questions.filter(q => {
            const sa = (answers[String(q.id)] || '').toUpperCase().charAt(0)
            return sa !== (q.correct || '').toUpperCase().charAt(0)
        })

        return (
            <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
                <div className="card" style={{ textAlign: 'center', padding: 48, marginBottom: 24 }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>
                        {result.score >= 70 ? '🎉' : result.score >= 40 ? '👍' : '📚'}
                    </div>
                    <h2 style={{ marginBottom: 8 }}>Quiz Complete!</h2>
                    <div style={{ fontSize: 48, fontWeight: 800, background: 'var(--gradient-1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>
                        {result.score?.toFixed(0)}%
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                        You answered correctly on {Math.round((result.score / 100) * result.total_questions)} of {result.total_questions} questions.
                    </p>

                    {/* Confidence Self-Rating */}
                    {!confidenceSaved ? (
                        <div style={{ marginBottom: 28, padding: '20px 24px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>How confident do you feel about this topic?</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                                {CONFIDENCE_EMOJIS.map(({ value, emoji, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => handleConfidence(value)}
                                        title={label}
                                        style={{ background: confidence === value ? 'var(--accent)' : 'var(--bg-card)', border: confidence === value ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 24, transition: 'all 0.15s' }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            {confidence && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Tap again or continue below</p>}
                        </div>
                    ) : (
                        <div className="alert alert-info" style={{ marginBottom: 24 }}>
                            ✅ Thanks for rating your confidence! Your teacher will use this to adjust the pace.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>🏠 Dashboard</button>
                        {wrongQuestions.length > 0 && (
                            <button className="btn btn-secondary" onClick={() => setShowFlashcards(f => !f)} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                {showFlashcards ? '📋 Hide Flashcards' : `🃏 Study ${wrongQuestions.length} Flashcard${wrongQuestions.length !== 1 ? 's' : ''}`}
                            </button>
                        )}
                    </div>

                    {/* Flashcards for wrong answers */}
                    {showFlashcards && wrongQuestions.length > 0 && (
                        <div style={{ textAlign: 'left', marginBottom: 28 }}>
                            <h3 style={{ marginBottom: 6 }}>🃏 Review Flashcards</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Tap each card to reveal the answer.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                                {wrongQuestions.map((q, i) => (
                                    <FlashCard
                                        key={i}
                                        front={q.question}
                                        back={{ answer: q.correct, explanation: q.explanation }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Answer Key */}
                    <div style={{ textAlign: 'left', marginTop: 8 }}>
                        <h3 style={{ marginBottom: 16 }}>Answer Key</h3>
                        {questions.map((q, i) => {
                            const studentAns = answers[String(q.id)] || ''
                            const isCorrect = studentAns.toUpperCase().charAt(0) === q.correct?.toUpperCase().charAt(0)
                            return (
                                <div key={i} className="concept-card" style={{ borderColor: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                                    <h4>{isCorrect ? '✅' : '❌'} Q{q.id}: {q.question}</h4>
                                    <p>Your answer: <strong>{studentAns || 'Not answered'}</strong></p>
                                    <p>Correct: <strong>{q.correct}</strong></p>
                                    {q.explanation && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{q.explanation}</p>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
            <div className="page-header">
                <h1>📝 {quiz.title}</h1>
                <p>{questions.length} questions • Select the best answer for each</p>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 24 }}>
                👤 Submitting as: <strong>{user?.name || 'Unknown'}</strong>
            </div>

            {questions.map((q, qi) => (
                <div key={qi} className="question-card">
                    <h4>Q{q.id}. {q.question}</h4>
                    {q.difficulty && <span className="badge badge-info" style={{ marginBottom: 12 }}>{q.difficulty}</span>}
                    <div>
                        {q.options?.map((opt, oi) => {
                            const letter = opt.charAt(0)
                            return (
                                <label key={oi} className={`option ${answers[String(q.id)] === letter ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name={`q-${q.id}`}
                                        value={letter}
                                        checked={answers[String(q.id)] === letter}
                                        onChange={() => setAnswers({ ...answers, [String(q.id)]: letter })}
                                    />
                                    <span>{opt}</span>
                                </label>
                            )
                        })}
                    </div>
                </div>
            ))}

            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%', marginTop: 12, marginBottom: 40 }}>
                {submitting ? '📤 Submitting...' : '📤 Submit Quiz'}
            </button>
        </div>
    )
}
