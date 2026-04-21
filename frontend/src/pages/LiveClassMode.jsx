import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSessionPlan } from '../api'

const SLIDE_TYPES = {
    title: 'title',
    concept: 'concept',
    flow: 'flow',
    example: 'example',
    question: 'question',
    misconception: 'misconception',
    summary: 'summary',
}

function buildSlides(plan, content) {
    const slides = []

    slides.push({
        type: SLIDE_TYPES.title,
        title: plan.title || 'Session',
        date: plan.date,
        prepTime: plan.prep_time_minutes,
        explanation: plan.explanation,
    })

    content.key_concepts?.forEach((c) => {
        slides.push({ type: SLIDE_TYPES.concept, ...c })
    })

    if (content.explanation_flow?.length > 0) {
        slides.push({ type: SLIDE_TYPES.flow, steps: content.explanation_flow })
    }

    content.examples?.forEach((e) => {
        slides.push({ type: SLIDE_TYPES.example, ...e })
    })

    content.quick_questions?.forEach((q, i) => {
        slides.push({ type: SLIDE_TYPES.question, ...q, num: i + 1 })
    })

    content.common_misconceptions?.forEach((m) => {
        slides.push({ type: SLIDE_TYPES.misconception, ...m })
    })

    slides.push({
        type: SLIDE_TYPES.summary,
        keyPoints: content.key_concepts?.map((c) => c.concept) || [],
        title: plan.title,
    })

    return slides
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

function SlideTitle({ slide }) {
    return (
        <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
                Session Preparation
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 800, lineHeight: 1.2, color: '#fff', marginBottom: 24 }}>
                {slide.title}
            </h1>
            {slide.date && (
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                    {new Date(slide.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            )}
            {slide.prepTime && (
                <div style={{ display: 'inline-block', background: 'rgba(108,99,255,0.3)', border: '1px solid rgba(108,99,255,0.6)', borderRadius: 20, padding: '6px 20px', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>
                    ⏱ {slide.prepTime} min prep
                </div>
            )}
            {slide.explanation && (
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
                    {slide.explanation.split('|')[0]?.replace('Session: ', '')}
                </p>
            )}
        </div>
    )
}

function SlideConcept({ slide }) {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                💡 Key Concept
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 44px)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
                {slide.concept}
                {slide.importance === 'high' && (
                    <span style={{ marginLeft: 16, fontSize: 14, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 4, padding: '3px 10px', color: '#fca5a5', verticalAlign: 'middle' }}>
                        High Priority
                    </span>
                )}
            </h2>
            <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginTop: 24 }}>
                {slide.explanation}
            </p>
        </div>
    )
}

function SlideFlow({ slide }) {
    return (
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
                🔄 Teaching Flow
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {slide.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ minWidth: 36, height: 36, borderRadius: '50%', background: 'rgba(108,99,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                            {step.step || i + 1}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>{step.activity}</div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>⏱ {step.duration_minutes} min · {step.notes}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SlideExample({ slide }) {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                📋 Example
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 40px)', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                {slide.title}
                {slide.difficulty && (
                    <span style={{ marginLeft: 14, fontSize: 13, background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 10px', color: 'rgba(255,255,255,0.6)', verticalAlign: 'middle', fontWeight: 400 }}>
                        {slide.difficulty}
                    </span>
                )}
            </h2>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.9, marginTop: 20 }}>
                {slide.content}
            </p>
        </div>
    )
}

