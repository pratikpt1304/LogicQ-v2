import { RoleLevel } from './types.js';

// -----------------------------------------------------------------------------
// TYPES FOR PHASE 3
// -----------------------------------------------------------------------------
export interface EndSemPaper {
  id: string;
  courseId: string;
  setterId: string;
  moderatorId: string;
  hodId: string;
  status: 'draft' | 'moderated' | 'approved' | 'locked';
  examStartAt: Date;
  examEndAt: Date;
  blueprint: {
    coId: string;
    bloomLevel: string;
    marks: number;
    questionIds: string[];
  }[];
}

export interface StudentExamEligibilityCheck {
  studentId: string;
  rollNo: string;
  attendancePct: number;
  labCompletionPct: number;
  effectiveMinAttendance: number; // Strictest of Univ, School, Dept (BR-2)
  effectiveMinCompletion: number;
  hasCoeExemption: boolean;
  exemptionReason?: string;
}

export interface DraftSnapshot {
  code: string;
  savedAt: Date;
  assessmentId: string;
  questionId: string;
}

export interface AttainmentConfig {
  studentTargetPct: number; // default 50%
  classThresholdPct: number; // default 60%
  completionThresholdPct: number; // default 80%
  levels?: { level: number; thresholdPct: number }[]; // optional 1/2/3
  directWeight?: number; // e.g. 0.8
  indirectWeight?: number; // e.g. 0.2
}

export interface CoAttainmentResult {
  coId: string;
  totalStudents: number;
  studentsMeetingTarget: number;
  pctStudentsMeeting: number;
  attained: boolean;
  level?: number;
}

export interface PoAttainmentResult {
  poCode: string;
  weightedScore: number;
  normalizedAttainment: number; // 0..3 or %
}

// -----------------------------------------------------------------------------
// AC-12: No student or staff member other than setter, moderator and HOD can open
// the paper before the exam starts.
// -----------------------------------------------------------------------------
export function canAccessEndSemPaper(params: {
  userId: string;
  userRole: RoleLevel;
  paper: EndSemPaper;
  now: Date;
}): { allowed: boolean; reason?: string } {
  const isStarted = params.now.getTime() >= params.paper.examStartAt.getTime();

  // If exam has already officially started, students and exam proctors can access
  if (isStarted) {
    return { allowed: true };
  }

  // Pre-exam access is strictly restricted to setter, moderator and HOD
  const isSetter = params.userId === params.paper.setterId;
  const isModerator = params.userId === params.paper.moderatorId;
  const isHod = params.userId === params.paper.hodId;

  if (isSetter || isModerator || isHod) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'AC-12 Violation: End-semester exam paper is sealed and locked until exam commencement. Only paper setter, moderator, and HOD may view.',
  };
}

// -----------------------------------------------------------------------------
// BR-33 & AC-18: Student Eligibility for End-Sem Practical
// Eligible when lab attendance and lab completion both meet the effective thresholds.
// Effective threshold = strictest of university, school and department (BR-2).
// CoE can grant individual exemptions with a reason, which are logged.
// -----------------------------------------------------------------------------
export function evaluateStudentExamEligibility(check: StudentExamEligibilityCheck): {
  isEligible: boolean;
  attendancePassed: boolean;
  completionPassed: boolean;
  exemptionApplied: boolean;
  blockReason?: string;
} {
  const attendancePassed = check.attendancePct >= check.effectiveMinAttendance;
  const completionPassed = check.labCompletionPct >= check.effectiveMinCompletion;

  if (attendancePassed && completionPassed) {
    return {
      isEligible: true,
      attendancePassed: true,
      completionPassed: true,
      exemptionApplied: false,
    };
  }

  // AC-18: If below threshold, student CANNOT start unless CoE has recorded exemption
  if (check.hasCoeExemption) {
    return {
      isEligible: true,
      attendancePassed,
      completionPassed,
      exemptionApplied: true,
    };
  }

  const failures: string[] = [];
  if (!attendancePassed) {
    failures.push(`Attendance ${check.attendancePct}% < required ${check.effectiveMinAttendance}%`);
  }
  if (!completionPassed) {
    failures.push(`Lab completion ${check.labCompletionPct}% < required ${check.effectiveMinCompletion}%`);
  }

  return {
    isEligible: false,
    attendancePassed,
    completionPassed,
    exemptionApplied: false,
    blockReason: `AC-18: Ineligible for End-Semester Practical. ${failures.join('; ')}. No CoE exemption recorded.`,
  };
}

