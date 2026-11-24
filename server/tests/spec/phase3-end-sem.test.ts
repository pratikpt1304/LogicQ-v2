import { describe, it, expect } from 'vitest';
import {
  canAccessEndSemPaper,
  evaluateStudentExamEligibility,
  reconcileExamDraftOnReconnect,
  computeCourseOutcomeAttainment,
  computeProgramOutcomeAttainment,
  classifyLearners,
  generateBoardOfStudiesGapReport,
  EndSemPaper,
  StudentExamEligibilityCheck,
} from '../../src/domain/lab-course/phase3-rules.js';

describe('Phase 3: End-Semester Practical & Attainment Specification Suite', () => {

  // ---------------------------------------------------------------------------
  // AC-12: Paper Access Restriction Before Exam Commencement
  // ---------------------------------------------------------------------------
  describe('AC-12: End-Sem Exam Paper Lockdown Before Exam Start', () => {
    const mockPaper: EndSemPaper = {
      id: 'paper_cs201_endsem',
      courseId: 'CS201',
      setterId: 'faculty_setter_101',
      moderatorId: 'faculty_moderator_102',
      hodId: 'hod_cse_103',
      status: 'locked',
      examStartAt: new Date('2026-11-25T10:00:00Z'),
      examEndAt: new Date('2026-11-25T13:00:00Z'),
      blueprint: [],
    };

    const beforeExamTime = new Date('2026-11-25T09:30:00Z');
    const duringExamTime = new Date('2026-11-25T10:15:00Z');

    it('AC-12: Permits paper setter, moderator, and HOD to view paper before exam starts', () => {
      expect(canAccessEndSemPaper({ userId: 'faculty_setter_101', userRole: 'FACULTY', paper: mockPaper, now: beforeExamTime }).allowed).toBe(true);
      expect(canAccessEndSemPaper({ userId: 'faculty_moderator_102', userRole: 'FACULTY', paper: mockPaper, now: beforeExamTime }).allowed).toBe(true);
      expect(canAccessEndSemPaper({ userId: 'hod_cse_103', userRole: 'DEPARTMENT_ADMIN', paper: mockPaper, now: beforeExamTime }).allowed).toBe(true);
    });

    it('AC-12: Blocks students and non-authorized staff from viewing paper before exam starts', () => {
      const studentResult = canAccessEndSemPaper({ userId: 'student_alice', userRole: 'STUDENT', paper: mockPaper, now: beforeExamTime });
      expect(studentResult.allowed).toBe(false);
      expect(studentResult.reason).toContain('AC-12 Violation');

      const otherFacultyResult = canAccessEndSemPaper({ userId: 'faculty_other_200', userRole: 'FACULTY', paper: mockPaper, now: beforeExamTime });
      expect(otherFacultyResult.allowed).toBe(false);
    });

    it('AC-12: Allows students to access paper once exam commencement time arrives', () => {
      const studentResult = canAccessEndSemPaper({ userId: 'student_alice', userRole: 'STUDENT', paper: mockPaper, now: duringExamTime });
      expect(studentResult.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-33 & AC-18: Student Eligibility & CoE Exemption Gating
  // ---------------------------------------------------------------------------
  describe('BR-33, AC-18: End-Semester Practical Eligibility Enforcement', () => {
    it('BR-33: Allows student who meets both attendance and completion thresholds', () => {
      const check: StudentExamEligibilityCheck = {
        studentId: 's1',
        rollNo: 'PRN1001',
        attendancePct: 85,
        labCompletionPct: 90,
        effectiveMinAttendance: 75,
        effectiveMinCompletion: 80,
        hasCoeExemption: false,
      };
      const result = evaluateStudentExamEligibility(check);
      expect(result.isEligible).toBe(true);
      expect(result.exemptionApplied).toBe(false);
    });

    it('AC-18: Blocks student below attendance threshold with no CoE exemption', () => {
      const check: StudentExamEligibilityCheck = {
        studentId: 's2',
        rollNo: 'PRN1002',
        attendancePct: 68, // Below 75%
        labCompletionPct: 85,
        effectiveMinAttendance: 75,
        effectiveMinCompletion: 80,
        hasCoeExemption: false,
      };
      const result = evaluateStudentExamEligibility(check);
      expect(result.isEligible).toBe(false);
      expect(result.blockReason).toContain('AC-18');
      expect(result.blockReason).toContain('Attendance 68%');
    });

    it('AC-18: Allows student below threshold IF CoE has recorded an official exemption', () => {
      const check: StudentExamEligibilityCheck = {
        studentId: 's3',
        rollNo: 'PRN1003',
        attendancePct: 65,
        labCompletionPct: 70,
        effectiveMinAttendance: 75,
        effectiveMinCompletion: 80,
        hasCoeExemption: true, // CoE exemption granted
        exemptionReason: 'Medical leave approved by Dean & CoE',
      };
      const result = evaluateStudentExamEligibility(check);
      expect(result.isEligible).toBe(true);
      expect(result.exemptionApplied).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // NFR-4, NFR-5, AC-14: Server Autosave & Crash Reconnection Engine
  // ---------------------------------------------------------------------------
  describe('NFR-4, NFR-5, AC-14: Mid-Exam Crash Recovery & Timer Computation', () => {
    it('AC-14: Restores code from newer draft and computes server-authoritative remaining time', () => {
      const examStartedAt = new Date('2026-11-25T10:00:00Z');
      const durationMinutes = 60; // 3600 seconds
      const now = new Date('2026-11-25T10:20:00Z'); // 20 minutes in = 40 minutes (2400s) left

      const serverDraft = {
        code: 'int main() { int a = 10; }',
        savedAt: new Date('2026-11-25T10:19:45Z'), // 15 seconds ago
        assessmentId: 'exam_1',
        questionId: 'q_1',
      };

      const localDraft = {
        code: 'int main() { int a = 10; printf("%d", a); }',
        savedAt: new Date('2026-11-25T10:19:55Z'), // 5 seconds ago (newer)
        assessmentId: 'exam_1',
        questionId: 'q_1',
      };

      const result = reconcileExamDraftOnReconnect({
        serverDraft,
        localDraft,
        examStartedAt,
        durationMinutes,
        now,
      });

      // Picks the newer local draft saved within last 15s
      expect(result.source).toBe('local');
      expect(result.activeCode).toContain('printf');
      // Server-computed remaining time: 40 minutes = 2400 seconds
      expect(result.remainingSeconds).toBe(2400);
      expect(result.isTimedOut).toBe(false);
    });

    it('NFR-5: Flags exam as timed out if student reconnects after duration has elapsed', () => {
      const examStartedAt = new Date('2026-11-25T10:00:00Z');
      const durationMinutes = 60;
      const now = new Date('2026-11-25T11:05:00Z'); // 65 minutes later

      const result = reconcileExamDraftOnReconnect({
        examStartedAt,
        durationMinutes,
        now,
      });

      expect(result.remainingSeconds).toBe(0);
      expect(result.isTimedOut).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-29, BR-30, BR-31, AC-17: Course Outcome (CO) Attainment
  // ---------------------------------------------------------------------------
  describe('BR-29..31, AC-17: Course Outcome (CO) Attainment Computation', () => {
    const studentScores = [
      { studentId: 's1', marksEarned: 18, marksMax: 20 }, // 90% (>= 50%)
      { studentId: 's2', marksEarned: 14, marksMax: 20 }, // 70% (>= 50%)
      { studentId: 's3', marksEarned: 12, marksMax: 20 }, // 60% (>= 50%)
      { studentId: 's4', marksEarned: 10, marksMax: 20 }, // 50% (>= 50%)
      { studentId: 's5', marksEarned: 8, marksMax: 20 },  // 40% (< 50%)
    ]; // 4 out of 5 students meet target = 80%

    it('BR-30, BR-31: Computes CO attainment at default 50% student target and 60% class threshold', () => {
      const result = computeCourseOutcomeAttainment({
        coId: 'CO1',
        studentScores,
        config: {
          studentTargetPct: 50,
          classThresholdPct: 60,
          completionThresholdPct: 80,
        },
      });

      expect(result.totalStudents).toBe(5);
      expect(result.studentsMeetingTarget).toBe(4);
      expect(result.pctStudentsMeeting).toBe(80.0);
      expect(result.attained).toBe(true); // 80% >= 60%
    });

    it('AC-17: Immediate re-computation when target threshold is raised', () => {
      // Raise student target to 75%
      // Only s1 (90%) meets 75% -> 1 out of 5 = 20%
      const result = computeCourseOutcomeAttainment({
        coId: 'CO1',
        studentScores,
        config: {
          studentTargetPct: 75,
          classThresholdPct: 60,
          completionThresholdPct: 80,
        },
      });

      expect(result.studentsMeetingTarget).toBe(1);
      expect(result.pctStudentsMeeting).toBe(20.0);
      expect(result.attained).toBe(false); // 20% < 60%
    });
  });

  // ---------------------------------------------------------------------------
  // BR-34: Program Outcome (PO) Attainment Roll-Up
  // ---------------------------------------------------------------------------
  describe('BR-34: Program Outcome (PO) Attainment Calculation', () => {
    it('BR-34: Accurately rolls up weighted CO scores to PO attainment', () => {
      const coMap = new Map();
      coMap.set('CO1', { coId: 'CO1', pctStudentsMeeting: 80, attained: true, level: 3 });
      coMap.set('CO2', { coId: 'CO2', pctStudentsMeeting: 60, attained: true, level: 2 });

      const coPoMappings = [
        { coId: 'CO1', poCode: 'PO1', strength: 3 },
        { coId: 'CO2', poCode: 'PO1', strength: 2 },
      ]; // Weighted: (3*3 + 2*2) / (3+2) = (9 + 4) / 5 = 13 / 5 = 2.6

      const poResult = computeProgramOutcomeAttainment({
        poCode: 'PO1',
        coAttainments: coMap,
        coPoMappings,
      });

      expect(poResult.weightedScore).toBe(2.6);
      expect(poResult.normalizedAttainment).toBe(87); // (2.6 / 3) * 100 ~ 87%
    });
  });

  // ---------------------------------------------------------------------------
  // BR-35: Slow and Advanced Learners Classification
  // ---------------------------------------------------------------------------
  describe('BR-35: Slow vs Advanced Learners Classification', () => {
    it('BR-35: Categorizes students into slow (<50%), average, and advanced (>=85%)', () => {
      const students = [
        { studentId: 's1', rollNo: '1001', name: 'Alice', percentage: 92 },
        { studentId: 's2', rollNo: '1002', name: 'Bob', percentage: 74 },
        { studentId: 's3', rollNo: '1003', name: 'Charlie', percentage: 42 },
      ];

      const { slowLearners, averageLearners, advancedLearners } = classifyLearners({
        students,
        studentTargetPct: 50,
        advancedThresholdPct: 85,
      });

      expect(advancedLearners.length).toBe(1);
      expect(advancedLearners[0].name).toBe('Alice');

      expect(averageLearners.length).toBe(1);
      expect(averageLearners[0].name).toBe('Bob');

      expect(slowLearners.length).toBe(1);
      expect(slowLearners[0].name).toBe('Charlie');
    });
  });

  // ---------------------------------------------------------------------------
  // F11: Board of Studies Gap Report Draft
  // ---------------------------------------------------------------------------
  describe('F11: Board of Studies Gap Report Synthesis', () => {
    it('F11: Generates gap summary and actionable remedial recommendations', () => {
      const report = generateBoardOfStudiesGapReport({
        coAttainments: [
          { coId: 'CO1', totalStudents: 60, studentsMeetingTarget: 50, pctStudentsMeeting: 83.3, attained: true },
          { coId: 'CO3', totalStudents: 60, studentsMeetingTarget: 25, pctStudentsMeeting: 41.6, attained: false },
        ],
        weakestTopics: [{ topicTitle: 'Pointers & Dynamic Memory', passRatePct: 40 }],
        commonErrorTypes: [{ errorType: 'Segmentation Fault', count: 45 }],
      });

      expect(report.unAttainedCos).toEqual(['CO3']);
      expect(report.gapSummary).toContain('CO3');
      expect(report.suggestedRemediations.length).toBeGreaterThan(0);
    });
  });

});
