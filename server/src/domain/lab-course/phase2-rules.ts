import crypto from 'crypto';

// -----------------------------------------------------------------------------
// TYPES FOR PHASE 2 (Lab Programs, Test Cases, Variants & Grading)
// -----------------------------------------------------------------------------
export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean; // BR-20: At least 2 visible + 3 hidden
  weight: number;    // BR-26: Weighted scoring
}

export interface SanitizedTestCaseResult {
  testCaseId: string;
  isHidden: boolean;
  passed: boolean;
  input?: string;          // Only included if isHidden is false (BR-21, AC-15)
  expectedOutput?: string; // Only included if isHidden is false (BR-21, AC-15)
  actualOutput?: string;   // Only included if isHidden is false (BR-21, AC-15)
  executionTimeMs?: number;
  memoryKb?: number;
}

export interface QuestionVariant {
  id: string;
  variantIndex: number; // 0..N
  statement: string;
  referenceSolution: string;
  timeLimitMs: number;
  memoryKb: number;
  testCases: TestCase[];
}

export interface Question {
  id: string;
  topicId: string;
  coId: string;
  type: 'coding' | 'mcq';
  bloomLevel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source: 'ai' | 'faculty';
  status: 'draft' | 'checked' | 'approved' | 'retired';
  approvedBy?: string;
  variants: QuestionVariant[];
}

// -----------------------------------------------------------------------------
// BR-19: Each topic has 3–5 variants.
// Variant for a student = (student's position in the batch by roll no + question offset) mod number of variants
// neighbouring roll numbers never share a variant.
// -----------------------------------------------------------------------------
export function assignVariantForStudent(
  positionInBatchByRollNo: number, // 0-indexed position
  questionOffset: number,
  totalVariants: number
): number {
  if (totalVariants <= 0) {
    throw new Error('Total variants must be greater than zero');
  }
  // Formula from page 16 BR-19
  const variantIndex = (positionInBatchByRollNo + questionOffset) % totalVariants;
  return variantIndex;
}

// -----------------------------------------------------------------------------
// BR-20: Every assessed coding variant has at least 2 visible and 3 hidden test cases
// (normal, boundary, edge or large input) and a reference solution that passes all of them.
// -----------------------------------------------------------------------------
export function validateTestCasesRequirements(testCases: TestCase[]): {
  valid: boolean;
  visibleCount: number;
  hiddenCount: number;
  error?: string;
} {
  const visibleCount = testCases.filter((tc) => !tc.isHidden).length;
  const hiddenCount = testCases.filter((tc) => tc.isHidden).length;

  if (visibleCount < 2 || hiddenCount < 3) {
    return {
      valid: false,
      visibleCount,
      hiddenCount,
      error: `BR-20 Violation: Every variant must have at least 2 visible test cases (found: ${visibleCount}) and at least 3 hidden test cases (found: ${hiddenCount}).`,
    };
  }

  return { valid: true, visibleCount, hiddenCount };
}

// -----------------------------------------------------------------------------
// AC-11: A coding question cannot be approved unless its reference solution passes
// every test case in the judge.
// -----------------------------------------------------------------------------
export function canApproveCodingQuestion(
  variant: QuestionVariant,
  judgeResults: { testCaseId: string; passed: boolean }[]
): { canApprove: boolean; passedRatio: number; error?: string } {
  // First check test case structure (BR-20)
  const structureCheck = validateTestCasesRequirements(variant.testCases);
  if (!structureCheck.valid) {
    return { canApprove: false, passedRatio: 0, error: structureCheck.error };
  }

  // Check judge results against every test case in variant
  const total = variant.testCases.length;
  const passedCount = variant.testCases.filter((tc) => {
    const res = judgeResults.find((r) => r.testCaseId === tc.id);
    return res && res.passed;
  }).length;

  if (passedCount < total) {
    return {
      canApprove: false,
      passedRatio: passedCount / total,
      error: `AC-11 Violation: Reference solution failed ${total - passedCount} of ${total} test cases. Reference solution must pass 100% of test cases in the judge before approval.`,
    };
  }

  return { canApprove: true, passedRatio: 1.0 };
}

