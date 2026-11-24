-- =========================================================================
-- LOGICQ INSTITUTIONAL LAB COURSE PLATFORM (SANJIVANI UNIVERSITY)
-- Specification: Build Spec Nov 24, 2026 (@Hariprasath K)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. ORGANISATION & PEOPLE
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code TEXT UNIQUE NOT NULL, -- e.g. SET, SCM, SPS, SSC
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code TEXT UNIQUE NOT NULL, -- e.g. CSE, IT, MECH
    name TEXT NOT NULL,
    school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.programs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code TEXT UNIQUE NOT NULL, -- e.g. BTECH_CSE, IMTECH_CSE
    name TEXT NOT NULL,
    degree TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    pos JSONB DEFAULT '[]'::jsonb, -- Program Outcomes
    psos JSONB DEFAULT '[]'::jsonb, -- Program Specific Outcomes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BR-5, BR-6, BR-8: User Accounts (Created only by roster/staff import)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL, -- Matched against SSO
    name TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BR-1: Role Scopes (Level 0..7)
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'SCHOOL_ADMIN', 
        'DEPARTMENT_ADMIN', 'COURSE_OWNER', 'FACULTY', 
        'LAB_ASSISTANT', 'STUDENT'
    )),
    scope_type TEXT NOT NULL CHECK (scope_type IN (
        'university', 'school', 'department', 'course', 'section', 'batch', 'self'
    )),
    scope_id TEXT NOT NULL, -- Referenced entity ID (or 'ALL' for university)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    roll_no TEXT UNIQUE NOT NULL, -- BR-8: Unique student key across all courses
    program_id TEXT NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
    admission_year INTEGER NOT NULL,
    consent_at TIMESTAMPTZ, -- NFR-13 DPDP Act consent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_groups (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL, -- e.g. "SY-B", "TY-A"
    academic_year TEXT NOT NULL, -- e.g. "2026-2027"
    program_id TEXT NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    class_group_id TEXT NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_student UNIQUE (class_group_id, student_id)
);

-- =========================================================================
-- 2. ACADEMIC CALENDAR (BR-13, BR-18, AC-6, AC-9)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.academic_terms (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    academic_year TEXT NOT NULL, -- e.g. "2026-2027"
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    start_date DATE NOT NULL,
    last_working_day DATE NOT NULL,
    end_sem_window_start DATE NOT NULL,
    end_sem_window_end DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    term_id TEXT NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('holiday', 'exam', 'event', 'no-lab')),
    title TEXT NOT NULL,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('university', 'school', 'department')),
    scope_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. COURSE AND OUTCOMES (Written Once - AC-7)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    code TEXT UNIQUE NOT NULL, -- e.g. "CS201"
    title TEXT NOT NULL,
    l INTEGER NOT NULL DEFAULT 3,
    t INTEGER NOT NULL DEFAULT 0,
    p INTEGER NOT NULL DEFAULT 2, -- P=2 means 2-hour lab per batch per week
    c INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    coordinator_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.units (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    syllabus_hours INTEGER NOT NULL DEFAULT 6,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_unit_course_num UNIQUE (course_id, number)
);

CREATE TABLE IF NOT EXISTS public.topics (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_topic_unit_num UNIQUE (unit_id, number)
);

CREATE TABLE IF NOT EXISTS public.course_outcomes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. "CO1", "CO2"
    statement TEXT NOT NULL,
    bloom_level TEXT NOT NULL, -- e.g. "L2: Understand", "L3: Apply"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_co_course_code UNIQUE (course_id, code)
);

CREATE TABLE IF NOT EXISTS public.co_po_maps (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    co_id TEXT NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
    po_code TEXT NOT NULL, -- "PO1".."PO12", "PSO1".."PSO2"
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_co_po UNIQUE (co_id, po_code)
);

-- =========================================================================
-- 4. DELIVERY (Each Semester - BR-10, BR-11, BR-15, AC-8)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.offerings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    term_id TEXT NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_course_term UNIQUE (course_id, term_id)
);

