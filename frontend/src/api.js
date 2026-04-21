/**
 * API client for the Teacher Prep Portal backend.
 * Handles JWT auth, automatic token refresh, and all API calls.
 */

const BASE = '/api';

// ── Token storage ────────────────────────────────────────────────────────

export const TokenStore = {
    getAccess: () => localStorage.getItem('ac_access_token'),
    getRefresh: () => localStorage.getItem('ac_refresh_token'),
    setTokens: (access, refresh) => {
        localStorage.setItem('ac_access_token', access);
        if (refresh) localStorage.setItem('ac_refresh_token', refresh);
    },
    setAccess: (access) => localStorage.setItem('ac_access_token', access),
    clear: () => {
        localStorage.removeItem('ac_access_token');
        localStorage.removeItem('ac_refresh_token');
        localStorage.removeItem('ac_user');
    },
};

// ── Core request with auto-refresh ──────────────────────────────────────

let _refreshing = null; // deduplicate concurrent refresh calls

async function refreshAccessToken() {
    const refreshToken = TokenStore.getRefresh();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
        TokenStore.clear();
        window.location.reload();
        throw new Error('Session expired. Please log in again.');
    }
    const data = await res.json();
    TokenStore.setAccess(data.access_token);
    return data.access_token;
}

async function request(path, options = {}, _retry = true) {
    const token = TokenStore.getAccess();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401 && _retry) {
        // Try to refresh once
        if (!_refreshing) _refreshing = refreshAccessToken().finally(() => { _refreshing = null; });
        try {
            await _refreshing;
            return request(path, options, false); // retry once
        } catch {
            throw new Error('Session expired. Please log in again.');
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Request failed');
    }
    return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────

export const login = (email, password) =>
    fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    }).then(async res => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || 'Login failed');
        }
        return res.json();
    });

export const register = (name, email, password, role = 'student') =>
    fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
    }).then(async res => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || 'Registration failed');
        }
        return res.json();
    });

export const changePassword = (currentPassword, newPassword) =>
    request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

export const getUser = (userId) => request(`/auth/me/${userId}`);
export const listUsers = () => request('/auth/users');
export const getNotifications = (userId) => request(`/auth/me/${userId}/notifications`);
export const updatePreferences = (userId, prefs) =>
    request(`/auth/me/${userId}/preferences`, { method: 'PUT', body: JSON.stringify(prefs) });

// ── Subjects ──────────────────────────────────────────────────────────────

export const createSubject = (data) =>
    request('/subjects/', { method: 'POST', body: JSON.stringify(data) });
export const listSubjects = (teacherId) =>
    request(`/subjects/?teacher_id=${teacherId || ''}`);
export const getSubject = (id) => request(`/subjects/${id}`);

// ── Syllabus ──────────────────────────────────────────────────────────────

export const uploadSyllabus = (subjectId, content, teacherId) =>
    request('/syllabus/upload', { method: 'POST', body: JSON.stringify({ subject_id: subjectId, content, teacher_id: teacherId }) });
export const getTopicInsights = (unitId) => request(`/syllabus/topic/${unitId}/insights`);

export const uploadSyllabusFile = async (subjectId, file) => {
    const token = TokenStore.getAccess();
    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('file', file);
    const res = await fetch(`${BASE}/syllabus/upload-file`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'File upload failed');
    }
    return res.json();
};

