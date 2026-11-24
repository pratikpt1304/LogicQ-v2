import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Users,
  FileSpreadsheet,
  FileDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ArrowLeft,
} from 'lucide-react';
import {
  computeCourseOutcomeAttainment,
  computeProgramOutcomeAttainment,
  classifyLearners,
  generateBoardOfStudiesGapReport,
} from '../../../../server/src/domain/lab-course/phase3-rules.js';

export const InstitutionalAttainmentReports: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Dynamic Threshold Controls (AC-17: Immediate re-computation on change)
  const [studentTargetPct, setStudentTargetPct] = useState<number>(50); // Default 50%
  const [classThresholdPct, setClassThresholdPct] = useState<number>(60); // Default 60%

  // Simulated student marks across COs (60 students in section)
  const mockStudents = Array.from({ length: 60 }, (_, i) => {
    // Generate deterministic percentage
    const pct = Math.min(100, Math.max(30, ((i * 17) % 70) + 30));
    return {
      studentId: `s_${i + 1}`,
      rollNo: `PRN2026${(1001 + i).toString()}`,
      name: `Student ${i + 1}`,
      marksEarned: (pct / 100) * 20,
      marksMax: 20,
      percentage: pct,
    };
  });

  // Calculate CO Attainments dynamically (AC-17)
  const co1Result = computeCourseOutcomeAttainment({
    coId: 'CO1',
    studentScores: mockStudents,
    config: { studentTargetPct, classThresholdPct, completionThresholdPct: 80 },
  });

  const co2Result = computeCourseOutcomeAttainment({
    coId: 'CO2',
    studentScores: mockStudents.map((s) => ({ ...s, marksEarned: s.marksEarned * 0.95 })),
    config: { studentTargetPct, classThresholdPct, completionThresholdPct: 80 },
  });

  const co3Result = computeCourseOutcomeAttainment({
    coId: 'CO3',
    studentScores: mockStudents.map((s) => ({ ...s, marksEarned: s.marksEarned * 0.85 })),
    config: { studentTargetPct, classThresholdPct, completionThresholdPct: 80 },
  });

  const coResults = [co1Result, co2Result, co3Result];

  // Learner Classification (BR-35)
  const learnerCategories = classifyLearners({
    students: mockStudents,
    studentTargetPct,
    advancedThresholdPct: 85,
  });

  // Gap Report (F11)
  const gapReport = generateBoardOfStudiesGapReport({
    coAttainments: coResults,
    weakestTopics: [
      { topicTitle: 'Pointers & Dynamic Memory Heap', passRatePct: 44 },
      { topicTitle: 'Bitwise Masks & Flag Registers', passRatePct: 58 },
    ],
    commonErrorTypes: [
      { errorType: 'Segmentation Fault (SIGSEGV)', count: 38 },
      { errorType: 'Time Limit Exceeded (O(N^2) instead of O(N))', count: 24 },
    ],
  });

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <button
              onClick={() => navigate('/lab/admin')}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-indigo-400 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Console</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                NAAC / NBA COMPLIANCE
              </span>
              <h1 className="text-2xl font-bold">Course Outcome (CO) & PO Attainment Engine</h1>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              CS201 · Academic Year 2026-2027 · Continuous Internal Evaluation & Audit Dossier
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Exporting full NAAC Course File PDF with signed verification stamps.')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Course File PDF</span>
            </button>
            <button
              onClick={() => alert('Exporting grade sheets and mark distribution to XLSX.')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>

        {/* Dynamic Attainment Threshold Slider Dock (AC-17) */}
        <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-indigo-300">
                Interactive Attainment Thresholds (AC-17: Immediate Re-computation)
              </h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Auto-saved & logged to audit register
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <div className="flex justify-between mb-1.5 font-semibold">
                <span>Student Score Target Threshold:</span>
                <span className="font-mono text-indigo-400">{studentTargetPct}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="80"
                value={studentTargetPct}
                onChange={(e) => setStudentTargetPct(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] text-[var(--text-muted)]">
                Default: 50% marks on mapped questions to meet a CO.
              </span>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold">
                <span>Class Meeting Attainment Threshold:</span>
                <span className="font-mono text-indigo-400">{classThresholdPct}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={classThresholdPct}
                onChange={(e) => setClassThresholdPct(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] text-[var(--text-muted)]">
                Default: 60% of students must meet individual target for CO attainment.
              </span>
            </div>
          </div>
        </div>

        {/* CO Attainment Cards (BR-29..31) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {coResults.map((res) => (
            <div
              key={res.coId}
              className={`p-5 rounded-xl border bg-[var(--bg-card)] space-y-3 ${
                res.attained ? 'border-emerald-500/30' : 'border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  {res.coId}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    res.attained
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {res.attained ? 'ATTAINED' : 'NOT ATTAINED'}
                </span>
              </div>

              <div>
                <span className="text-2xl font-black font-mono">
                  {res.pctStudentsMeeting}%
                </span>
                <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                  {res.studentsMeetingTarget} of {res.totalStudents} students met target (≥ {studentTargetPct}%)
                </span>
              </div>

              <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    res.attained ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${res.pctStudentsMeeting}%` }}
                />
              </div>

              <div className="text-[11px] text-[var(--text-muted)] flex justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span>Class Target: {classThresholdPct}%</span>
                <span className="font-bold">Level: {res.level} / 3</span>
              </div>
            </div>
          ))}
        </div>

        {/* Learner Categorization (BR-35) */}
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Learner Support & Action Taken (BR-35)
            </h3>
            <span className="text-xs text-[var(--text-muted)]">60 Students Enrolled</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
              <span className="font-bold text-rose-400 uppercase">Slow Learners (&lt; {studentTargetPct}%)</span>
              <p className="text-xl font-bold">{learnerCategories.slowLearners.length} Students</p>
              <p className="text-[11px] text-[var(--text-muted)]">Remedial coaching and 1-on-1 code walkthrough assigned.</p>
            </div>

            <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 space-y-1">
              <span className="font-bold text-indigo-400 uppercase">Average Learners ({studentTargetPct}% - 84%)</span>
              <p className="text-xl font-bold">{learnerCategories.averageLearners.length} Students</p>
              <p className="text-[11px] text-[var(--text-muted)]">Regular lab coursework & mini-project tracking.</p>
            </div>

            <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <span className="font-bold text-emerald-400 uppercase">Advanced Learners (≥ 85%)</span>
              <p className="text-xl font-bold">{learnerCategories.advancedLearners.length} Students</p>
              <p className="text-[11px] text-[var(--text-muted)]">Advanced algorithm optimization challenges assigned.</p>
            </div>
          </div>
        </div>

        {/* Board of Studies Gap Report (F11) */}
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
            Board of Studies (BoS) Gap Analysis & Action Taken (F11)
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {gapReport.gapSummary}
          </p>

          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
            <span className="text-xs font-semibold text-[var(--text-main)]">Action Items for Next Offering:</span>
            <ul className="list-disc list-inside text-xs text-[var(--text-muted)] space-y-0.5">
              {gapReport.suggestedRemediations.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};
