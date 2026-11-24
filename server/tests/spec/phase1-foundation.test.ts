import { describe, it, expect } from 'vitest';
import {
  evaluateScopeAccess,
  tightenThreshold,
  validateEndSemRoles,
  createAuditLogEntry,
  validateRosterImport,
  verifySsoLogin,
  validateStudentProfileUpdate,
  partitionBatches,
  canMoveStudent,
  computeAvailableLabDates,
  generateSessionPlan,
  checkCalendarChangeImpact,
  canCourseBeOffered,
  filterCoursesForStudent,
  filterMarksForStudent,
  SSO_REFUSAL_MESSAGE,
} from '../../src/domain/lab-course/rules.js';
import {
  RoleAssignment,
  AcademicTerm,
  CourseUnit,
  CalendarEvent,
} from '../../src/domain/lab-course/types.js';

describe('Phase 1: Foundation — Business Rules and Acceptance Criteria', () => {

  // ---------------------------------------------------------------------------
  // BR-1: A role's rights apply only inside its scope; higher levels see everything below them.
  // ---------------------------------------------------------------------------
  describe('BR-1: Role Scope Enforcement', () => {
    it('BR-1: Super Admin has global access to all schools and departments', () => {
      const superAdminRole: RoleAssignment = {
        id: 'r1',
        userId: 'admin_1',
        role: 'SUPER_ADMIN',
        scopeType: 'university',
        scopeId: 'SANJIVANI_UNIV',
      };
      expect(evaluateScopeAccess(superAdminRole, { schoolId: 'SET', departmentId: 'CSE' })).toBe(true);
    });

    it('BR-1: Department Admin (HOD) can only access entities within their own department', () => {
      const hodCseRole: RoleAssignment = {
        id: 'r2',
        userId: 'hod_cse',
        role: 'DEPARTMENT_ADMIN',
        scopeType: 'department',
        scopeId: 'DEPT_CSE',
      };
      // Same department: Allowed
      expect(evaluateScopeAccess(hodCseRole, { departmentId: 'DEPT_CSE' })).toBe(true);
      // Different department: Denied
      expect(evaluateScopeAccess(hodCseRole, { departmentId: 'DEPT_MECH' })).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-5: A dean cannot see or edit another school's departments, rosters or reports.
  // ---------------------------------------------------------------------------
  describe('AC-5: Dean Cross-School Isolation', () => {
    it('AC-5: Dean of SET cannot see or edit SCM school entities', () => {
      const deanSetRole: RoleAssignment = {
        id: 'r_dean_set',
        userId: 'dean_set',
        role: 'SCHOOL_ADMIN',
        scopeType: 'school',
        scopeId: 'SET',
      };
      expect(evaluateScopeAccess(deanSetRole, { schoolId: 'SET' })).toBe(true);
      expect(evaluateScopeAccess(deanSetRole, { schoolId: 'SCM' })).toBe(false);
      expect(evaluateScopeAccess(deanSetRole, { schoolId: 'SPS' })).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-2: A lower level can tighten a threshold set above it but never loosen it.
  // ---------------------------------------------------------------------------
  describe('BR-2: Threshold Tightening Rule', () => {
    it('BR-2: Allows raising minimum attendance requirement (e.g. 75% -> 80%)', () => {
      const result = tightenThreshold(75, 80, true);
      expect(result.allowed).toBe(true);
      expect(result.effectiveValue).toBe(80);
    });

    it('BR-2: Strictly blocks loosening minimum attendance requirement (e.g. 75% -> 70%)', () => {
      const result = tightenThreshold(75, 70, true);
      expect(result.allowed).toBe(false);
      expect(result.effectiveValue).toBe(75);
      expect(result.error).toContain('BR-2 Violation');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-3: The person who sets an end-sem paper cannot also be its moderator.
  // ---------------------------------------------------------------------------
  describe('BR-3: Separation of Setter and Moderator', () => {
    it('BR-3: Blocks the same user from being setter and moderator', () => {
      const result = validateEndSemRoles('faculty_101', 'faculty_101');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BR-3 Violation');
    });

    it('BR-3: Allows different users as setter and moderator', () => {
      const result = validateEndSemRoles('faculty_101', 'faculty_102');
      expect(result.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-4: Append-only audit log with user, role, time and before/after values.
  // ---------------------------------------------------------------------------
  describe('BR-4: Append-Only Audit Logging', () => {
    it('BR-4: Creates a structured audit log entry with before and after snapshots', () => {
      const entry = createAuditLogEntry({
        userId: 'admin_1',
        role: 'SUPER_ADMIN',
        action: 'tighten',
        objectType: 'eligibility_rule',
        objectId: 'rule_101',
        before: { minAttendance: 75 },
        after: { minAttendance: 80 },
      });
      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe('admin_1');
      expect(entry.action).toBe('tighten');
      expect(entry.before).toEqual({ minAttendance: 75 });
      expect(entry.after).toEqual({ minAttendance: 80 });
      expect(entry.at).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-5, BR-6, AC-1: Institutional SSO & refusal of non-onboarded emails.
  // ---------------------------------------------------------------------------
  describe('BR-5, BR-6, AC-1: Institutional SSO Verification', () => {
    const onboarded = new Set(['student1@sanjivani.edu.in', 'faculty1@sanjivani.edu.in']);

    it('AC-1: Registered onboarded email is permitted', () => {
      const result = verifySsoLogin('student1@sanjivani.edu.in', onboarded);
      expect(result.allowed).toBe(true);
    });

    it('AC-1: Unregistered email is refused with the exact specified message', () => {
      const result = verifySsoLogin('stranger@gmail.com', onboarded);
      expect(result.allowed).toBe(false);
      expect(result.message).toBe(SSO_REFUSAL_MESSAGE);
      expect(result.message).toBe('Your email is not registered on LogicQ. Contact your faculty or HOD.');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-8, AC-2: Roster Import & Duplicate Roll Number Rejection
  // ---------------------------------------------------------------------------
  describe('BR-8, AC-2: Roster Import Conflict Detection', () => {
    const existingDbRolls = new Set(['PRN1001', 'PRN1002']);

    it('AC-2: Importing a roster with duplicate roll number saves nothing and lists conflict', () => {
      const rows = [
        { rollNo: 'PRN1003', name: 'Alice', email: 'alice@sanjivani.edu.in' },
        { rollNo: 'PRN1003', name: 'Alice Copy', email: 'alice2@sanjivani.edu.in' }, // Duplicate in batch
      ];

      const report = validateRosterImport(rows, existingDbRolls);
      expect(report.isValid).toBe(false);
      expect(report.validRows.length).toBe(0); // Saves NOTHING until resolved
      expect(report.conflicts.length).toBe(1);
      expect(report.conflicts[0].rollNo).toBe('PRN1003');
    });

    it('AC-2: Importing a roll number that already exists in DB saves nothing', () => {
      const rows = [
        { rollNo: 'PRN1001', name: 'Existing Student', email: 'existing@sanjivani.edu.in' },
      ];
      const report = validateRosterImport(rows, existingDbRolls);
      expect(report.isValid).toBe(false);
      expect(report.validRows.length).toBe(0);
      expect(report.conflicts[0].rollNo).toBe('PRN1001');
    });

    it('AC-2: Valid clean roster parses and passes completely', () => {
      const rows = [
        { rollNo: 'PRN2001', name: 'Charlie', email: 'charlie@sanjivani.edu.in' },
        { rollNo: 'PRN2002', name: 'David', email: 'david@sanjivani.edu.in' },
      ];
      const report = validateRosterImport(rows, existingDbRolls);
      expect(report.isValid).toBe(true);
      expect(report.validRows.length).toBe(2);
      expect(report.conflicts.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4: A student cannot edit name, roll no or email.
  // ---------------------------------------------------------------------------
  describe('AC-4: Locked Student Roster Fields', () => {
    it('AC-4: Forbids student from editing name, roll no or email', () => {
      expect(validateStudentProfileUpdate({ name: 'Hacked Name' }).allowed).toBe(false);
      expect(validateStudentProfileUpdate({ rollNo: 'NEW_PRN' }).allowed).toBe(false);
      expect(validateStudentProfileUpdate({ email: 'new@gmail.com' }).allowed).toBe(false);
    });

    it('AC-4: Allows student to update permitted fields like phone or photo', () => {
      const result = validateStudentProfileUpdate({ phone: '9876543210', photoUrl: 'https://img.url' });
      expect(result.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-10, BR-11, AC-8: Batch Partitioning
  // BR-10: Batch cap = smaller of 65 and lab room's working seats.
  // BR-11: Number of batches = section size / cap, rounded up.
  //        Sizes differ by at most one (60 -> 1; 64 -> 1; 70 -> 35+35; 125 -> 63+62; 180 -> 60x3).
  // AC-8: A 125-student section in a 65-seat lab produces two batches of 63 and 62.
  // ---------------------------------------------------------------------------
  describe('BR-10, BR-11, AC-8: Batch Partitioning Engine', () => {
    it('AC-8: 125-student section in 65-seat lab produces two batches of 63 and 62', () => {
      const students = Array.from({ length: 125 }, (_, i) => ({
        rollNo: `PRN_${(1000 + i).toString()}`,
      }));

      const { batchCap, batches } = partitionBatches(students, 65);
      expect(batchCap).toBe(65);
      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(63);
      expect(batches[1].length).toBe(62);
      // Total matches exactly
      expect(batches[0].length + batches[1].length).toBe(125);
    });

    it('BR-11: 70 students produces batches of 35 and 35', () => {
      const students = Array.from({ length: 70 }, (_, i) => ({ rollNo: `P${i}` }));
      const { batches } = partitionBatches(students, 65);
      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(35);
      expect(batches[1].length).toBe(35);
    });

    it('BR-11: 180 students produces three batches of 60, 60, 60', () => {
      const students = Array.from({ length: 180 }, (_, i) => ({ rollNo: `P${i}` }));
      const { batches } = partitionBatches(students, 65);
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(60);
      expect(batches[1].length).toBe(60);
      expect(batches[2].length).toBe(60);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-12: Moving students between batches
  // ---------------------------------------------------------------------------
  describe('BR-12: Student Movement Between Batches', () => {
    it('BR-12: Allows move without reason before the first lab session', () => {
      const result = canMoveStudent(false);
      expect(result.allowed).toBe(true);
      expect(result.mustLogReason).toBe(false);
    });

    it('BR-12: Blocks move after first lab session if no reason is given', () => {
      const result = canMoveStudent(true, '');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('BR-12 Violation');
    });

    it('BR-12: Allows move after first lab session when valid reason is provided and logs it', () => {
      const result = canMoveStudent(true, 'Medical accommodation granted by HOD');
      expect(result.allowed).toBe(true);
      expect(result.mustLogReason).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-13 to BR-17, AC-9, AC-10: Session Plan Generator & Calendar Validation
  // ---------------------------------------------------------------------------
  describe('BR-13 to BR-17, AC-9, AC-10: Session Plan Generator', () => {
    const mockTerm: AcademicTerm = {
      id: 'term_2026_odd',
      academicYear: '2026-2027',
      semester: 1,
      startDate: '2026-08-03', // Monday
      lastWorkingDay: '2026-11-20', // Friday (approx 16 weeks)
      endSemWindow: { start: '2026-11-23', end: '2026-12-05' },
    };

    const mockUnits: CourseUnit[] = [
      { id: 'u1', courseId: 'c1', number: 1, title: 'Basics', syllabusHours: 6, topics: [] },
      { id: 'u2', courseId: 'c1', number: 2, title: 'Control', syllabusHours: 6, topics: [] },
      { id: 'u3', courseId: 'c1', number: 3, title: 'Arrays', syllabusHours: 6, topics: [] },
      { id: 'u4', courseId: 'c1', number: 4, title: 'Functions', syllabusHours: 6, topics: [] },
      { id: 'u5', courseId: 'c1', number: 5, title: 'Pointers', syllabusHours: 6, topics: [] },
    ];

    it('AC-9: No lab session is ever placed on a holiday, exam day or no-lab day', () => {
      const holidayDate = '2026-08-17'; // A Monday
      const blocked = new Set([holidayDate]);

      const plan = generateSessionPlan({
        term: mockTerm,
        batchWeekday: 1, // Mondays
        blockedDates: blocked,
        units: mockUnits,
      });

      const sessionDates = plan.sessions.map((s) => s.date);
      expect(sessionDates).not.toContain(holidayDate);
    });

    it('BR-17: Last available period is reserved for makeup session', () => {
      const plan = generateSessionPlan({
        term: mockTerm,
        batchWeekday: 1,
        blockedDates: new Set(),
        units: mockUnits,
        reserveLastPeriodForMakeup: true,
      });

      const makeupSession = plan.sessions.find((s) => s.isMakeup);
      expect(makeupSession).toBeDefined();
      expect(makeupSession?.date).toBe(plan.makeupPeriod);
    });

    it('AC-10: When available periods are fewer than needed, shortfall and 3 options are shown', () => {
      // Simulate heavy holidays so only 8 periods exist
      const heavyHolidays = new Set([
        '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31',
        '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28',
      ]);

      const plan = generateSessionPlan({
        term: mockTerm,
        batchWeekday: 1,
        blockedDates: heavyHolidays,
        units: mockUnits, // needs 15 periods by default
      });

      expect(plan.shortfall).toBeGreaterThan(0);
      expect(plan.optionsRequired).toBe(true);
      expect(plan.shortfallOptions).toEqual([
        'two_programs_in_one_session',
        'extra_lab_period',
        'take_home_practice',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-18, AC-6: Calendar modification sets affected session plans to draft
  // ---------------------------------------------------------------------------
  describe('BR-18, AC-6: Calendar Change Impact on Session Plans', () => {
    it('AC-6: Adding a holiday flags every affected session plan for re-approval', () => {
      const newHoliday: CalendarEvent = {
        id: 'cal_holiday_1',
        termId: 'term_1',
        date: '2026-09-15',
        type: 'holiday',
        title: 'Engineers Day Holiday',
        scopeType: 'university',
        scopeId: 'ALL',
      };

      const existingPlans = [
        {
          planId: 'plan_A',
          batchId: 'batch_A',
          status: 'approved' as const,
          sessions: [
            { id: 's1', planId: 'plan_A', date: '2026-09-08', periodNo: 1, topicIds: ['t1'], isMakeup: false },
            { id: 's2', planId: 'plan_A', date: '2026-09-15', periodNo: 2, topicIds: ['t2'], isMakeup: false }, // Collides!
          ],
        },
        {
          planId: 'plan_B',
          batchId: 'batch_B',
          status: 'approved' as const,
          sessions: [
            { id: 's3', planId: 'plan_B', date: '2026-09-09', periodNo: 1, topicIds: ['t1'], isMakeup: false },
            { id: 's4', planId: 'plan_B', date: '2026-09-16', periodNo: 2, topicIds: ['t2'], isMakeup: false }, // Does not collide
          ],
        },
      ];

      const impact = checkCalendarChangeImpact(newHoliday, existingPlans);
      expect(impact.affectedPlanIds).toEqual(['plan_A']);
      expect(impact.updatedPlans[0].status).toBe('draft');
      expect(impact.updatedPlans[0].flaggedForReapproval).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-7: A course cannot be offered until its COs and CO-PO matrix are approved.
  // ---------------------------------------------------------------------------
  describe('AC-7: Course Offering Eligibility Gating', () => {
    it('AC-7: Rejects offering course when draft or missing COs/CO-PO map', () => {
      // Draft course
      const draftCourse = {
        id: 'c1',
        status: 'draft' as const,
        outcomes: [{ id: 'co1', code: 'CO1', statement: 'Understand C', bloomLevel: 'L2' }],
        coPoMaps: [{ id: 'm1', courseOutcomeId: 'co1', poCode: 'PO1', strength: 3 }],
      };
      expect(canCourseBeOffered(draftCourse).canOffer).toBe(false);

      // Approved but no COs
      const noCosCourse = {
        id: 'c2',
        status: 'approved' as const,
        outcomes: [],
        coPoMaps: [],
      };
      expect(canCourseBeOffered(noCosCourse).canOffer).toBe(false);

      // Fully approved with COs and CO-PO matrix: Allowed
      const validCourse = {
        id: 'c3',
        status: 'approved' as const,
        outcomes: [{ id: 'co1', code: 'CO1', statement: 'Understand C', bloomLevel: 'L2' }],
        coPoMaps: [{ id: 'm1', courseOutcomeId: 'co1', poCode: 'PO1', strength: 3 }],
      };
      expect(canCourseBeOffered(validCourse).canOffer).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-13: A student sees only courses they are enrolled in and only their own marks.
  // ---------------------------------------------------------------------------
  describe('AC-13: Student Enrolled Scoping & Mark Privacy', () => {
    it('AC-13: Student sees only courses they are enrolled in', () => {
      const enrolled = new Set(['CS101', 'CS102']);
      const allCourses = [
        { courseId: 'CS101', title: 'C Programming' },
        { courseId: 'CS102', title: 'Data Structures' },
        { courseId: 'ME101', title: 'Thermodynamics' },
      ];
      const visible = filterCoursesForStudent(enrolled, allCourses);
      expect(visible.map((c) => c.courseId)).toEqual(['CS101', 'CS102']);
    });

    it('AC-13: Student sees only their own marks, never peer marks', () => {
      const records = [
        { studentId: 'student_1', marks: 18 },
        { studentId: 'student_2', marks: 14 },
      ];
      const visible = filterMarksForStudent('student_1', records);
      expect(visible.length).toBe(1);
      expect(visible[0].marks).toBe(18);
    });
  });

});