export const getSyllabus = (subjectId) => request(`/syllabus/${subjectId}`);
export const updateUnitStatus = (unitId, status, notes = '') =>
    request(`/syllabus/units/${unitId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, coverage_notes: notes }),
    });

// ── Timetable ─────────────────────────────────────────────────────────────

export const createTimetableEntry = (data) =>
    request('/timetable/', { method: 'POST', body: JSON.stringify(data) });
export const getTimetable = (subjectId) => request(`/timetable/${subjectId}`);
export const deleteTimetableEntry = (id) =>
    request(`/timetable/${id}`, { method: 'DELETE' });

// ── Sessions ──────────────────────────────────────────────────────────────

export const generateSession = (subjectId, teacherId, targetDate) =>
    request('/sessions/generate', {
        method: 'POST',
        body: JSON.stringify({ subject_id: subjectId, teacher_id: teacherId, target_date: targetDate }),
    });
export const getTodaySessions = (teacherId) => request(`/sessions/today?teacher_id=${teacherId}`);
export const listSessions = (subjectId) => request(`/sessions/${subjectId}`);
export const getSessionPlan = (planId) => request(`/sessions/plan/${planId}`);
export const updateCoverage = (planId, status, notes = '') =>
    request(`/sessions/plan/${planId}/coverage`, {
        method: 'PUT',
        body: JSON.stringify({ coverage_status: status, teacher_notes: notes }),
    });
export const saveJournal = (planId, notes) =>
    request(`/sessions/plan/${planId}/journal`, { method: 'POST', body: JSON.stringify({ notes }) });

// ── Quizzes ───────────────────────────────────────────────────────────────

export const generateQuiz = (data) =>
    request('/quizzes/generate', { method: 'POST', body: JSON.stringify(data) });
export const listQuizzes = (subjectId) => request(`/quizzes/${subjectId}`);
export const getQuiz = (quizId) => request(`/quizzes/detail/${quizId}`);
export const submitQuiz = (quizId, data) =>
    request(`/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify(data) });
export const getQuizResponses = (quizId) => request(`/quizzes/${quizId}/responses`);
export const getTeacherQuizzes = (teacherId) => request(`/quizzes/teacher/${teacherId}`);
export const getStudentQuizzes = (studentId) => request(`/quizzes/student/${studentId}`);
export const saveConfidence = (quizId, studentId, rating) =>
    request(`/quizzes/${quizId}/confidence`, { method: 'POST', body: JSON.stringify({ student_id: studentId, rating }) });
export const getLeaderboard = (subjectId) => request(`/quizzes/leaderboard/${subjectId}`);

// ── Courses & Enrollment ─────────────────────────────────────────────────

export const getStudentCourses = (studentId) => request(`/courses/my-courses?student_id=${studentId}`);
export const enrollInCourse = (courseId, studentId) =>
    request(`/courses/${courseId}/enroll`, { method: 'POST', body: JSON.stringify({ student_id: studentId }) });
export const listAvailableCourses = (studentId) => request(`/courses/?student_id=${studentId}`);
export const getEnrolledStudents = (courseId) => request(`/courses/${courseId}/students`);

// ── Analytics ────────────────────────────────────────────────────────────

export const getAnalytics = (subjectId) => request(`/analytics/${subjectId}`);
export const getScheduleAdjustments = (subjectId) => request(`/analytics/schedule/${subjectId}`);
export const getAgentDecisions = (subjectId) => request(`/analytics/decisions/${subjectId}`);
export const getHeatmap = (subjectId) => request(`/analytics/heatmap/${subjectId}`);
export const getTermReport = (subjectId) => request(`/analytics/report/${subjectId}`);

// ── Student study plan ───────────────────────────────────────────────────

export const getStudyPlan = (studentId) => request(`/auth/me/${studentId}/study-plan`);

// ── Announcements ────────────────────────────────────────────────────────

export const createAnnouncement = (data) =>
    request('/announcements/', { method: 'POST', body: JSON.stringify(data) });
export const getTeacherAnnouncements = (teacherId) => request(`/announcements/teacher/${teacherId}`);
export const getStudentAnnouncements = (studentId) => request(`/announcements/student/${studentId}`);
export const togglePin = (annId) => request(`/announcements/${annId}/pin`, { method: 'PUT' });
export const deleteAnnouncement = (annId) => request(`/announcements/${annId}`, { method: 'DELETE' });