// -----------------------------------------------------------------------------
// BR-21 & AC-15: Hidden test case inputs and outputs are never sent to the
// student's browser or printed in any student-facing file; students see only passed or failed.
// -----------------------------------------------------------------------------
export function sanitizeTestCaseResultsForStudent(
  rawResults: {
    testCase: TestCase;
    passed: boolean;
    actualOutput?: string;
    executionTimeMs?: number;
    memoryKb?: number;
  }[]
): SanitizedTestCaseResult[] {
  return rawResults.map((r) => {
    if (r.testCase.isHidden) {
      // AC-15: Completely sanitize hidden test cases
      return {
        testCaseId: r.testCase.id,
        isHidden: true,
        passed: r.passed,
        executionTimeMs: r.executionTimeMs,
        memoryKb: r.memoryKb,
      };
    } else {
      // Visible test case: student can inspect input & expected vs actual output
      return {
        testCaseId: r.testCase.id,
        isHidden: false,
        passed: r.passed,
        input: r.testCase.input,
        expectedOutput: r.testCase.expectedOutput,
        actualOutput: r.actualOutput,
        executionTimeMs: r.executionTimeMs,
        memoryKb: r.memoryKb,
      };
    }
  });
}

// -----------------------------------------------------------------------------
// BR-22, BR-24: Due date options and holiday shift rule
// BR-24: A due date falling on a holiday moves to the next working day at the same time.
// -----------------------------------------------------------------------------
export function calculateEffectiveDueDate(
  targetDate: Date,
  holidayDates: Set<string> // Set of 'YYYY-MM-DD'
): { effectiveDate: Date; shiftedFromHoliday: boolean } {
  let curr = new Date(targetDate);
  let shifted = false;

  // Format date string in local date 'YYYY-MM-DD'
  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  while (holidayDates.has(toDateStr(curr))) {
    shifted = true;
    // Move to next day at the exact same time
    curr.setDate(curr.getDate() + 1);
  }

  return { effectiveDate: curr, shiftedFromHoliday: shifted };
}

// -----------------------------------------------------------------------------
// BR-23: Grace period (default 24h, can be 0).
// Late rule: accept and flag, deduct a set percentage, or close. Default: accept and flag.
// -----------------------------------------------------------------------------
export type LateRuleOption = 'accept_and_flag' | 'deduct_percentage' | 'close';

export function evaluateSubmissionTiming(params: {
  submittedAt: Date;
  dueAt: Date;
  gracePeriodHours?: number; // default 24h
  lateRule?: LateRuleOption; // default accept_and_flag
  penaltyPercentage?: number; // e.g. 50%
}): {
  isOnTime: boolean;
  isWithinGrace: boolean;
  isLate: boolean;
  isRejected: boolean;
  scoreMultiplier: number; // 1.0, 0.5, 0.0
  flag: 'ON_TIME' | 'ACCEPTED_LATE' | 'PENALIZED_LATE' | 'REJECTED_AFTER_GRACE';
} {
  const graceHours = params.gracePeriodHours ?? 24;
  const lateRule = params.lateRule ?? 'accept_and_flag';
  const penalty = params.penaltyPercentage ?? 50;

  const dueTime = params.dueAt.getTime();
  const graceTime = dueTime + graceHours * 3600 * 1000;
  const subTime = params.submittedAt.getTime();

  // On time
  if (subTime <= dueTime) {
    return {
      isOnTime: true,
      isWithinGrace: false,
      isLate: false,
      isRejected: false,
      scoreMultiplier: 1.0,
      flag: 'ON_TIME',
    };
  }

  // Beyond grace period
  if (subTime > graceTime) {
    return {
      isOnTime: false,
      isWithinGrace: false,
      isLate: true,
      isRejected: true,
      scoreMultiplier: 0.0,
      flag: 'REJECTED_AFTER_GRACE',
    };
  }

  // Within grace period (Late)
  if (lateRule === 'close') {
    return {
      isOnTime: false,
      isWithinGrace: true,
      isLate: true,
      isRejected: true,
      scoreMultiplier: 0.0,
      flag: 'REJECTED_AFTER_GRACE',
    };
  } else if (lateRule === 'deduct_percentage') {
    const mult = Math.max(0, (100 - penalty) / 100);
    return {
      isOnTime: false,
      isWithinGrace: true,
      isLate: true,
      isRejected: false,
      scoreMultiplier: mult,
      flag: 'PENALIZED_LATE',
    };
  } else {
    // accept_and_flag (default)
    return {
      isOnTime: false,
      isWithinGrace: true,
      isLate: true,
      isRejected: false,
      scoreMultiplier: 1.0,
      flag: 'ACCEPTED_LATE',
    };
  }
}