// -----------------------------------------------------------------------------
// NFR-4, NFR-5, AC-14: Server Autosave & Crash Reconnection Engine
// Resumes from newer of server and local drafts (within 15s) with remaining time
// strictly computed from server's start time.
// -----------------------------------------------------------------------------
export function reconcileExamDraftOnReconnect(params: {
  serverDraft?: DraftSnapshot;
  localDraft?: DraftSnapshot;
  examStartedAt: Date;
  durationMinutes: number;
  now: Date;
}): {
  activeCode: string;
  source: 'server' | 'local' | 'empty';
  remainingSeconds: number;
  isTimedOut: boolean;
  restoredWithinSeconds: number;
} {
  // Compute remaining time strictly from server start time (NFR-5)
  const durationSec = params.durationMinutes * 60;
  const elapsedSec = Math.floor((params.now.getTime() - params.examStartedAt.getTime()) / 1000);
  const remainingSeconds = Math.max(0, durationSec - elapsedSec);
  const isTimedOut = remainingSeconds === 0;

  // Reconcile drafts: Pick the newer of server and local drafts
  let activeCode = '';
  let source: 'server' | 'local' | 'empty' = 'empty';
  let diffSec = 0;

  if (params.serverDraft && params.localDraft) {
    if (params.localDraft.savedAt.getTime() > params.serverDraft.savedAt.getTime()) {
      activeCode = params.localDraft.code;
      source = 'local';
      diffSec = Math.floor((params.now.getTime() - params.localDraft.savedAt.getTime()) / 1000);
    } else {
      activeCode = params.serverDraft.code;
      source = 'server';
      diffSec = Math.floor((params.now.getTime() - params.serverDraft.savedAt.getTime()) / 1000);
    }
  } else if (params.serverDraft) {
    activeCode = params.serverDraft.code;
    source = 'server';
    diffSec = Math.floor((params.now.getTime() - params.serverDraft.savedAt.getTime()) / 1000);
  } else if (params.localDraft) {
    activeCode = params.localDraft.code;
    source = 'local';
    diffSec = Math.floor((params.now.getTime() - params.localDraft.savedAt.getTime()) / 1000);
  }

  return {
    activeCode,
    source,
    remainingSeconds,
    isTimedOut,
    restoredWithinSeconds: diffSec,
  };
}

// -----------------------------------------------------------------------------
// BR-29, BR-30, BR-31, AC-17: Course Outcome (CO) Attainment Engine
// BR-29: Every question carries one CO; marks roll up to COs.
// BR-30: Student meets CO when marks on that CO >= student target (default 50%).
// BR-31: CO is attained when % of students meeting it >= class threshold (default 60%).
// AC-17: Changing student target or class threshold recomputes attainment immediately.
// -----------------------------------------------------------------------------
export function computeCourseOutcomeAttainment(params: {
  coId: string;
  studentScores: { studentId: string; marksEarned: number; marksMax: number }[];
  config: AttainmentConfig;
}): CoAttainmentResult {
  const totalStudents = params.studentScores.length;
  if (totalStudents === 0) {
    return {
      coId: params.coId,
      totalStudents: 0,
      studentsMeetingTarget: 0,
      pctStudentsMeeting: 0,
      attained: false,
    };
  }

  const targetRatio = params.config.studentTargetPct / 100;
  let meetingCount = 0;

  for (const s of params.studentScores) {
    if (s.marksMax > 0) {
      const studentPct = s.marksEarned / s.marksMax;
      // BR-30: Student meets CO when marks >= target (default 50%)
      if (studentPct >= targetRatio) {
        meetingCount++;
      }
    }
  }

  const pctStudentsMeeting = Math.round((meetingCount / totalStudents) * 10000) / 100; // e.g. 64.50%
  // BR-31: Attained if >= class threshold (default 60%)
  const attained = pctStudentsMeeting >= params.config.classThresholdPct;

  // Optional levels 1/2/3
  let level = 0;
  if (params.config.levels && params.config.levels.length > 0) {
    const sortedLevels = [...params.config.levels].sort((a, b) => b.thresholdPct - a.thresholdPct);
    for (const lvl of sortedLevels) {
      if (pctStudentsMeeting >= lvl.thresholdPct) {
        level = lvl.level;
        break;
      }
    }
  } else {
    level = attained ? 3 : 1;
  }

  return {
    coId: params.coId,
    totalStudents,
    studentsMeetingTarget: meetingCount,
    pctStudentsMeeting,
    attained,
    level,
  };
}