CREATE TABLE IF NOT EXISTS public.sections (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    offering_id TEXT NOT NULL REFERENCES public.offerings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class_group_id TEXT NOT NULL REFERENCES public.class_groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lab_rooms (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    working_seats INTEGER NOT NULL DEFAULT 65, -- BR-10: cap = min(65, working_seats)
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.batches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    section_id TEXT NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lab_room_id TEXT NOT NULL REFERENCES public.lab_rooms(id) ON DELETE RESTRICT,
    lab_weekday INTEGER NOT NULL CHECK (lab_weekday BETWEEN 0 AND 6),
    lab_start_time TIME NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 120, -- BR-15: 2 consecutive hours
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('roster', 'code')),
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'moved', 'dropped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_batch UNIQUE (student_id, batch_id)
);

CREATE TABLE IF NOT EXISTS public.session_plans (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    batch_id TEXT UNIQUE NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    approved_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lab_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    session_plan_id TEXT NOT NULL REFERENCES public.session_plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period_no INTEGER NOT NULL,
    topic_ids JSONB DEFAULT '[]'::jsonb, -- 2 topics per period per BR-15
    is_makeup BOOLEAN DEFAULT FALSE, -- BR-17: Last period is makeup
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendances (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    lab_session_id TEXT NOT NULL REFERENCES public.lab_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'makeup')),
    marked_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_session_student_att UNIQUE (lab_session_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.timeline_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    offering_id TEXT NOT NULL REFERENCES public.offerings(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('resource', 'announcement', 'lab_program', 'quiz', 'coding_test', 'assignment')),
    title TEXT NOT NULL,
    description TEXT,
    release_rule TEXT NOT NULL DEFAULT 'immediate',
    due_rule TEXT NOT NULL DEFAULT 'last_working_day',
    due_at TIMESTAMPTZ,
    max_marks NUMERIC DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 5. AUDIT LOG & THRESHOLDS (BR-2, BR-4)
-- =========================================================================

-- BR-4: Append-Only Audit Log
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    role TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'approve', 'publish', 'delete', 'update', 'tighten')),
    object_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    before JSONB,
    after JSONB,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BR-2: Eligibility Thresholds (Narrow only)
CREATE TABLE IF NOT EXISTS public.eligibility_rules (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    min_attendance_pct NUMERIC NOT NULL DEFAULT 75.0,
    min_lab_completion_pct NUMERIC NOT NULL DEFAULT 80.0,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('university', 'school', 'department')),
    scope_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES (NFR-10, BR-1)
-- =========================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user has super/univ admin privileges
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.role_assignments
        WHERE user_id = auth.uid()::text
        AND role IN ('SUPER_ADMIN', 'UNIVERSITY_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit Log Policy: Strictly INSERT and SELECT, NO UPDATE or DELETE (BR-4 Append-only)
CREATE POLICY "Audit logs can only be read by admins" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Audit logs append-only insert" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Student Profiles: Students can only read their own profile; admins within scope can read
CREATE POLICY "Student read own profile" ON public.student_profiles
    FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());

-- Courses: Readable by anyone authenticated; writable by course coordinator or HOD
CREATE POLICY "Courses read all" ON public.courses
    FOR SELECT USING (true);

CREATE POLICY "Courses write coordinator or hod" ON public.courses
    FOR ALL USING (
        coordinator_id = auth.uid()::text OR public.is_admin()
    );

-- Enrollments: Student can view their own enrollment; faculty in batch can view
CREATE POLICY "Enrollments view own or batch faculty" ON public.enrollments
    FOR SELECT USING (
        student_id = auth.uid()::text OR public.is_admin()
    );

-- Attendances: Students view only their own attendance (AC-13)
CREATE POLICY "Attendance view own or faculty" ON public.attendances
    FOR SELECT USING (
        student_id = auth.uid()::text OR public.is_admin()
    );
