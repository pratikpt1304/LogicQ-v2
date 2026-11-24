// -----------------------------------------------------------------------------
// PHASE 4: INSIGHTS, INTEGRITY REVIEW & LEARNING PROFILES (BR-39)
// -----------------------------------------------------------------------------

export interface StudentTelemetrySummary {
  studentId: string;
  rollNo: string;
  name: string;
  attemptsBeforeFirstPassAvg: number;
  timeOnTaskRatio: number; // actual vs expected time (e.g. 1.1 = 10% longer)
  compileVsLogicErrorRatio: number; // compile / (compile + logic)
  onTimeRatio: number; // 0..1
  workPattern: 'steady' | 'last_minute';
  topicStrengths: string[];
  topicStruggles: string[];
}

export interface IntegrityEvent {
  id: string;
  attemptId: string;
  type: 'tab_switch' | 'paste' | 'fullscreen_exit' | 'second_session';
  timestamp: Date;
  detail: string;
}

export interface IntegrityReviewItem {
  id: string;
  attemptId: string;
  studentId: string;
  rollNo: string;
  name: string;
  events: IntegrityEvent[];
  reviewStatus: 'pending' | 'no_issue' | 'warning' | 'refer_to_hod';
  facultyNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

// -----------------------------------------------------------------------------
// BR-39: Integrity events (large pastes, tab switches, fullscreen exits, second sessions)
// create flags for human review only; no automatic mark deduction or misconduct finding.
// -----------------------------------------------------------------------------
export function createIntegrityFlag(params: {
  attemptId: string;
  studentId: string;
  rollNo: string;
  name: string;
  events: IntegrityEvent[];
  rawEarnedMarks: number;
}): {
  flag: IntegrityReviewItem;
  appliedMarks: number; // Must NOT be automatically deducted (BR-39)
  requiresHumanReview: boolean;
} {
  const requiresHumanReview = params.events.length > 0;

  const flag: IntegrityReviewItem = {
    id: `flag_${Date.now()}_${params.attemptId.substring(0, 8)}`,
    attemptId: params.attemptId,
    studentId: params.studentId,
    rollNo: params.rollNo,
    name: params.name,
    events: params.events,
    reviewStatus: requiresHumanReview ? 'pending' : 'no_issue',
  };

  // BR-39: Applied marks MUST remain rawEarnedMarks (NO automatic penalty)
  return {
    flag,
    appliedMarks: params.rawEarnedMarks,
    requiresHumanReview,
  };
}

export function recordHumanIntegrityDecision(params: {
  flag: IntegrityReviewItem;
  reviewerId: string;
  decision: 'no_issue' | 'warning' | 'refer_to_hod';
  notes: string;
}): IntegrityReviewItem {
  return {
    ...params.flag,
    reviewStatus: params.decision,
    reviewedBy: params.reviewerId,
    reviewedAt: new Date(),
    facultyNotes: params.notes,
  };
}

// -----------------------------------------------------------------------------
// Learning Profiles (Page 21)
// Plain-language summary per student for faculty
// (e.g. "solves loops quickly, struggles with pointers, often submits on the due date")
// -----------------------------------------------------------------------------
export function generateStudentLearningProfile(summary: StudentTelemetrySummary): {
  headline: string;
  detailedAnalysis: string;
  paceRating: 'fast' | 'moderate' | 'deliberate';
  recommendations: string[];
} {
  const traits: string[] = [];

  // Speed & Attempts
  if (summary.timeOnTaskRatio < 0.8) {
    traits.push('solves problems rapidly');
  } else if (summary.timeOnTaskRatio > 1.3) {
    traits.push('takes time to analyze problem specifications');
  }

  // Topic strengths & struggles
  if (summary.topicStrengths.length > 0) {
    traits.push(`demonstrates mastery in ${summary.topicStrengths.join(' and ')}`);
  }
  if (summary.topicStruggles.length > 0) {
    traits.push(`struggles with ${summary.topicStruggles.join(' and ')}`);
  }

  // Submission habits
  if (summary.workPattern === 'last_minute') {
    traits.push('often submits near the deadline');
  } else {
    traits.push('maintains a steady coursework rhythm');
  }

  const headline = traits.join(', ') + '.';

  const paceRating =
    summary.timeOnTaskRatio < 0.8
      ? 'fast'
      : summary.timeOnTaskRatio > 1.2
      ? 'deliberate'
      : 'moderate';

  const recommendations: string[] = [];
  if (summary.topicStruggles.includes('Pointers') || summary.topicStruggles.includes('Dynamic Memory')) {
    recommendations.push('Assign memory layout visualization exercises (heap vs stack pointer tracing).');
  }
  if (summary.compileVsLogicErrorRatio > 0.6) {
    recommendations.push('Encourage incremental compiling and local syntax checking before test runs.');
  }

  return {
    headline,
    detailedAnalysis: `Student has an on-time completion ratio of ${Math.round(summary.onTimeRatio * 100)}%. Average attempts before passing: ${summary.attemptsBeforeFirstPassAvg}. Error composition: ${Math.round(summary.compileVsLogicErrorRatio * 100)}% compiler errors, ${Math.round((1 - summary.compileVsLogicErrorRatio) * 100)}% logical edge failures.`,
    paceRating,
    recommendations,
  };
}

// -----------------------------------------------------------------------------
// Topic Heat Map: Pass rate by topic and batch (Page 18)
// -----------------------------------------------------------------------------
export function computeTopicHeatMap(params: {
  topics: { id: string; title: string }[];
  batches: { id: string; name: string }[];
  submissions: { topicId: string; batchId: string; passed: boolean }[];
}): {
  matrix: { topicId: string; topicTitle: string; batchId: string; batchName: string; passRatePct: number }[];
  weakestTopics: string[];
} {
  const matrix: any[] = [];
  const topicTotalStats = new Map<string, { total: number; passed: number }>();

  for (const t of params.topics) {
    for (const b of params.batches) {
      const match = params.submissions.filter((s) => s.topicId === t.id && s.batchId === b.id);
      const total = match.length;
      const passed = match.filter((s) => s.passed).length;
      const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

      matrix.push({
        topicId: t.id,
        topicTitle: t.title,
        batchId: b.id,
        batchName: b.name,
        passRatePct: pct,
      });

      const curr = topicTotalStats.get(t.id) || { total: 0, passed: 0 };
      topicTotalStats.set(t.id, { total: curr.total + total, passed: curr.passed + passed });
    }
  }

  const weakestTopics = Array.from(topicTotalStats.entries())
    .map(([topicId, stats]) => ({
      topicId,
      rate: stats.total > 0 ? stats.passed / stats.total : 0,
    }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3)
    .map((w) => w.topicId);

  return { matrix, weakestTopics };
}

// -----------------------------------------------------------------------------
// Bell Curve Distribution: Mean, Spread & Below-Target Band (Page 18)
// -----------------------------------------------------------------------------
export function computeBellCurveStats(params: {
  marks: number[];
  maxMarks: number;
  studentTargetPct?: number; // default 50%
}): {
  mean: number;
  standardDeviation: number;
  belowTargetCount: number;
  belowTargetPct: number;
  distributionBins: { range: string; count: number; isBelowTarget: boolean }[];
} {
  const n = params.marks.length;
  if (n === 0) {
    return { mean: 0, standardDeviation: 0, belowTargetCount: 0, belowTargetPct: 0, distributionBins: [] };
  }

  const target = params.studentTargetPct ?? 50;
  const targetMark = (target / 100) * params.maxMarks;

  const sum = params.marks.reduce((acc, m) => acc + m, 0);
  const mean = Math.round((sum / n) * 100) / 100;

  const varianceSum = params.marks.reduce((acc, m) => acc + Math.pow(m - mean, 2), 0);
  const standardDeviation = Math.round(Math.sqrt(varianceSum / n) * 100) / 100;

  let belowTargetCount = 0;
  params.marks.forEach((m) => {
    if (m < targetMark) belowTargetCount++;
  });
  const belowTargetPct = Math.round((belowTargetCount / n) * 100);

  // 5 Bins: 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
  const step = params.maxMarks / 5;
  const distributionBins = Array.from({ length: 5 }, (_, i) => {
    const min = i * step;
    const max = (i + 1) * step;
    const count = params.marks.filter((m) => m >= min && (i === 4 ? m <= max : m < max)).length;
    return {
      range: `${min.toFixed(0)}-${max.toFixed(0)}`,
      count,
      isBelowTarget: max <= targetMark,
    };
  });

  return {
    mean,
    standardDeviation,
    belowTargetCount,
    belowTargetPct,
    distributionBins,
  };
}