function SlideQuestion({ slide, revealed, onReveal }) {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                ❓ Quick Check — Question {slide.num}
            </div>
            <h2 style={{ fontSize: 'clamp(20px, 2.8vw, 38px)', fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 32 }}>
                {slide.question}
            </h2>
            {!revealed ? (
                <button
                    onClick={onReveal}
                    style={{ background: 'rgba(108,99,255,0.3)', border: '2px solid rgba(108,99,255,0.7)', borderRadius: 10, padding: '14px 32px', fontSize: 16, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                    Reveal Answer
                </button>
            ) : (
                <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(34,197,94,0.8)', marginBottom: 10 }}>Expected Answer</div>
                    <p style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
                        {slide.expected_answer}
                    </p>
                    {slide.purpose && (
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 10, fontStyle: 'italic' }}>
                            Purpose: {slide.purpose}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

function SlideMisconception({ slide }) {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                ⚠️ Common Misconception
            </div>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(239,68,68,0.8)', marginBottom: 10 }}>❌ Misconception</div>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{slide.misconception}</p>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(34,197,94,0.8)', marginBottom: 10 }}>✅ Correction</div>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{slide.correction}</p>
            </div>
        </div>
    )
}

function SlideSummary({ slide }) {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
                ✅ Session Wrap-Up
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 40px)', fontWeight: 800, color: '#fff', marginBottom: 32 }}>
                {slide.title}
            </h2>
            {slide.keyPoints.length > 0 && (
                <div style={{ textAlign: 'left', display: 'inline-block', minWidth: 300 }}>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>Key concepts covered:</div>
                    {slide.keyPoints.map((kp, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(108,99,255,0.8)', flexShrink: 0 }} />
                            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>{kp}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ marginTop: 40, fontSize: 32 }}>🎉</div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Great session!</p>
        </div>
    )
}

export default function LiveClassMode() {
    const { planId } = useParams()
    const navigate = useNavigate()

    const [plan, setPlan] = useState(null)
    const [slides, setSlides] = useState([])
    const [currentSlide, setCurrentSlide] = useState(0)
    const [revealedAnswers, setRevealedAnswers] = useState({})
    const [elapsed, setElapsed] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadPlan()
    }, [planId])

    useEffect(() => {
        const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
        return () => clearInterval(timer)
    }, [])

    const loadPlan = async () => {
        try {
            const data = await getSessionPlan(parseInt(planId))
            setPlan(data)
            const content = typeof data.plan_json === 'string' ? JSON.parse(data.plan_json) : (data.plan_json || {})
            setSlides(buildSlides(data, content))
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    const goNext = useCallback(() => {
        setCurrentSlide((s) => Math.min(s + 1, slides.length - 1))
    }, [slides.length])

    const goPrev = useCallback(() => {
        setCurrentSlide((s) => Math.max(s - 1, 0))
    }, [])

    const handleExit = useCallback(() => navigate('/session'), [navigate])

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
            if (e.key === 'Escape') handleExit()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [goNext, goPrev, handleExit])

    const slide = slides[currentSlide]
    const progress = slides.length > 1 ? (currentSlide / (slides.length - 1)) * 100 : 0

    const containerStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: '#0f0f1a',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'inherit',
    }

    if (loading) return (
        <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ borderTopColor: '#6c63ff' }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>Loading session...</p>
        </div>
    )

    if (error) return (
        <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#fca5a5', fontSize: 18 }}>Failed to load plan: {error}</p>
            <button onClick={handleExit} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '10px 24px', color: '#fff', cursor: 'pointer' }}>
                ← Back
            </button>
        </div>
    )

    return (
        <div style={containerStyle}>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={handleExit}
                        title="Exit (Esc)"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}
                    >
                        ✕ Exit
                    </button>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                        {plan?.title}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>⏱ {formatTime(elapsed)}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                        {currentSlide + 1} / {slides.length}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6c63ff, #a78bfa)', transition: 'width 0.3s ease' }} />
            </div>

            {/* Slide content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', overflow: 'hidden' }}>
                {slide && (
                    <>
                        {slide.type === SLIDE_TYPES.title && <SlideTitle slide={slide} />}
                        {slide.type === SLIDE_TYPES.concept && <SlideConcept slide={slide} />}
                        {slide.type === SLIDE_TYPES.flow && <SlideFlow slide={slide} />}
                        {slide.type === SLIDE_TYPES.example && <SlideExample slide={slide} />}
                        {slide.type === SLIDE_TYPES.question && (
                            <SlideQuestion
                                slide={slide}
                                revealed={!!revealedAnswers[currentSlide]}
                                onReveal={() => setRevealedAnswers((r) => ({ ...r, [currentSlide]: true }))}
                            />
                        )}
                        {slide.type === SLIDE_TYPES.misconception && <SlideMisconception slide={slide} />}
                        {slide.type === SLIDE_TYPES.summary && <SlideSummary slide={slide} />}
                    </>
                )}
            </div>

            {/* Bottom nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '18px 24px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                <button
                    onClick={goPrev}
                    disabled={currentSlide === 0}
                    title="Previous (←)"
                    style={{ background: currentSlide === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 28px', color: currentSlide === 0 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: currentSlide === 0 ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, transition: 'background 0.2s' }}
                >
                    ← Prev
                </button>

                {/* Slide dots */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            style={{ width: i === currentSlide ? 24 : 8, height: 8, borderRadius: 4, background: i === currentSlide ? '#6c63ff' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
                        />
                    ))}
                </div>

                <button
                    onClick={goNext}
                    disabled={currentSlide === slides.length - 1}
                    title="Next (→ or Space)"
                    style={{ background: currentSlide === slides.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.5)', border: '1px solid rgba(108,99,255,0.6)', borderRadius: 10, padding: '10px 28px', color: currentSlide === slides.length - 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: currentSlide === slides.length - 1 ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, transition: 'background 0.2s' }}
                >
                    Next →
                </button>
            </div>

            {/* Keyboard hint */}
            <div style={{ position: 'absolute', bottom: 80, right: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
                ← → navigate · Space next · Esc exit
            </div>
        </div>
    )
}