// -----------------------------------------------------------------------------
// BR-34: Program Outcome (PO) Attainment Roll-Up
// PO attainment = CO attainment weighted by the CO-PO matrix.
// -----------------------------------------------------------------------------
export function computeProgramOutcomeAttainment(params: {
  poCode: string;
  coAttainments: Map<string, CoAttainmentResult>; // coId -> result
  coPoMappings: { coId: string; poCode: string; strength: number }[]; // strength 0..3
}): PoAttainmentResult {
  const relevantMappings = params.coPoMappings.filter(
    (m) => m.poCode === params.poCode && m.strength > 0
  );

  let totalWeight = 0;
  let weightedSum = 0;

  for (const m of relevantMappings) {
    const coResult = params.coAttainments.get(m.coId);
    if (coResult) {
      const coScore = coResult.level ?? (coResult.pctStudentsMeeting / 100 * 3);
      weightedSum += coScore * m.strength;
      totalWeight += m.strength;
    }
  }

  const weightedScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  const normalizedAttainment = totalWeight > 0 ? Math.round((weightedScore / 3) * 100) : 0;

  return {
    poCode: params.poCode,
    weightedScore,
    normalizedAttainment,
  };
}

// -----------------------------------------------------------------------------
// BR-35: Slow & Advanced Learners Classification
// Slow learners = students below student target (e.g. < 50%) after Unit 1 / mid-term.
// Advanced learners = students at or above department-set high mark (default 85%).
// -----------------------------------------------------------------------------
export function classifyLearners(params: {
  students: { studentId: string; rollNo: string; name: string; percentage: number }[];
  studentTargetPct?: number; // default 50%
  advancedThresholdPct?: number; // default 85%
}): {
  slowLearners: { studentId: string; rollNo: string; name: string; percentage: number }[];
  averageLearners: { studentId: string; rollNo: string; name: string; percentage: number }[];
  advancedLearners: { studentId: string; rollNo: string; name: string; percentage: number }[];
} {
  const target = params.studentTargetPct ?? 50;
  const advanced = params.advancedThresholdPct ?? 85;

  const slowLearners: any[] = [];
  const averageLearners: any[] = [];
  const advancedLearners: any[] = [];

  for (const s of params.students) {
    if (s.percentage < target) {
      slowLearners.push(s);
    } else if (s.percentage >= advanced) {
      advancedLearners.push(s);
    } else {
      averageLearners.push(s);
    }
  }

  return { slowLearners, averageLearners, advancedLearners };
}

// -----------------------------------------------------------------------------
// F11 & Audit Pack: Gap Analysis & Action Taken Report
// -----------------------------------------------------------------------------
export function generateBoardOfStudiesGapReport(params: {
  coAttainments: CoAttainmentResult[];
  weakestTopics: { topicTitle: string; passRatePct: number }[];
  commonErrorTypes: { errorType: string; count: number }[];
}): {
  unAttainedCos: string[];
  gapSummary: string;
  suggestedRemediations: string[];
} {
  const unAttained = params.coAttainments.filter((c) => !c.attained).map((c) => c.coId);
  const weakest = params.weakestTopics.slice(0, 3).map((t) => `${t.topicTitle} (${t.passRatePct}%)`);
  const topErrors = params.commonErrorTypes.slice(0, 2).map((e) => e.errorType);

  const gapSummary = unAttained.length > 0
    ? `CO Attainment Gap identified for ${unAttained.join(', ')}. Primary struggle areas: ${weakest.join(', ')}. Most prevalent student errors: ${topErrors.join(', ')}.`
    : 'All Course Outcomes successfully attained. Curriculum progression meets NAAC/NBA standards.';

  const suggestedRemediations = [
    'Schedule 2 additional hands-on code walkthroughs for identified weak topics.',
    'Introduce peer programming sessions for memory allocation and pointer dereferencing.',
    'Review end-semester question difficulty distribution with Board of Studies moderator.',
  ];

  return {
    unAttainedCos: unAttained,
    gapSummary,
    suggestedRemediations,
  };
}

