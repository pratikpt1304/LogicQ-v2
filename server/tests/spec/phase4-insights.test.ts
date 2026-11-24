import { describe, it, expect } from 'vitest';
import {
  createIntegrityFlag,
  recordHumanIntegrityDecision,
  generateStudentLearningProfile,
  computeTopicHeatMap,
  computeBellCurveStats,
  IntegrityEvent,
  StudentTelemetrySummary,
} from '../../src/domain/lab-course/phase4-rules.js';

describe('Phase 4: Insights, Integrity Review & Learning Profiles Specification Suite', () => {

  // ---------------------------------------------------------------------------
  // BR-39: Integrity events create flags for human review ONLY
  // No automatic mark deduction or automatic misconduct finding.
  // ---------------------------------------------------------------------------
  describe('BR-39: Integrity Flagging and Zero Automatic Deduction', () => {
    const mockEvents: IntegrityEvent[] = [
      { id: 'ev1', attemptId: 'att_100', type: 'tab_switch', timestamp: new Date(), detail: 'Switched to Chrome Tab' },
      { id: 'ev2', attemptId: 'att_100', type: 'fullscreen_exit', timestamp: new Date(), detail: 'Exited fullscreen for 4s' },
      { id: 'ev3', attemptId: 'att_100', type: 'paste', timestamp: new Date(), detail: 'Pasted 120 characters' },
    ];

    it('BR-39: Creates flag for human review and preserves 100% of earned marks without auto-deduction', () => {
      const rawEarnedMarks = 18.5;
      const result = createIntegrityFlag({
        attemptId: 'att_100',
        studentId: 'stud_1',
        rollNo: 'PRN1001',
        name: 'Alice Patil',
        events: mockEvents,
        rawEarnedMarks,
      });

      expect(result.requiresHumanReview).toBe(true);
      expect(result.flag.reviewStatus).toBe('pending');
      // BR-39: Applied marks MUST NOT be automatically reduced
      expect(result.appliedMarks).toBe(rawEarnedMarks);
    });

    it('BR-39: Records human faculty decision (warning or refer to HOD)', () => {
      const { flag } = createIntegrityFlag({
        attemptId: 'att_100',
        studentId: 'stud_1',
        rollNo: 'PRN1001',
        name: 'Alice Patil',
        events: mockEvents,
        rawEarnedMarks: 18.5,
      });

      const reviewed = recordHumanIntegrityDecision({
        flag,
        reviewerId: 'faculty_proctor_patil',
        decision: 'warning',
        notes: 'First time tab switch, student warned verbally during lab session.',
      });

      expect(reviewed.reviewStatus).toBe('warning');
      expect(reviewed.reviewedBy).toBe('faculty_proctor_patil');
      expect(reviewed.facultyNotes).toContain('First time tab switch');
    });
  });

  // ---------------------------------------------------------------------------
  // Learning Profiles (Page 21)
  // ---------------------------------------------------------------------------
  describe('Learning Profiles Synthesis Engine', () => {
    it('Generates plain-language behavioral summary for faculty', () => {
      const telemetry: StudentTelemetrySummary = {
        studentId: 's1',
        rollNo: 'PRN1001',
        name: 'Alice Patil',
        attemptsBeforeFirstPassAvg: 2.1,
        timeOnTaskRatio: 0.7, // Rapid solver (< 0.8)
        compileVsLogicErrorRatio: 0.25, // Mostly logical edge issues
        onTimeRatio: 0.95,
        workPattern: 'steady',
        topicStrengths: ['Arrays', 'Loops'],
        topicStruggles: ['Pointers'],
      };

      const profile = generateStudentLearningProfile(telemetry);
      expect(profile.headline).toContain('solves problems rapidly');
      expect(profile.headline).toContain('mastery in Arrays and Loops');
      expect(profile.headline).toContain('struggles with Pointers');
      expect(profile.headline).toContain('steady coursework rhythm');
      expect(profile.paceRating).toBe('fast');
      expect(profile.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Topic Heat Map: Pass Rate by Topic and Batch (Page 18)
  // ---------------------------------------------------------------------------
  describe('Topic Heat Map Generation', () => {
    it('Calculates pass rates across topics and batches and isolates weakest topics', () => {
      const topics = [
        { id: 'top_arrays', title: 'Array Rotations' },
        { id: 'top_pointers', title: 'Pointer Arithmetic' },
      ];
      const batches = [
        { id: 'b1', name: 'Batch A1' },
        { id: 'b2', name: 'Batch A2' },
      ];

      const submissions = [
        { topicId: 'top_arrays', batchId: 'b1', passed: true },
        { topicId: 'top_arrays', batchId: 'b1', passed: true }, // 100%
        { topicId: 'top_pointers', batchId: 'b1', passed: false },
        { topicId: 'top_pointers', batchId: 'b1', passed: true }, // 50%
        { topicId: 'top_pointers', batchId: 'b2', passed: false }, // 0%
      ];

      const heatMap = computeTopicHeatMap({ topics, batches, submissions });
      expect(heatMap.matrix.length).toBe(4);
      // Pointers has the lower pass rate
      expect(heatMap.weakestTopics[0]).toBe('top_pointers');
    });
  });

  // ---------------------------------------------------------------------------
  // Bell Curve & Distribution (Page 18)
  // ---------------------------------------------------------------------------
  describe('Bell Curve Distribution & Below-Target Shading', () => {
    it('Calculates mean, standard deviation, and below-target cohort', () => {
      const marks = [18, 16, 14, 12, 10, 8, 6]; // max 20, target 50% = 10 marks
      const stats = computeBellCurveStats({
        marks,
        maxMarks: 20,
        studentTargetPct: 50,
      });

      expect(stats.mean).toBe(12.0);
      expect(stats.belowTargetCount).toBe(2); // 8 and 6 are below 10 marks
      expect(stats.distributionBins.length).toBe(5);
      // Below target bins are flagged for UI shading
      const shadedBins = stats.distributionBins.filter((b) => b.isBelowTarget);
      expect(shadedBins.length).toBeGreaterThan(0);
    });
  });

});