// -----------------------------------------------------------------------------
// BR-26: Coding marks = item marks × (weighted hidden and visible tests passed ÷ total weight)
// The best submission before the deadline counts.
// -----------------------------------------------------------------------------
export function calculateWeightedCodingMarks(params: {
  itemMaxMarks: number;
  testCases: TestCase[];
  passedTestCaseIds: Set<string>;
  scoreMultiplier?: number; // e.g. 1.0 or 0.5 from late rule
}): {
  earnedMarks: number;
  totalWeight: number;
  passedWeight: number;
  percentage: number;
} {
  const mult = params.scoreMultiplier ?? 1.0;
  let totalWeight = 0;
  let passedWeight = 0;

  for (const tc of params.testCases) {
    const w = tc.weight > 0 ? tc.weight : 1;
    totalWeight += w;
    if (params.passedTestCaseIds.has(tc.id)) {
      passedWeight += w;
    }
  }

  if (totalWeight === 0) {
    return { earnedMarks: 0, totalWeight: 0, passedWeight: 0, percentage: 0 };
  }

  const fraction = passedWeight / totalWeight;
  const rawMarks = params.itemMaxMarks * fraction;
  const earnedMarks = Math.round(rawMarks * mult * 100) / 100;
  const percentage = Math.round(fraction * 100);

  return { earnedMarks, totalWeight, passedWeight, percentage };
}

// -----------------------------------------------------------------------------
// BR-25: Marks so far = sum of marks on items whose due date has passed or that are graded;
// marks available so far = sum of maximum marks on the same items;
// final total = the lab internal maximum set for the offering. Raw marks are scaled to that maximum.
// -----------------------------------------------------------------------------
export function calculateLabInternalMarks(params: {
  gradedOrDueItems: { earnedMarks: number; maxMarks: number }[];
  offeringLabInternalMax: number; // e.g. 20 or 25 marks
  totalPlannedItemsMaxMarks: number; // sum of all planned lab programs (e.g. 100 marks)
}): {
  rawMarksSoFar: number;
  maxMarksAvailableSoFar: number;
  scaledMarksSoFar: number;
  finalProjectedMarks: number;
} {
  const rawMarksSoFar = params.gradedOrDueItems.reduce((acc, i) => acc + i.earnedMarks, 0);
  const maxMarksAvailableSoFar = params.gradedOrDueItems.reduce((acc, i) => acc + i.maxMarks, 0);

  // Scaled to offering lab internal maximum
  let scaledMarksSoFar = 0;
  if (params.totalPlannedItemsMaxMarks > 0) {
    scaledMarksSoFar = (rawMarksSoFar / params.totalPlannedItemsMaxMarks) * params.offeringLabInternalMax;
  }

  let finalProjectedMarks = 0;
  if (maxMarksAvailableSoFar > 0) {
    finalProjectedMarks = (rawMarksSoFar / maxMarksAvailableSoFar) * params.offeringLabInternalMax;
  }

  return {
    rawMarksSoFar: Math.round(rawMarksSoFar * 100) / 100,
    maxMarksAvailableSoFar: Math.round(maxMarksAvailableSoFar * 100) / 100,
    scaledMarksSoFar: Math.round(scaledMarksSoFar * 100) / 100,
    finalProjectedMarks: Math.round(finalProjectedMarks * 100) / 100,
  };
}

// -----------------------------------------------------------------------------
// AC-16: Tamper-Evident QR Verification Hash & Verification URL
// The lab file's QR code opens a page that matches the printed marks.
// -----------------------------------------------------------------------------
export function generateLabFileVerificationDossier(params: {
  studentRollNo: string;
  courseCode: string;
  semester: number;
  academicYear: string;
  totalMarksEarned: number;
  totalMarksMax: number;
  totalLabsCompleted: number;
  secretSalt?: string;
}): {
  verificationCode: string;
  verificationUrl: string;
  payload: Record<string, any>;
} {
  const salt = params.secretSalt || 'logicq_sanjivani_salt_2026';
  const rawData = `${params.studentRollNo}|${params.courseCode}|${params.academicYear}|${params.totalMarksEarned}/${params.totalMarksMax}|${salt}`;
  
  // SHA-256 tamper-evident verification fingerprint
  const hash = crypto.createHash('sha256').update(rawData).digest('hex').substring(0, 16).toUpperCase();
  const verificationCode = `LQ-${params.courseCode}-${params.studentRollNo}-${hash}`;
  const verificationUrl = `https://logicq-clanguage.web.app/verify/lab-file?code=${verificationCode}&roll=${params.studentRollNo}&marks=${params.totalMarksEarned}`;

  return {
    verificationCode,
    verificationUrl,
    payload: {
      rollNo: params.studentRollNo,
      courseCode: params.courseCode,
      academicYear: params.academicYear,
      marksEarned: params.totalMarksEarned,
      marksMax: params.totalMarksMax,
      labsCompleted: params.totalLabsCompleted,
      fingerprint: hash,
    },
  };
}