// -----------------------------------------------------------------------------
// INSTITUTIONAL REPORTS REGISTRY & SIGNATORY MATRIX (Spec Page 19)
// -----------------------------------------------------------------------------
export type InstitutionalReportType =
  | 'course_plan'
  | 'attendance_register'
  | 'assessment_record'
  | 'sample_submissions'
  | 'mark_lists'
  | 'co_po_attainment'
  | 'learner_support'
  | 'gap_analysis_action_taken'
  | 'eligibility_list';

export interface InstitutionalReportSpec {
  type: InstitutionalReportType;
  title: string;
  contents: string;
  signedBy: string[]; // e.g. ['Faculty', 'HOD'], ['HOD', 'CoE']
  requiresApprovalTrail: boolean;
}

export const INSTITUTIONAL_REPORTS: Record<InstitutionalReportType, InstitutionalReportSpec> = {
  course_plan: {
    type: 'course_plan',
    title: 'Course Plan',
    contents: 'Syllabus, COs, CO-PO/PSO matrix, session plan with dates',
    signedBy: ['Faculty', 'HOD'],
    requiresApprovalTrail: true,
  },
  attendance_register: {
    type: 'attendance_register',
    title: 'Attendance Register',
    contents: 'Batch-wise lab attendance, makeup sessions',
    signedBy: ['Faculty'],
    requiresApprovalTrail: false,
  },
  assessment_record: {
    type: 'assessment_record',
    title: 'Assessment Record',
    contents: 'Papers with blueprint, evaluation scheme, approval trail with dates',
    signedBy: ['Setter', 'Moderator', 'HOD'],
    requiresApprovalTrail: true,
  },
  sample_submissions: {
    type: 'sample_submissions',
    title: 'Sample Submissions',
    contents: 'Best, average and weakest submission per assessment',
    signedBy: ['Faculty'],
    requiresApprovalTrail: false,
  },
  mark_lists: {
    type: 'mark_lists',
    title: 'Mark Lists',
    contents: 'Question-wise marks, totals, submission times',
    signedBy: ['Faculty', 'HOD'],
    requiresApprovalTrail: true,
  },
  co_po_attainment: {
    type: 'co_po_attainment',
    title: 'CO and PO Attainment',
    contents: 'Per CO and assessment, direct and indirect, PO roll-up, bell curves',
    signedBy: ['Faculty', 'HOD'],
    requiresApprovalTrail: true,
  },
  learner_support: {
    type: 'learner_support',
    title: 'Learner Support',
    contents: 'Slow and advanced learners, actions, outcomes',
    signedBy: ['Faculty', 'HOD'],
    requiresApprovalTrail: true,
  },
  gap_analysis_action_taken: {
    type: 'gap_analysis_action_taken',
    title: 'Gap Analysis and Action Taken',
    contents: 'Gaps, BoS recommendations, actions in the next offering',
    signedBy: ['HOD', 'Dean'],
    requiresApprovalTrail: true,
  },
  eligibility_list: {
    type: 'eligibility_list',
    title: 'Eligibility List',
    contents: 'Eligible and not eligible students with reasons, exemptions',
    signedBy: ['HOD', 'CoE'],
    requiresApprovalTrail: true,
  },
};

// -----------------------------------------------------------------------------
// AC-19: Every number in a generated report matches the mark and attendance
// records it came from.
// -----------------------------------------------------------------------------
export function verifyReportNumbersMatchRecords(params: {
  reportNumbers: { studentId: string; metricName: string; reportedValue: number }[];
  sourceRecords: Map<string, Record<string, number>>; // studentId -> { metricName: rawValue }
}): {
  verified: boolean;
  discrepancies: { studentId: string; metricName: string; reported: number; source: number }[];
} {
  const discrepancies: { studentId: string; metricName: string; reported: number; source: number }[] = [];

  for (const item of params.reportNumbers) {
    const studentData = params.sourceRecords.get(item.studentId);
    if (!studentData || studentData[item.metricName] === undefined) {
      discrepancies.push({
        studentId: item.studentId,
        metricName: item.metricName,
        reported: item.reportedValue,
        source: NaN,
      });
      continue;
    }

    const sourceVal = studentData[item.metricName];
    // Exact or within 0.01 precision for scaled values
    if (Math.abs(item.reportedValue - sourceVal) > 0.01) {
      discrepancies.push({
        studentId: item.studentId,
        metricName: item.metricName,
        reported: item.reportedValue,
        source: sourceVal,
      });
    }
  }

  return {
    verified: discrepancies.length === 0,
    discrepancies,
  };
}
