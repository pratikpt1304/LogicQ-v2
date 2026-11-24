import { describe, it, expect } from 'vitest';
import {
  assignVariantForStudent,
  validateTestCasesRequirements,
  canApproveCodingQuestion,
  sanitizeTestCaseResultsForStudent,
  calculateEffectiveDueDate,
  evaluateSubmissionTiming,
  calculateWeightedCodingMarks,
  calculateLabInternalMarks,
  generateLabFileVerificationDossier,
  createAiDraftItem,
  canPublishQuestion,
  sanitizePromptForAi,
  validatePrePostLabBank,
  randomizeLabMcqs,
  validateSessionCodingQuestions,
  TestCase,
  QuestionVariant,
  McqQuestionItem,
} from '../../src/domain/lab-course/phase2-rules.js';

describe('Phase 2: Lab Programs, Variants & Test Cases Specification Suite', () => {

  // ---------------------------------------------------------------------------
  // BR-19: Adjacent Seat Non-Overlap Guarantee
  // Formula: (student position in batch + question offset) mod totalVariants
  // ---------------------------------------------------------------------------
  describe('BR-19: Anti-Collusion Question Variant Assignment', () => {
    it('BR-19: Neighbouring roll numbers never share a variant across any question', () => {
      const totalVariants = 4; // 3 to 5 variants per BR-19
      const questionOffset = 2;

      // 5 adjacent students in lab seats: Roll 1001, 1002, 1003, 1004, 1005 (indices 0..4)
      const seat0 = assignVariantForStudent(0, questionOffset, totalVariants);
      const seat1 = assignVariantForStudent(1, questionOffset, totalVariants);
      const seat2 = assignVariantForStudent(2, questionOffset, totalVariants);
      const seat3 = assignVariantForStudent(3, questionOffset, totalVariants);
      const seat4 = assignVariantForStudent(4, questionOffset, totalVariants);

      // Verify no two adjacent seats receive the same variant
      expect(seat0).not.toBe(seat1);
      expect(seat1).not.toBe(seat2);
      expect(seat2).not.toBe(seat3);
      expect(seat3).not.toBe(seat4);

      // Verify modulo bounds
      [seat0, seat1, seat2, seat3, seat4].forEach((variant) => {
        expect(variant).toBeGreaterThanOrEqual(0);
        expect(variant).toBeLessThan(totalVariants);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // BR-20: Test Case Count Requirement (At least 2 visible and 3 hidden)
  // ---------------------------------------------------------------------------
  describe('BR-20: Test Case Composition Requirements', () => {
    it('BR-20: Rejects variant with insufficient visible test cases (< 2)', () => {
      const testCases: TestCase[] = [
        { id: 'tc1', input: '1', expectedOutput: '1', isHidden: false, weight: 1 }, // Only 1 visible
        { id: 'tc2', input: '2', expectedOutput: '2', isHidden: true, weight: 1 },
        { id: 'tc3', input: '3', expectedOutput: '3', isHidden: true, weight: 1 },
        { id: 'tc4', input: '4', expectedOutput: '4', isHidden: true, weight: 1 },
      ];
      const check = validateTestCasesRequirements(testCases);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('BR-20 Violation');
    });

    it('BR-20: Rejects variant with insufficient hidden test cases (< 3)', () => {
      const testCases: TestCase[] = [
        { id: 'tc1', input: '1', expectedOutput: '1', isHidden: false, weight: 1 },
        { id: 'tc2', input: '2', expectedOutput: '2', isHidden: false, weight: 1 },
        { id: 'tc3', input: '3', expectedOutput: '3', isHidden: true, weight: 1 }, // Only 2 hidden
        { id: 'tc4', input: '4', expectedOutput: '4', isHidden: true, weight: 1 },
      ];
      const check = validateTestCasesRequirements(testCases);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('BR-20 Violation');
    });

    it('BR-20: Accepts compliant variant with at least 2 visible and 3 hidden test cases', () => {
      const testCases: TestCase[] = [
        { id: 'tc1', input: '1', expectedOutput: '1', isHidden: false, weight: 1 },
        { id: 'tc2', input: '2', expectedOutput: '2', isHidden: false, weight: 1 },
        { id: 'tc3', input: '3', expectedOutput: '3', isHidden: true, weight: 2 },
        { id: 'tc4', input: '4', expectedOutput: '4', isHidden: true, weight: 2 },
        { id: 'tc5', input: '5', expectedOutput: '5', isHidden: true, weight: 2 },
      ];
      const check = validateTestCasesRequirements(testCases);
      expect(check.valid).toBe(true);
      expect(check.visibleCount).toBe(2);
      expect(check.hiddenCount).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-11: A coding question cannot be approved unless its reference solution
  // passes every test case in the judge.
  // ---------------------------------------------------------------------------
  describe('AC-11: Reference Solution Judge Validation Before Approval', () => {
    const validTestCases: TestCase[] = [
      { id: 'tc1', input: '2 3', expectedOutput: '5', isHidden: false, weight: 1 },
      { id: 'tc2', input: '0 0', expectedOutput: '0', isHidden: false, weight: 1 },
      { id: 'tc3', input: '-1 1', expectedOutput: '0', isHidden: true, weight: 2 },
      { id: 'tc4', input: '1000 2000', expectedOutput: '3000', isHidden: true, weight: 2 },
      { id: 'tc5', input: '-50 -50', expectedOutput: '-100', isHidden: true, weight: 2 },
    ];

    const mockVariant: QuestionVariant = {
      id: 'var_1',
      variantIndex: 0,
      statement: 'Add two integers',
      referenceSolution: '#include <stdio.h>\nint main(){ int a,b; scanf("%d%d",&a,&b); printf("%d", a+b); return 0; }',
      timeLimitMs: 1000,
      memoryKb: 65536,
      testCases: validTestCases,
    };

    it('AC-11: Approves question when reference solution passes 100% of test cases in judge', () => {
      const allPassedJudgeResults = validTestCases.map((tc) => ({
        testCaseId: tc.id,
        passed: true,
      }));

      const result = canApproveCodingQuestion(mockVariant, allPassedJudgeResults);
      expect(result.canApprove).toBe(true);
      expect(result.passedRatio).toBe(1.0);
    });

    it('AC-11: Rejects approval if reference solution fails even a single test case', () => {
      const partialJudgeResults = [
        { testCaseId: 'tc1', passed: true },
        { testCaseId: 'tc2', passed: true },
        { testCaseId: 'tc3', passed: true },
        { testCaseId: 'tc4', passed: false }, // Failed large input
        { testCaseId: 'tc5', passed: true },
      ];

      const result = canApproveCodingQuestion(mockVariant, partialJudgeResults);
      expect(result.canApprove).toBe(false);
      expect(result.passedRatio).toBe(0.8);
      expect(result.error).toContain('AC-11 Violation');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-21 & AC-15: Hidden test cases are never sent to student browser or PDF
  // ---------------------------------------------------------------------------
  describe('BR-21, AC-15: Student Hidden Test Case Sanitization', () => {
    it('AC-15: Completely strips input and output for hidden test cases', () => {
      const rawResults = [
        {
          testCase: { id: 'tc_vis_1', input: '10', expectedOutput: '20', isHidden: false, weight: 1 },
          passed: true,
          actualOutput: '20',
        },
        {
          testCase: {
            id: 'tc_hid_2',
            input: 'SECRET_STRESS_INPUT_9999',
            expectedOutput: 'SECRET_EXPECTED_RESULT',
            isHidden: true,
            weight: 2,
          },
          passed: true,
          actualOutput: 'SECRET_EXPECTED_RESULT',
        },
      ];

      const sanitized = sanitizeTestCaseResultsForStudent(rawResults);

      // Visible test case includes input and expected output
      expect(sanitized[0].isHidden).toBe(false);
      expect(sanitized[0].input).toBe('10');
      expect(sanitized[0].expectedOutput).toBe('20');
      expect(sanitized[0].actualOutput).toBe('20');

      // Hidden test case MUST NOT leak input or output (AC-15)
      expect(sanitized[1].isHidden).toBe(true);
      expect(sanitized[1].input).toBeUndefined();
      expect(sanitized[1].expectedOutput).toBeUndefined();
      expect(sanitized[1].actualOutput).toBeUndefined();
      expect(sanitized[1].passed).toBe(true); // Only passed/failed is permitted
    });
  });

  // ---------------------------------------------------------------------------
  // BR-22, BR-24: Due Date Calculation & Holiday Shifting
  // ---------------------------------------------------------------------------
  describe('BR-22, BR-24: Due Date Holiday Shift Engine', () => {
    it('BR-24: Shifts due date to next working day if it falls on an official holiday', () => {
      const holidayDate = '2026-10-02'; // Mahatma Gandhi Jayanti
      const targetDue = new Date('2026-10-02T23:59:00Z');
      const holidays = new Set([holidayDate]);

      const result = calculateEffectiveDueDate(targetDue, holidays);
      expect(result.shiftedFromHoliday).toBe(true);
      // Shifted to next day: Oct 3rd at 23:59
      expect(result.effectiveDate.toISOString().split('T')[0]).toBe('2026-10-03');
    });

    it('BR-24: Keeps due date intact if it falls on a normal working day', () => {
      const targetDue = new Date('2026-10-06T18:00:00Z');
      const holidays = new Set(['2026-10-02']);

      const result = calculateEffectiveDueDate(targetDue, holidays);
      expect(result.shiftedFromHoliday).toBe(false);
      expect(result.effectiveDate.toISOString().split('T')[0]).toBe('2026-10-06');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-23: Grace Period & Late Submission Rules
  // ---------------------------------------------------------------------------
  describe('BR-23: Grace Period & Late Work Evaluation', () => {
    const dueAt = new Date('2026-11-20T17:00:00Z');

    it('BR-23: Marks submission before due date as ON_TIME with 1.0 multiplier', () => {
      const submittedAt = new Date('2026-11-20T16:30:00Z');
      const evalResult = evaluateSubmissionTiming({ submittedAt, dueAt, gracePeriodHours: 24 });
      expect(evalResult.isOnTime).toBe(true);
      expect(evalResult.scoreMultiplier).toBe(1.0);
      expect(evalResult.flag).toBe('ON_TIME');
    });

    it('BR-23: Default accept_and_flag allows late submission within 24h grace period with flag', () => {
      const submittedAt = new Date('2026-11-21T10:00:00Z'); // 17 hours late, within 24h grace
      const evalResult = evaluateSubmissionTiming({
        submittedAt,
        dueAt,
        gracePeriodHours: 24,
        lateRule: 'accept_and_flag',
      });
      expect(evalResult.isOnTime).toBe(false);
      expect(evalResult.isWithinGrace).toBe(true);
      expect(evalResult.scoreMultiplier).toBe(1.0);
      expect(evalResult.flag).toBe('ACCEPTED_LATE');
    });

    it('BR-23: Deduct percentage reduces credit for late submission within grace period', () => {
      const submittedAt = new Date('2026-11-21T10:00:00Z');
      const evalResult = evaluateSubmissionTiming({
        submittedAt,
        dueAt,
        gracePeriodHours: 24,
        lateRule: 'deduct_percentage',
        penaltyPercentage: 50, // 50% penalty
      });
      expect(evalResult.isWithinGrace).toBe(true);
      expect(evalResult.scoreMultiplier).toBe(0.5);
      expect(evalResult.flag).toBe('PENALIZED_LATE');
    });

    it('BR-23: Rejects submission submitted after grace period expires', () => {
      const submittedAt = new Date('2026-11-22T18:00:00Z'); // 49 hours late (> 24h)
      const evalResult = evaluateSubmissionTiming({ submittedAt, dueAt, gracePeriodHours: 24 });
      expect(evalResult.isRejected).toBe(true);
      expect(evalResult.scoreMultiplier).toBe(0.0);
      expect(evalResult.flag).toBe('REJECTED_AFTER_GRACE');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-26: Coding Marks Weighted Calculation
  // ---------------------------------------------------------------------------
  describe('BR-26: Weighted Test Case Marks Calculation', () => {
    const testCases: TestCase[] = [
      { id: 'tc1', input: '', expectedOutput: '', isHidden: false, weight: 1 },
      { id: 'tc2', input: '', expectedOutput: '', isHidden: false, weight: 1 },
      { id: 'tc3', input: '', expectedOutput: '', isHidden: true, weight: 2 },
      { id: 'tc4', input: '', expectedOutput: '', isHidden: true, weight: 3 },
      { id: 'tc5', input: '', expectedOutput: '', isHidden: true, weight: 3 },
    ]; // Total weight: 1 + 1 + 2 + 3 + 3 = 10

    it('BR-26: Awards full marks when all weighted tests pass', () => {
      const passedIds = new Set(['tc1', 'tc2', 'tc3', 'tc4', 'tc5']);
      const result = calculateWeightedCodingMarks({
        itemMaxMarks: 20,
        testCases,
        passedTestCaseIds: passedIds,
      });
      expect(result.earnedMarks).toBe(20);
      expect(result.percentage).toBe(100);
    });

    it('BR-26: Pro-rates marks based on exact weighted proportion', () => {
      // Passes tc1 (weight 1), tc2 (weight 1), tc3 (weight 2) = 4 / 10 weight = 40%
      const passedIds = new Set(['tc1', 'tc2', 'tc3']);
      const result = calculateWeightedCodingMarks({
        itemMaxMarks: 20,
        testCases,
        passedTestCaseIds: passedIds,
      });
      expect(result.earnedMarks).toBe(8.0); // 20 * 0.40 = 8.0
      expect(result.percentage).toBe(40);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-25: Lab Internal Scaling to Offering Maximum
  // ---------------------------------------------------------------------------
  describe('BR-25: Lab Internal Scaling Engine', () => {
    it('BR-25: Accurately computes marks so far and scales to offering lab internal maximum', () => {
      const items = [
        { earnedMarks: 10, maxMarks: 10 },
        { earnedMarks: 8, maxMarks: 10 },
        { earnedMarks: 10, maxMarks: 10 },
      ]; // Raw: 28 earned out of 30 available

      const result = calculateLabInternalMarks({
        gradedOrDueItems: items,
        offeringLabInternalMax: 20.0,
        totalPlannedItemsMaxMarks: 100.0, // 10 labs x 10 marks = 100 total
      });

      expect(result.rawMarksSoFar).toBe(28.0);
      expect(result.maxMarksAvailableSoFar).toBe(30.0);
      // Scaled so far: 28 / 100 * 20 = 5.6 marks
      expect(result.scaledMarksSoFar).toBe(5.6);
      // Projected based on current run rate: 28 / 30 * 20 = 18.67 marks
      expect(result.finalProjectedMarks).toBe(18.67);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-16: Tamper-Evident QR Dossier & Verification URL
  // ---------------------------------------------------------------------------
  describe('AC-16: Tamper-Evident Lab File QR Verification', () => {
    it('AC-16: Generates a tamper-evident hash that binds roll number and marks', () => {
      const dossier = generateLabFileVerificationDossier({
        studentRollNo: 'PRN20261001',
        courseCode: 'CS201',
        semester: 3,
        academicYear: '2026-2027',
        totalMarksEarned: 18.5,
        totalMarksMax: 20.0,
        totalLabsCompleted: 12,
      });

      expect(dossier.verificationCode).toContain('LQ-CS201-PRN20261001');
      expect(dossier.verificationUrl).toContain('roll=PRN20261001');
      expect(dossier.verificationUrl).toContain('marks=18.5');
      expect(dossier.payload.fingerprint).toBeDefined();
      expect(dossier.payload.fingerprint.length).toBe(16);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-36: AI Draft Content Status Gating
  // ---------------------------------------------------------------------------
  describe('BR-36: AI Content Draft & Approval Gating', () => {
    it('BR-36: AI-generated content is created with status draft and source ai', () => {
      const aiDraft = createAiDraftItem({
        topicId: 'top_1',
        coId: 'co_1',
        variants: [],
      });

      expect(aiDraft.source).toBe('ai');
      expect(aiDraft.status).toBe('draft');
      expect(canPublishQuestion(aiDraft).allowed).toBe(false);
      expect(canPublishQuestion(aiDraft).error).toContain('BR-36 Violation');
    });

    it('BR-36: Approved question is permitted to publish', () => {
      const approvedQ = createAiDraftItem({ topicId: 'top_1', coId: 'co_1', variants: [] });
      approvedQ.status = 'approved';
      expect(canPublishQuestion(approvedQ).allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-37: AI Prompt Student Privacy & Sanitization
  // ---------------------------------------------------------------------------
  describe('BR-37: AI Prompt PII Stripping', () => {
    it('BR-37: Intercepts and redacts student names, emails, and roll numbers from AI prompts', () => {
      const promptWithPii = 'Evaluate code written by student Alice Patil (Roll: PRN20261001, alice@sanjivani.edu.in)';
      const sanitized = sanitizePromptForAi(promptWithPii, {
        name: 'Alice Patil',
        rollNo: 'PRN20261001',
        email: 'alice@sanjivani.edu.in',
      });

      expect(sanitized.containsPii).toBe(true);
      expect(sanitized.cleanPrompt).not.toContain('Alice Patil');
      expect(sanitized.cleanPrompt).not.toContain('PRN20261001');
      expect(sanitized.cleanPrompt).not.toContain('alice@sanjivani.edu.in');
      expect(sanitized.cleanPrompt).toContain('[STUDENT]');
      expect(sanitized.cleanPrompt).toContain('[ROLL_NO]');
    });
  });

  // ---------------------------------------------------------------------------
  // Lab Internal Questions (2 choices, max 2 kept) & Pre/Post-Lab MCQ Banks (15 Qs, 3 randomized)
  // ---------------------------------------------------------------------------
  describe('Lab Internal Questions & Pre/Post-Lab MCQ Banks Specification', () => {
    it('Enforces max two questions kept per session (Choice A & Choice B)', () => {
      const validChoices = [
        { id: 'q1', choiceLabel: 'A', title: 'Implement Binary Search' },
        { id: 'q2', choiceLabel: 'B', title: 'Implement Quick Sort' },
      ];
      expect(validateSessionCodingQuestions(validChoices).valid).toBe(true);

      const excessChoices = [
        ...validChoices,
        { id: 'q3', choiceLabel: 'C', title: 'Implement Heap' },
      ];
      const check = validateSessionCodingQuestions(excessChoices);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Max two questions per session');
    });

    it('Validates Pre-Lab and Post-Lab banks have exactly 15 questions each', () => {
      const makeMcq = (i: number): McqQuestionItem => ({
        id: `mcq_${i}`,
        question: `Question ${i}?`,
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
      });

      const bank15 = Array.from({ length: 15 }, (_, i) => makeMcq(i + 1));
      const bank10 = Array.from({ length: 10 }, (_, i) => makeMcq(i + 1));

      const validCheck = validatePrePostLabBank({
        preLabQuestions: bank15,
        postLabQuestions: bank15,
      });
      expect(validCheck.valid).toBe(true);

      const invalidCheck = validatePrePostLabBank({
        preLabQuestions: bank10,
        postLabQuestions: bank15,
      });
      expect(invalidCheck.valid).toBe(false);
      expect(invalidCheck.errors[0]).toContain('Pre-lab MCQ bank must contain exactly 15 questions');
    });

    it('Randomizes exactly 3 questions deterministically per student seed', () => {
      const bank: McqQuestionItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `q_${i + 1}`,
        question: `Question ${i + 1}`,
        options: ['Opt1', 'Opt2', 'Opt3', 'Opt4'],
        correctOptionIndex: 1,
      }));

      // Student 1 (PRN 20261001)
      const student1Selection = randomizeLabMcqs(bank, 'PRN20261001', 3);
      expect(student1Selection.length).toBe(3);

      // Same student gets consistent set on re-fetch
      const student1Repeat = randomizeLabMcqs(bank, 'PRN20261001', 3);
      expect(student1Selection.map(q => q.id)).toEqual(student1Repeat.map(q => q.id));

      // Student 2 (PRN 20261002) gets randomized different set
      const student2Selection = randomizeLabMcqs(bank, 'PRN20261002', 3);
      expect(student2Selection.length).toBe(3);
      expect(student1Selection.map(q => q.id)).not.toEqual(student2Selection.map(q => q.id));
    });
  });

});
