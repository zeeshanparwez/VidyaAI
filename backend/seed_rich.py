"""Rich seed script — wipes DB and rebuilds with realistic Indian demo data."""

import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))

from core.security import hash_password
_DEMO_HASH = hash_password("password")

from datetime import date, datetime, timedelta
from database import init_db, SessionLocal, engine
from models.user import User
from models.subject import Subject
from models.syllabus import SyllabusUnit
from models.syllabus_chunk import SyllabusChunk
from models.timetable import TimetableEntry
from models.enrollment import Enrollment
from models.session_plan import SessionPlan
from models.quiz import Quiz, QuizResponse
from models.agent_decision import AgentDecision, FeedbackSignal
from models.announcement import Announcement
import sqlalchemy as sa


def wipe_and_seed():
    init_db()
    db = SessionLocal()

    # ── Wipe all tables in dependency order ──────────────────────────────
    for model in [QuizResponse, AgentDecision, FeedbackSignal, Announcement,
                  Quiz, SessionPlan, SyllabusChunk, TimetableEntry,
                  Enrollment, SyllabusUnit, Subject, User]:
        db.query(model).delete()
    db.commit()

    # ── Users ─────────────────────────────────────────────────────────────
    teacher = User(
        name="Dr. Priya Sharma", email="priya.sharma@vidyatech.edu", role="teacher",
        password_hash=_DEMO_HASH,
        preferences_json=json.dumps({
            "style": "detailed", "examples": "real-world",
            "quiz_difficulty": "medium", "pace": "moderate"
        })
    )
    teacher2 = User(
        name="Prof. Rahul Verma", email="rahul.verma@vidyatech.edu", role="teacher",
        password_hash=_DEMO_HASH,
        preferences_json=json.dumps({
            "style": "concise", "examples": "theoretical",
            "quiz_difficulty": "hard", "pace": "fast"
        })
    )
    admin = User(
        name="Arjun Mehta", email="arjun.mehta@vidyatech.edu", role="admin",
        password_hash=_DEMO_HASH
    )
    student1 = User(name="Aarav Patel",    email="aarav.patel@student.vidyatech.edu",   role="student", password_hash=_DEMO_HASH)
    student2 = User(name="Sneha Iyer",     email="sneha.iyer@student.vidyatech.edu",    role="student", password_hash=_DEMO_HASH)
    student3 = User(name="Rohan Gupta",    email="rohan.gupta@student.vidyatech.edu",   role="student", password_hash=_DEMO_HASH)
    student4 = User(name="Ananya Reddy",   email="ananya.reddy@student.vidyatech.edu",  role="student", password_hash=_DEMO_HASH)
    student5 = User(name="Kabir Singh",    email="kabir.singh@student.vidyatech.edu",   role="student", password_hash=_DEMO_HASH)
    student6 = User(name="Divya Nair",     email="divya.nair@student.vidyatech.edu",    role="student", password_hash=_DEMO_HASH)
    student7 = User(name="Vikas Kumar",    email="vikas.kumar@student.vidyatech.edu",   role="student", password_hash=_DEMO_HASH)

    db.add_all([teacher, teacher2, admin,
                student1, student2, student3, student4, student5, student6, student7])
    db.commit()

    # ── Subjects ──────────────────────────────────────────────────────────
    today = date.today()
    cs101 = Subject(
        name="Data Structures & Algorithms", code="CS201",
        teacher_id=teacher.id,
        term_start=date(today.year, 1, 10), term_end=date(today.year, 5, 30),
        description="Core DSA concepts: arrays, linked lists, trees, sorting, searching, and complexity analysis.",
        is_published=True,
    )
    math201 = Subject(
        name="Engineering Mathematics – III", code="MA301",
        teacher_id=teacher.id,
        term_start=date(today.year, 1, 10), term_end=date(today.year, 5, 30),
        description="Linear algebra, Fourier series, Laplace transforms, and numerical methods for engineers.",
        is_published=True,
    )
    py301 = Subject(
        name="Python for AI & Machine Learning", code="AI401",
        teacher_id=teacher2.id,
        term_start=date(today.year, 2, 1), term_end=date(today.year, 6, 15),
        description="Python ecosystem for data analysis, model building, and deploying ML solutions.",
        is_published=True,
    )
    db.add_all([cs101, math201, py301])
    db.commit()

    # ── Syllabus Units ─────────────────────────────────────────────────────
    cs_units_data = [
        ("Introduction to Complexity Analysis", "Big-O, Big-Θ, Big-Ω, time vs space, amortised analysis",         2.0, "completed"),
        ("Arrays & Dynamic Arrays",              "Static vs dynamic arrays, insertion, deletion, amortisation",     3.0, "completed"),
        ("Linked Lists",                         "Singly, doubly, circular — insertions, reversals, cycle detect", 3.0, "completed"),
        ("Stacks & Queues",                      "LIFO/FIFO, array & LL implementations, balanced parentheses",     2.5, "partial"),
        ("Recursion & Backtracking",             "Base case, recursion tree, N-Queens, maze solver",                3.0, "partial"),
        ("Binary Trees & BST",                   "Traversals, insertion, deletion, height, balanced BST",           4.0, "pending"),
        ("Heaps & Priority Queues",              "Min/max heap, heapify, heap sort, applications",                  3.0, "pending"),
        ("Hashing & Hash Tables",                "Hash functions, chaining, open addressing, load factor",          3.0, "pending"),
        ("Sorting Algorithms",                   "Merge sort, quick sort, counting sort, radix sort, stability",    4.0, "pending"),
        ("Graph Algorithms",                     "BFS, DFS, Dijkstra's, topological sort, MST",                     4.5, "pending"),
    ]
    cs_unit_objs = []
    for i, (title, desc, hours, status) in enumerate(cs_units_data):
        u = SyllabusUnit(subject_id=cs101.id, title=title, description=desc,
                         order=i+1, estimated_hours=hours, status=status)
        db.add(u)
        cs_unit_objs.append(u)

    math_units_data = [
        ("Matrices & Determinants",     "Matrix operations, cofactor, adjoint, inverse",            3.0, "completed"),
        ("System of Linear Equations",  "Gaussian elimination, rank, consistency, Cramer's rule",   3.0, "completed"),
        ("Eigenvalues & Eigenvectors",  "Characteristic equation, diagonalisation, applications",   3.0, "partial"),
        ("Fourier Series",              "Half-range, full-range, Euler's formulae, harmonics",       4.0, "pending"),
        ("Laplace Transforms",          "Standard results, inverse Laplace, solving ODEs",           4.0, "pending"),
        ("Z-Transforms",                "Standard pairs, ROC, inverse Z, difference equations",     3.0, "pending"),
        ("Numerical Methods",           "Bisection, Newton-Raphson, Runge-Kutta, Simpson's rule",   3.5, "pending"),
    ]
    math_unit_objs = []
    for i, (title, desc, hours, status) in enumerate(math_units_data):
        u = SyllabusUnit(subject_id=math201.id, title=title, description=desc,
                         order=i+1, estimated_hours=hours, status=status)
        db.add(u)
        math_unit_objs.append(u)

    py_units_data = [
        ("Python Foundations & OOP",   "Data types, functions, classes, inheritance, decorators",  2.0, "completed"),
        ("NumPy for Numerical Computing", "ndarray, broadcasting, vectorisation, linear algebra",   3.0, "completed"),
        ("Pandas for Data Analysis",   "DataFrames, groupby, merge, pivot, handling missing data",  4.0, "completed"),
        ("Data Visualisation",         "Matplotlib, seaborn, plotly, dashboard basics",             3.0, "partial"),
        ("Machine Learning with Scikit-learn", "Classification, regression, pipelines, evaluation", 4.0, "partial"),
        ("Neural Networks & Keras",    "Perceptrons, backprop, CNNs, training, callbacks",          4.0, "pending"),
        ("NLP Fundamentals",           "Tokenisation, TF-IDF, word embeddings, sentiment analysis", 3.0, "pending"),
        ("Model Deployment",           "Flask API, Docker basics, model serialisation, MLflow",     3.0, "pending"),
    ]
    for i, (title, desc, hours, status) in enumerate(py_units_data):
        db.add(SyllabusUnit(subject_id=py301.id, title=title, description=desc,
                            order=i+1, estimated_hours=hours, status=status))
    db.commit()

    # ── Timetable ──────────────────────────────────────────────────────────
    dow = today.weekday()
    timetable_entries = [
        (cs101.id,  dow,           "09:00", "10:30", "Room A-101 (NEC Block)"),
        (cs101.id,  (dow+2) % 7,  "09:00", "10:30", "Room A-101 (NEC Block)"),
        (cs101.id,  (dow+4) % 7,  "14:00", "15:30", "Computer Lab B-204"),
        (math201.id,(dow+1) % 7,  "10:30", "12:00", "Room C-301 (Science Block)"),
        (math201.id,(dow+3) % 7,  "10:30", "12:00", "Room C-301 (Science Block)"),
        (py301.id,  (dow+1) % 7,  "13:00", "14:30", "AI Lab D-401"),
        (py301.id,  (dow+3) % 7,  "13:00", "14:30", "AI Lab D-401"),
    ]
    for subj_id, day, start, end, room in timetable_entries:
        db.add(TimetableEntry(subject_id=subj_id, day_of_week=day,
                              start_time=start, end_time=end, room=room))

    # ── Enrollments ────────────────────────────────────────────────────────
    for s in [student1, student2, student3, student4, student5, student6, student7]:
        db.add(Enrollment(student_id=s.id, subject_id=cs101.id, status="active"))
    for s in [student1, student2, student3, student4]:
        db.add(Enrollment(student_id=s.id, subject_id=math201.id, status="active"))
    for s in [student3, student4, student5, student6, student7]:
        db.add(Enrollment(student_id=s.id, subject_id=py301.id, status="active"))
    db.commit()

    # ── Session Plans ─────────────────────────────────────────────────────
    def make_plan(topic, concepts, misconceptions, flow_steps, examples, questions):
        return json.dumps({
            "topic": topic,
            "key_concepts": concepts,
            "common_misconceptions": misconceptions,
            "teaching_flow": flow_steps,
            "examples": examples,
            "discussion_questions": questions,
            "summary": f"This session covers {topic} with hands-on examples and conceptual clarity.",
        })

    plan1_json = make_plan(
        "Stacks & Queues",
        [
            {"name": "Stack (LIFO)", "explanation": "A stack is a Last-In-First-Out structure. The last element pushed is the first to be popped.", "example": "Browser back button, undo operations, function call stack."},
            {"name": "Queue (FIFO)", "explanation": "A queue is First-In-First-Out. Elements are enqueued at rear and dequeued from front.", "example": "Print queue, CPU scheduling, BFS traversal."},
            {"name": "Array vs Linked List Implementation", "explanation": "Stacks/queues can use arrays (O(1) amortised) or linked lists (O(1) guaranteed) with different trade-offs.", "example": "Python list as stack (append/pop), collections.deque as queue."},
        ],
        [
            {"issue": "Stack overflow only happens in hardware", "correction": "Recursive functions can cause stack overflow in software too — each call adds a frame to the call stack."},
            {"issue": "Queue is just a list you can use however you want", "correction": "A queue enforces FIFO discipline — violating this order breaks the abstraction and leads to incorrect algorithms."},
        ],
        [
            {"activity": "Warm-up: Trace the call stack for a recursive function", "duration": "5 min", "description": "Draw frames on the board to make call stack concrete."},
            {"activity": "Live code: Implement a stack using Python list", "duration": "8 min", "description": "Show push, pop, peek, isEmpty. Highlight O(1) amortised."},
            {"activity": "Demo: Balanced parentheses checker using stack", "duration": "10 min", "description": "Classic interview problem — shows real-world relevance."},
            {"activity": "Pair exercise: Implement queue using two stacks", "duration": "7 min", "description": "Advanced challenge — walk around and guide pairs."},
        ],
        [
            "Stack use-case: Valid parentheses — {[()]} is valid, {[(]} is not.",
            "Queue use-case: Print spooler — first document sent, first printed.",
        ],
        [
            "What is the time complexity of pop() on a stack implemented with a Python list?",
            "How would you implement a queue using two stacks? What is the amortised cost?",
            "Give two real-world examples where LIFO ordering is natural.",
        ]
    )

    plan2_json = make_plan(
        "Recursion & Backtracking",
        [
            {"name": "Base Case & Recursive Case", "explanation": "Every recursion needs a base case (termination) and a recursive case that reduces the problem.", "example": "factorial(0) = 1 is the base case; factorial(n) = n × factorial(n-1) is recursive."},
            {"name": "Recursion Tree", "explanation": "A tree showing all recursive calls — helps visualise time complexity and understand overlapping sub-problems.", "example": "Fibonacci recursion tree shows exponential growth of calls."},
            {"name": "Backtracking Pattern", "explanation": "Try a choice, recurse, and undo if it doesn't lead to a solution. 'Choose–Explore–Unchoose'.", "example": "N-Queens: place a queen, recurse for next row, remove queen if no valid placement."},
        ],
        [
            {"issue": "Recursion is always slower than iteration", "correction": "Tail-recursive algorithms can be as fast as loops; the overhead is call stack frames, which can be mitigated with memoisation."},
            {"issue": "Backtracking tries every single possibility", "correction": "Backtracking prunes branches early — it avoids exploring paths that cannot lead to a valid solution, making it far faster than brute force."},
        ],
        [
            {"activity": "Trace Fibonacci(5) recursion tree on the whiteboard", "duration": "7 min", "description": "Count repeated calls — motivates memoisation."},
            {"activity": "Live code: Recursive binary search", "duration": "8 min", "description": "Clean example of divide-and-conquer recursion."},
            {"activity": "Walkthrough: N-Queens backtracking logic", "duration": "10 min", "description": "Focus on the 'unchoose' step — students often miss this."},
            {"activity": "Exercise: Solve subset-sum using backtracking", "duration": "5 min", "description": "Small input (set of 4 numbers, target = 9)."},
        ],
        [
            "Recursion example: Merge sort — split array in halves, sort each half, merge.",
            "Backtracking example: Sudoku solver — fill cell, check validity, backtrack if stuck.",
        ],
        [
            "What happens if you forget the base case in a recursive function?",
            "Explain the 'choose–explore–unchoose' pattern with a concrete example.",
            "Why is the recursive Fibonacci O(2^n) and how does memoisation fix it?",
        ]
    )

    plan3_json = make_plan(
        "Eigenvalues & Eigenvectors",
        [
            {"name": "Characteristic Equation", "explanation": "det(A − λI) = 0 gives the eigenvalues λ of matrix A.", "example": "For A = [[4,1],[2,3]], det(A − λI) = λ² − 7λ + 10 = 0, so λ = 5 or λ = 2."},
            {"name": "Eigenvector Computation", "explanation": "For each eigenvalue λ, solve (A − λI)x = 0 to find the eigenvector x.", "example": "λ = 5 gives eigenvector [1, 1]; λ = 2 gives eigenvector [1, −2]."},
            {"name": "Diagonalisation", "explanation": "A = PDP⁻¹ where D is diagonal (eigenvalues) and P has eigenvectors as columns.", "example": "Diagonalisation simplifies Aⁿ computation and solving differential equations."},
        ],
        [
            {"issue": "Every matrix has real eigenvalues", "correction": "Only symmetric matrices are guaranteed real eigenvalues. Rotation matrices have complex eigenvalues."},
            {"issue": "Eigenvectors are unique", "correction": "Eigenvectors are only unique up to scalar multiples — any non-zero scalar multiple of an eigenvector is also an eigenvector."},
        ],
        [
            {"activity": "Derive characteristic equation for a 2×2 example on board", "duration": "8 min", "description": "Use A = [[3,1],[0,2]] — clear distinct eigenvalues."},
            {"activity": "Compute eigenvectors step-by-step together", "duration": "10 min", "description": "Row reduce (A − λI) carefully; emphasise free variables."},
            {"activity": "Geometric interpretation: show eigenvectors as axes of stretching", "duration": "7 min", "description": "Draw the transformation effect on a 2D grid."},
            {"activity": "Quick check: Is this matrix diagonalisable? Why/why not?", "duration": "5 min", "description": "Give 2-3 examples with repeated/defective eigenvalues."},
        ],
        [
            "Eigenvalues of [[2,0],[0,3]] are 2 and 3 — diagonal entries are always eigenvalues for diagonal matrices.",
            "Google PageRank is computed using the dominant eigenvector of the web link matrix.",
        ],
        [
            "For a 3×3 matrix, how many eigenvalues (counting multiplicity) does it have?",
            "What does it mean geometrically when an eigenvalue is negative?",
            "Why is diagonalisation useful for computing Aⁿ efficiently?",
        ]
    )

    sp1 = SessionPlan(subject_id=cs101.id,
                      date=today - timedelta(days=8),
                      title="Stacks & Queues — Deep Dive",
                      syllabus_unit_id=cs_unit_objs[3].id,
                      prep_time_minutes=28,
                      plan_json=plan1_json,
                      explanation="Prioritised Stacks & Queues as the natural next step after Linked Lists. Quiz data showed 68% average on linked list traversal — indicates readiness for abstract ADTs.",
                      coverage_status="completed")

    sp2 = SessionPlan(subject_id=cs101.id,
                      date=today - timedelta(days=3),
                      title="Recursion & Backtracking",
                      syllabus_unit_id=cs_unit_objs[4].id,
                      prep_time_minutes=30,
                      plan_json=plan2_json,
                      explanation="Recursion selected as next topic. Prior quiz showed students grasp loops well, making recursion a natural extension. Backtracking included as it's a common placement exam topic.",
                      coverage_status="partial")

    sp3 = SessionPlan(subject_id=math201.id,
                      date=today - timedelta(days=5),
                      title="Eigenvalues & Eigenvectors",
                      syllabus_unit_id=math_unit_objs[2].id,
                      prep_time_minutes=25,
                      plan_json=plan3_json,
                      explanation="Eigenvalues selected; students scored avg 63% on matrix operations quiz. Adaptive agent flagged eigenvector computation as high-priority due to its role in upcoming Fourier and ML topics.",
                      coverage_status="completed")
    db.add_all([sp1, sp2, sp3])
    db.commit()

    # ── Quizzes ────────────────────────────────────────────────────────────
    q1_questions = json.dumps([
        {"question": "What does LIFO stand for in the context of a Stack?",
         "options": ["Last Input First Output", "Last In First Out", "Linear Input First Output", "Least Integer First Out"],
         "correct": 1,
         "explanation": "LIFO — Last In First Out — means the most recently inserted element is removed first."},
        {"question": "Which Python method is used to remove and return the top element of a stack (implemented as a list)?",
         "options": ["remove()", "pop()", "delete()", "dequeue()"],
         "correct": 1,
         "explanation": "list.pop() removes and returns the last element in O(1) amortised time, making it ideal for stack operations."},
        {"question": "What is the time complexity of enqueue and dequeue in a queue implemented with collections.deque?",
         "options": ["O(n) for both", "O(1) for both", "O(1) enqueue, O(n) dequeue", "O(n) enqueue, O(1) dequeue"],
         "correct": 1,
         "explanation": "collections.deque is implemented as a doubly-linked list, giving O(1) for both appendleft/popleft (enqueue/dequeue from ends)."},
        {"question": "Which data structure would you use for implementing a browser's back button?",
         "options": ["Queue", "Stack", "Heap", "Hash Table"],
         "correct": 1,
         "explanation": "A browser's back button follows LIFO — the last page visited is the first page to go back to, which is exactly a stack."},
        {"question": "What happens when you call pop() on an empty stack?",
         "options": ["Returns None", "Returns 0", "Raises an IndexError", "Returns -1"],
         "correct": 2,
         "explanation": "Python raises IndexError: pop from empty list. Always check isEmpty() before popping in production code."},
    ])

    q2_questions = json.dumps([
        {"question": "What is the base case in the recursive definition of factorial?",
         "options": ["factorial(1) = 1", "factorial(0) = 0", "factorial(0) = 1", "factorial(n) = n"],
         "correct": 2,
         "explanation": "factorial(0) = 1 is the base case. Without it, recursion would never terminate."},
        {"question": "What is the time complexity of computing Fibonacci(n) using naive recursion?",
         "options": ["O(n)", "O(n log n)", "O(2ⁿ)", "O(n²)"],
         "correct": 2,
         "explanation": "Each call to Fibonacci(n) makes two sub-calls, leading to an exponential recursion tree of size O(2ⁿ)."},
        {"question": "In backtracking, what is the purpose of the 'unchoose' step?",
         "options": ["To skip invalid choices", "To undo the last choice so another branch can be explored", "To mark a choice as visited", "To restart the algorithm"],
         "correct": 1,
         "explanation": "The unchoose step restores the state before the recursive call, allowing the algorithm to explore alternative branches."},
        {"question": "Which of the following problems is best solved using backtracking?",
         "options": ["Binary search", "Merge sort", "N-Queens", "Matrix multiplication"],
         "correct": 2,
         "explanation": "N-Queens requires exploring placements and backtracking when a conflict is found — a classic backtracking problem."},
        {"question": "Memoisation improves recursive Fibonacci from O(2ⁿ) to:",
         "options": ["O(log n)", "O(n)", "O(n²)", "O(n log n)"],
         "correct": 1,
         "explanation": "With memoisation each unique sub-problem is solved only once, reducing the total work to O(n)."},
    ])

    q3_questions = json.dumps([
        {"question": "The eigenvalues of a matrix A satisfy which equation?",
         "options": ["Ax = 0", "det(A) = 0", "det(A − λI) = 0", "A − λI = 0"],
         "correct": 2,
         "explanation": "The characteristic equation det(A − λI) = 0 gives the eigenvalues. Non-trivial solutions for x exist exactly when this determinant is zero."},
        {"question": "If λ is an eigenvalue of A, the corresponding eigenvector x satisfies:",
         "options": ["Ax = 0", "Ax = λx", "(A + λI)x = 0", "Ax = λ"],
         "correct": 1,
         "explanation": "By definition, Ax = λx — the matrix A scales the eigenvector x by the scalar eigenvalue λ."},
        {"question": "A 3×3 matrix has how many eigenvalues (counting multiplicity)?",
         "options": ["1", "2", "3", "It depends"],
         "correct": 2,
         "explanation": "An n×n matrix always has exactly n eigenvalues (counting multiplicity) over the complex numbers, by the Fundamental Theorem of Algebra."},
        {"question": "Which type of matrix is always guaranteed to have real eigenvalues?",
         "options": ["Upper triangular", "Invertible", "Symmetric", "Diagonal"],
         "correct": 2,
         "explanation": "Symmetric matrices (A = Aᵀ) always have real eigenvalues — this is the Spectral Theorem."},
        {"question": "Diagonalisation A = PDP⁻¹ is useful mainly because:",
         "options": ["It always exists", "It makes computing Aⁿ easy", "It reduces matrix size", "It finds the determinant"],
         "correct": 1,
         "explanation": "Aⁿ = PDⁿP⁻¹ and Dⁿ is trivial to compute (just raise diagonal entries to the power n), making diagonalisation very powerful."},
    ])

    quiz1 = Quiz(subject_id=cs101.id, created_by=teacher.id,
                 syllabus_unit_id=cs_unit_objs[3].id,
                 title="Stacks & Queues — Assessment",
                 questions_json=q1_questions, status="published",
                 created_at=datetime.now() - timedelta(days=7))
    quiz2 = Quiz(subject_id=cs101.id, created_by=teacher.id,
                 syllabus_unit_id=cs_unit_objs[4].id,
                 title="Recursion & Backtracking — Quiz",
                 questions_json=q2_questions, status="published",
                 created_at=datetime.now() - timedelta(days=2))
    quiz3 = Quiz(subject_id=math201.id, created_by=teacher.id,
                 syllabus_unit_id=math_unit_objs[2].id,
                 title="Eigenvalues & Eigenvectors — Quiz",
                 questions_json=q3_questions, status="published",
                 created_at=datetime.now() - timedelta(days=4))
    db.add_all([quiz1, quiz2, quiz3])
    db.commit()

    # ── Quiz Responses ─────────────────────────────────────────────────────
    # Quiz 1 — Stacks & Queues (7 students enrolled in CS201)
    responses_q1 = [
        (student1.id, [1, 1, 1, 1, 2], 5),  # Aarav   100%
        (student2.id, [1, 1, 1, 1, 0], 4),  # Sneha    80%
        (student3.id, [1, 1, 0, 1, 2], 4),  # Rohan    80%
        (student4.id, [0, 1, 0, 1, 0], 2),  # Ananya   40%
        (student5.id, [1, 0, 1, 1, 2], 4),  # Kabir    80%
        (student6.id, [1, 1, 1, 0, 0], 3),  # Divya    60%
        (student7.id, [0, 0, 0, 1, 0], 1),  # Vikas    20%
    ]
    for stud_id, answers, score in responses_q1:
        db.add(QuizResponse(
            quiz_id=quiz1.id, student_id=stud_id,
            answers_json=json.dumps(answers),
            score=score, total_questions=5,
            submitted_at=datetime.now() - timedelta(days=6)
        ))

    # Quiz 2 — Recursion (7 students enrolled)
    responses_q2 = [
        (student1.id, [2, 2, 1, 2, 1], 5),  # Aarav   100%
        (student2.id, [2, 2, 1, 2, 1], 5),  # Sneha   100%
        (student3.id, [2, 2, 1, 0, 1], 4),  # Rohan    80%
        (student4.id, [0, 2, 0, 2, 0], 2),  # Ananya   40%
        (student5.id, [2, 2, 0, 2, 1], 4),  # Kabir    80%
        (student6.id, [2, 0, 1, 2, 0], 3),  # Divya    60%
        (student7.id, [0, 0, 0, 0, 0], 0),  # Vikas     0%
    ]
    for stud_id, answers, score in responses_q2:
        db.add(QuizResponse(
            quiz_id=quiz2.id, student_id=stud_id,
            answers_json=json.dumps(answers),
            score=score, total_questions=5,
            submitted_at=datetime.now() - timedelta(days=1)
        ))

    # Quiz 3 — Eigenvalues (4 students enrolled: Aarav, Sneha, Rohan, Ananya)
    responses_q3 = [
        (student1.id, [2, 1, 2, 2, 1], 5),  # Aarav   100%
        (student2.id, [2, 1, 2, 2, 0], 4),  # Sneha    80%
        (student3.id, [2, 1, 2, 0, 0], 3),  # Rohan    60%
        (student4.id, [0, 0, 2, 0, 0], 1),  # Ananya   20%
    ]
    for stud_id, answers, score in responses_q3:
        db.add(QuizResponse(
            quiz_id=quiz3.id, student_id=stud_id,
            answers_json=json.dumps(answers),
            score=score, total_questions=5,
            submitted_at=datetime.now() - timedelta(days=3)
        ))
    db.commit()

    # ── Announcements ──────────────────────────────────────────────────────
    announcements = [
        Announcement(
            teacher_id=teacher.id, subject_id=cs101.id,
            title="Quiz on Binary Trees next Monday",
            body="Dear students, we will have an in-class quiz covering Binary Trees & BST on Monday. Please revise traversals (inorder, preorder, postorder) and BST insertion/deletion. Past year questions have been uploaded to the portal.",
            priority="urgent", pinned=True,
        ),
        Announcement(
            teacher_id=teacher.id, subject_id=None,
            title="Mid-Semester Marks Released",
            body="Mid-semester marks for CS201 and MA301 have been uploaded to the academic portal. Please check your marks and reach out by Friday if you have any discrepancies. Re-evaluation requests are due by 25th April.",
            priority="info", pinned=True,
        ),
        Announcement(
            teacher_id=teacher.id, subject_id=cs101.id,
            title="Lab assignment submission deadline extended",
            body="The deadline for Lab Assignment 3 (Linked List implementation) has been extended to this Saturday 11:59 PM due to the server downtime on Tuesday. Ensure your code is pushed to the college GitLab before the deadline.",
            priority="reminder", pinned=False,
        ),
        Announcement(
            teacher_id=teacher2.id, subject_id=py301.id,
            title="AI Lab session rescheduled",
            body="The AI Lab session originally scheduled for Thursday 1 PM has been rescheduled to Friday 3 PM in Lab D-401 due to a faculty meeting. Please update your calendars accordingly.",
            priority="reminder", pinned=False,
        ),
        Announcement(
            teacher_id=teacher2.id, subject_id=py301.id,
            title="Kaggle Competition — Participate for bonus marks",
            body="I have registered the class for the Kaggle Titanic competition as part of the ML module. Participating students can earn up to 5 bonus marks. The dataset and starter notebook have been shared on Google Classroom. Submission deadline is 30th April.",
            priority="info", pinned=False,
        ),
    ]
    db.add_all(announcements)
    db.commit()

    # ── Agent Decisions ────────────────────────────────────────────────────
    agent_runs = [
        (cs101.id, "schedule_agent",
         "Identified 3 upcoming CS201 sessions this week. Next session: Monday 09:00, Room A-101. Previous session covered Linked Lists (completed status confirmed in DB).",
         datetime.now() - timedelta(days=8, hours=2)),
        (cs101.id, "syllabus_agent",
         "Analysed 10 CS201 units. 3 completed (Complexity, Arrays, Linked Lists), 1 partial (Stacks & Queues). Prioritised 'Stacks & Queues' as it is partially covered and is a prerequisite for Trees and Graphs.",
         datetime.now() - timedelta(days=8, hours=1, minutes=58)),
        (cs101.id, "session_planning_agent",
         "Scoped Stacks & Queues to 30 minutes: 5 min warm-up (call stack), 8 min stack coding, 10 min balanced parentheses demo, 7 min pair exercise. Total: 30 min — at max prep limit.",
         datetime.now() - timedelta(days=8, hours=1, minutes=55)),
        (cs101.id, "content_curation_agent",
         "RAG retrieval: embedded 'Stacks LIFO FIFO implementation Python' query, retrieved 2 relevant syllabus chunks. Enriched content with specific examples from uploaded syllabus document.",
         datetime.now() - timedelta(days=8, hours=1, minutes=50)),
        (cs101.id, "feedback_agent",
         "Linked List quiz (not in DB) results not available. No weak areas identified yet. Will use baseline knowledge assumption and recommend post-session quiz.",
         datetime.now() - timedelta(days=8, hours=1, minutes=45)),
        (cs101.id, "adaptive_scheduling_agent",
         "No prior feedback data. Kept original schedule. Note: Recursion is scheduled after Stacks — this ordering is pedagogically sound as backtracking relies on understanding the call stack.",
         datetime.now() - timedelta(days=8, hours=1, minutes=40)),
        (cs101.id, "personalization_agent",
         "Applied Dr. Priya Sharma's preference profile: detailed style, real-world examples, medium difficulty. Added browser back-button and undo analogies. Quiz difficulty set to medium.",
         datetime.now() - timedelta(days=8, hours=1, minutes=35)),

        (cs101.id, "schedule_agent",
         "Next CS201 session in 2 days. Stacks & Queues marked as 'partial' — AI recommends a brief review at session start before moving to Recursion.",
         datetime.now() - timedelta(days=3, hours=2)),
        (cs101.id, "syllabus_agent",
         "Stacks & Queues is partial. Recommending Recursion & Backtracking as main topic — it is the next logical unit and placement-relevant. Stacks review can be woven into recursion's call-stack discussion.",
         datetime.now() - timedelta(days=3, hours=1, minutes=55)),
        (cs101.id, "session_planning_agent",
         "Scoped Recursion to 30 minutes: 7 min Fibonacci tree, 8 min binary search live-code, 10 min N-Queens walkthrough, 5 min subset-sum exercise.",
         datetime.now() - timedelta(days=3, hours=1, minutes=50)),
        (cs101.id, "feedback_agent",
         "Quiz 1 (Stacks) results: avg 66% (3.3/5). Weak students: Ananya (40%), Vikas (20%). Recommend revisiting queue implementation and deque usage at session start.",
         datetime.now() - timedelta(days=3, hours=1, minutes=40)),
        (cs101.id, "adaptive_scheduling_agent",
         "Vikas scored 20% — flagged for additional support. Added queue review note to session plan. Deferred Heaps by 1 session to allow consolidation of recursion fundamentals.",
         datetime.now() - timedelta(days=3, hours=1, minutes=35)),
        (cs101.id, "personalization_agent",
         "Dr. Priya Sharma's style: detailed + real-world. Added Sudoku solver and N-Queens as examples — both are well-known in Indian competitive programming context. Quiz difficulty: medium.",
         datetime.now() - timedelta(days=3, hours=1, minutes=30)),

        (math201.id, "schedule_agent",
         "Next MA301 session: 2 days ago at 10:30, Room C-301. Previous sessions covered Matrices and Systems of Equations (both completed).",
         datetime.now() - timedelta(days=5, hours=2)),
        (math201.id, "syllabus_agent",
         "Two units completed. Eigenvalues is 'partial' — students have been introduced but need depth. Prioritised for this session before moving to Fourier Series.",
         datetime.now() - timedelta(days=5, hours=1, minutes=55)),
        (math201.id, "session_planning_agent",
         "Scoped Eigenvalues session to 25 minutes: 8 min characteristic equation, 10 min eigenvector computation, 7 min geometric interpretation. Kept concise given complexity.",
         datetime.now() - timedelta(days=5, hours=1, minutes=50)),
        (math201.id, "feedback_agent",
         "Matrix Operations quiz: avg 63% (3.15/5). Ananya scored 20% — serious gap. Common error: students confusing eigenvectors with eigenvalues. Targeted misconception in plan.",
         datetime.now() - timedelta(days=5, hours=1, minutes=40)),
        (math201.id, "adaptive_scheduling_agent",
         "Ananya's low score flagged. Added extra practice problems to session. Fourier Series postponed by one session to ensure eigenvalues are solid — they underpin the spectral analysis in Fourier.",
         datetime.now() - timedelta(days=5, hours=1, minutes=35)),
        (math201.id, "personalization_agent",
         "Dr. Priya Sharma prefers detailed style. Added Google PageRank as a real-world eigenvalue application — highly relevant for engineering students interested in tech. Quiz difficulty: medium.",
         datetime.now() - timedelta(days=5, hours=1, minutes=30)),
    ]

    for subj_id, agent, reasoning, ts in agent_runs:
        db.add(AgentDecision(
            subject_id=subj_id, agent_name=agent,
            input_json=json.dumps({"request": "Session generation requested by teacher"}),
            output_json=json.dumps({"summary": reasoning}),
            reasoning=reasoning,
            created_at=ts,
        ))

    db.add_all([
        FeedbackSignal(subject_id=cs101.id, signal_type="quiz_result",
                       data_json=json.dumps({"quiz": "Stacks & Queues", "avg_score": 66, "weak_students": ["Ananya Reddy", "Vikas Kumar"]}),
                       created_at=datetime.now() - timedelta(days=6)),
        FeedbackSignal(subject_id=cs101.id, signal_type="quiz_result",
                       data_json=json.dumps({"quiz": "Recursion & Backtracking", "avg_score": 66, "weak_students": ["Ananya Reddy", "Vikas Kumar"]}),
                       created_at=datetime.now() - timedelta(days=1)),
        FeedbackSignal(subject_id=math201.id, signal_type="quiz_result",
                       data_json=json.dumps({"quiz": "Eigenvalues & Eigenvectors", "avg_score": 65, "weak_students": ["Ananya Reddy"]}),
                       created_at=datetime.now() - timedelta(days=3)),
    ])
    db.commit()
    db.close()

    print("✅ Database seeded successfully!")
    print()
    print("   Institution:  VidyaTech Institute of Engineering & Technology")
    print()
    print("   Teachers:")
    print("     Dr. Priya Sharma     | priya.sharma@vidyatech.edu  | password")
    print("     Prof. Rahul Verma    | rahul.verma@vidyatech.edu   | password")
    print()
    print("   Admin:")
    print("     Arjun Mehta          | arjun.mehta@vidyatech.edu   | password")
    print()
    print("   Students:")
    print("     Aarav Patel          | aarav.patel@student.vidyatech.edu   | password")
    print("     Sneha Iyer           | sneha.iyer@student.vidyatech.edu    | password")
    print("     Rohan Gupta          | rohan.gupta@student.vidyatech.edu   | password")
    print("     Ananya Reddy         | ananya.reddy@student.vidyatech.edu  | password")
    print("     Kabir Singh          | kabir.singh@student.vidyatech.edu   | password")
    print("     Divya Nair           | divya.nair@student.vidyatech.edu    | password")
    print("     Vikas Kumar          | vikas.kumar@student.vidyatech.edu   | password")
    print()
    print("   Courses:  CS201 · MA301 · AI401")
    print("   Quizzes:  3 published,  19 responses")
    print("   Sessions: 3 AI-generated plans")
    print("   Announcements: 5 seeded")


if __name__ == "__main__":
    wipe_and_seed()