// -----------------------------------------------------------------------------
// BR-36: AI-generated content is stored with status draft and source ai;
// it cannot be published, scheduled or printed until approved.
// -----------------------------------------------------------------------------
export function createAiDraftItem(params: {
  topicId: string;
  coId: string;
  variants: QuestionVariant[];
}): Question {
  return {
    id: `q_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topicId: params.topicId,
    coId: params.coId,
    type: 'coding',
    bloomLevel: 'L3: Apply',
    difficulty: 'medium',
    source: 'ai',        // BR-36: Must be source 'ai'
    status: 'draft',     // BR-36: Must be status 'draft'
    variants: params.variants,
  };
}

export function canPublishQuestion(question: Question): {
  allowed: boolean;
  error?: string;
} {
  if (question.status !== 'approved') {
    return {
      allowed: false,
      error: `BR-36 Violation: Content with status '${question.status}' cannot be published, scheduled, or printed until approved by a faculty member.`,
    };
  }
  return { allowed: true };
}

// -----------------------------------------------------------------------------
// BR-37: Prompts sent to the AI provider never include student names, emails or roll numbers.
// -----------------------------------------------------------------------------
export function sanitizePromptForAi(
  templatePrompt: string,
  userMetadata?: { name?: string; email?: string; rollNo?: string }
): {
  cleanPrompt: string;
  containsPii: boolean;
} {
  let cleaned = templatePrompt;
  let containsPii = false;

  if (userMetadata) {
    if (userMetadata.name && cleaned.includes(userMetadata.name)) {
      cleaned = cleaned.split(userMetadata.name).join('[STUDENT]');
      containsPii = true;
    }
    if (userMetadata.email && cleaned.includes(userMetadata.email)) {
      cleaned = cleaned.split(userMetadata.email).join('[EMAIL]');
      containsPii = true;
    }
    if (userMetadata.rollNo && cleaned.includes(userMetadata.rollNo)) {
      cleaned = cleaned.split(userMetadata.rollNo).join('[ROLL_NO]');
      containsPii = true;
    }
  }

  // Regex patterns to intercept generic email or roll no leaks
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(cleaned)) {
    cleaned = cleaned.replace(emailRegex, '[REDACTED_EMAIL]');
    containsPii = true;
  }

  return { cleanPrompt: cleaned, containsPii };
}

// -----------------------------------------------------------------------------
// Lab Internal Session Questions & Pre/Post-Lab MCQ Specifications
// - Lab internal questions: 2 choices generated/kept per session (max 2 questions)
// - Manual option to upload/author coding questions as well
// - Pre-lab and post-lab MCQ question banks: 15 questions each
// - Deterministic randomization of 3 questions for pre-lab and 3 for post-lab per student PRN
// -----------------------------------------------------------------------------

export interface McqQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  bloomLevel?: string;
}

export interface PrePostLabBank {
  sessionId: string;
  preLabQuestions: McqQuestionItem[];
  postLabQuestions: McqQuestionItem[];
}

export function validatePrePostLabBank(bank: {
  preLabQuestions: McqQuestionItem[];
  postLabQuestions: McqQuestionItem[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (bank.preLabQuestions.length !== 15) {
    errors.push(`Pre-lab MCQ bank must contain exactly 15 questions (received ${bank.preLabQuestions.length}).`);
  }
  if (bank.postLabQuestions.length !== 15) {
    errors.push(`Post-lab MCQ bank must contain exactly 15 questions (received ${bank.postLabQuestions.length}).`);
  }
  return { valid: errors.length === 0, errors };
}

export function randomizeLabMcqs(
  bank: McqQuestionItem[],
  studentSeed: string,
  count = 3
): McqQuestionItem[] {
  if (!bank || bank.length === 0) return [];
  if (bank.length <= count) return [...bank];

  // Deterministic PRN-based shuffle so student consistently gets their assigned 3 questions
  let hash = 0;
  for (let i = 0; i < studentSeed.length; i++) {
    hash = (hash << 5) - hash + studentSeed.charCodeAt(i);
    hash |= 0;
  }

  const array = [...bank];
  let currentSeed = Math.abs(hash) || 42;

  // LCG pseudo-random generator
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  // Fisher-Yates shuffle with seed
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array.slice(0, count);
}

export interface SessionCodingChoice {
  id: string;
  choiceLabel: 'A' | 'B';
  title: string;
  description: string;
  source: 'ai' | 'manual';
  starterCode?: string;
  testCases: TestCase[];
}

export function validateSessionCodingQuestions(
  choices: Array<any>
): { valid: boolean; error?: string } {
  if (choices.length > 2) {
    return {
      valid: false,
      error: 'Max two questions per session to keep (2 choices: Choice A and Choice B).',
    };
  }
  return { valid: true };
}

