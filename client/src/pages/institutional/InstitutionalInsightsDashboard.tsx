import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Flame,
  TrendingUp,
  BrainCircuit,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  UserCheck,
  ChevronRight,
  Eye,
  Check,
} from 'lucide-react';
import {
  computeTopicHeatMap,
  computeBellCurveStats,
  generateStudentLearningProfile,
  IntegrityReviewItem,
} from '../../../../server/src/domain/lab-course/phase4-rules.js';

export const InstitutionalInsightsDashboard: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'integrity' | 'heatmap' | 'bellcurve' | 'profiles'>('integrity');

  // Simulated Integrity Flags Queue (F10, BR-39)
  const [flags, setFlags] = useState<IntegrityReviewItem[]>([
    {
      id: 'flag_1',
      attemptId: 'att_20261001',
      studentId: 's_1',
      rollNo: 'PRN20261001',
      name: 'Alice Patil',
      events: [
        { id: 'e1', attemptId: 'att_1', type: 'fullscreen_exit', timestamp: new Date(), detail: 'Fullscreen exited for 6 seconds' },
        { id: 'e2', attemptId: 'att_1', type: 'paste', timestamp: new Date(), detail: 'Pasted 140 chars in single keystroke' },
      ],
      reviewStatus: 'pending',
    },
    {
      id: 'flag_2',
      attemptId: 'att_20261014',
      studentId: 's_2',
      rollNo: 'PRN20261014',
      name: 'Rahul Kadam',
      events: [
        { id: 'e3', attemptId: 'att_2', type: 'tab_switch', timestamp: new Date(), detail: '2 tab switches recorded during exam' },
      ],
      reviewStatus: 'pending',
    },
  ]);

  // Topic Heat Map Data (Page 18)
  const heatMapData = computeTopicHeatMap({
    topics: [
      { id: 't1', title: 'Bitwise Manipulation' },
      { id: 't2', title: 'Dynamic Memory & Alloc' },
      { id: 't3', title: 'Pointers & Struct Aliasing' },
      { id: 't4', title: 'Singly & Doubly Linked Lists' },
      { id: 't5', title: 'Binary Trees & Recursion' },
    ],
    batches: [
      { id: 'b1', name: 'Batch A1' },
      { id: 'b2', name: 'Batch A2' },
      { id: 'b3', name: 'Batch B1' },
    ],
    submissions: [
      { topicId: 't1', batchId: 'b1', passed: true },
      { topicId: 't1', batchId: 'b2', passed: true },
      { topicId: 't1', batchId: 'b3', passed: true },
      { topicId: 't2', batchId: 'b1', passed: true },
      { topicId: 't2', batchId: 'b2', passed: false },
      { topicId: 't2', batchId: 'b3', passed: true },
      { topicId: 't3', batchId: 'b1', passed: false },
      { topicId: 't3', batchId: 'b2', passed: false },
      { topicId: 't3', batchId: 'b3', passed: true },
      { topicId: 't4', batchId: 'b1', passed: true },
      { topicId: 't4', batchId: 'b2', passed: true },
      { topicId: 't4', batchId: 'b3', passed: true },
      { topicId: 't5', batchId: 'b1', passed: true },
      { topicId: 't5', batchId: 'b2', passed: false },
      { topicId: 't5', batchId: 'b3', passed: false },
    ],
  });

  // Bell Curve (Page 18)
  const bellCurve = computeBellCurveStats({
    marks: [19, 18.5, 18, 17, 16.5, 16, 15, 14.5, 14, 13, 12.5, 12, 11, 9.5, 8, 7.5, 6],
    maxMarks: 20,
    studentTargetPct: 50, // 10 marks
  });

  // Student Learning Profile Sample (Page 21)
  const sampleProfile = generateStudentLearningProfile({
    studentId: 's_1',
    rollNo: 'PRN20261001',
    name: 'Alice Patil',
    attemptsBeforeFirstPassAvg: 1.8,
    timeOnTaskRatio: 0.75,
    compileVsLogicErrorRatio: 0.2,
    onTimeRatio: 0.96,
    workPattern: 'steady',
    topicStrengths: ['Bitwise Operations', 'Linked Lists'],
    topicStruggles: ['Pointer Arithmetic'],
  });

  const handleReviewDecision = (flagId: string, decision: 'no_issue' | 'warning' | 'refer_to_hod') => {
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, reviewStatus: decision, reviewedAt: new Date() } : f))
    );
  };

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
                PHASE 4: INSIGHTS & GOVERNANCE
              </span>
              <h1 className="text-2xl font-bold">Faculty Intelligence & Integrity Desk</h1>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Behavioral proctoring trail, topic heat maps across batches, and bell curve dispersion
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] gap-6">
          <button
            onClick={() => setActiveTab('integrity')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'integrity'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Integrity Queue ({flags.filter((f) => f.reviewStatus === 'pending').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'heatmap'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Topic Heat Map</span>
          </button>
          <button
            onClick={() => setActiveTab('bellcurve')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'bellcurve'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Bell Curve Dispersion</span>
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'profiles'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Learning Profiles</span>
          </button>
        </div>

        {/* Tab 1: Integrity Review Queue (F10, BR-39) */}
        {activeTab === 'integrity' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Proctored Incident Review Queue (F10)</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  BR-39 Enforcement: Telemetry events generate review flags only. Automatic mark deductions are strictly prohibited.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                Human Review Only (BR-39)
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {flags.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.reviewStatus === 'pending'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{item.rollNo}</span>
                        <span className="font-bold text-sm text-[var(--text-main)]">{item.name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.reviewStatus === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {item.reviewStatus}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {item.events.map((ev) => (
                          <div key={ev.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{ev.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {item.reviewStatus === 'pending' ? (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleReviewDecision(item.id, 'no_issue')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-emerald-400"
                        >
                          No Issue
                        </button>
                        <button
                          onClick={() => handleReviewDecision(item.id, 'warning')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
                        >
                          Issue Warning
                        </button>
                        <button
                          onClick={() => handleReviewDecision(item.id, 'refer_to_hod')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
                        >
                          Refer to HOD
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Adjudicated by Faculty
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Topic Heat Map (Page 18) */}
        {activeTab === 'heatmap' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div>
              <h3 className="text-base font-bold">Topic Mastery Heat Map (Across Batches)</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Pass rate by curriculum topic and batch. Shaded emerald for high mastery, amber/rose for weak concepts.
              </p>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] font-mono uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Curriculum Topic</th>
                    <th className="py-2.5 px-3">Batch A1</th>
                    <th className="py-2.5 px-3">Batch A2</th>
                    <th className="py-2.5 px-3">Batch B1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {['Bitwise Manipulation', 'Dynamic Memory & Alloc', 'Pointers & Struct Aliasing', 'Singly & Doubly Linked Lists', 'Binary Trees & Recursion'].map((topic, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-subtle)]">
                      <td className="py-3 px-3 font-semibold">{topic}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded font-mono font-bold ${i === 2 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {i === 2 ? '42%' : '88%'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded font-mono font-bold ${i === 2 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {i === 2 ? '38%' : '82%'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded font-mono font-bold ${i === 4 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {i === 4 ? '58%' : '90%'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Bell Curve Distribution (Page 18) */}
        {activeTab === 'bellcurve' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div>
              <h3 className="text-base font-bold">Bell Curve & Mark Dispersion (Page 18)</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Mean, standard deviation, and below-target shaded cohort (&lt; 50% target band).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)]">
                <span className="text-[var(--text-muted)] uppercase block">Class Mean</span>
                <span className="text-2xl font-black font-mono text-indigo-400">{bellCurve.mean} / 20.0</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)]">
                <span className="text-[var(--text-muted)] uppercase block">Standard Deviation (σ)</span>
                <span className="text-2xl font-black font-mono text-emerald-400">± {bellCurve.standardDeviation}</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)]">
                <span className="text-[var(--text-muted)] uppercase block">Below Student Target Band</span>
                <span className="text-2xl font-black font-mono text-rose-400">
                  {bellCurve.belowTargetCount} Students ({bellCurve.belowTargetPct}%)
                </span>
              </div>
            </div>

            {/* Visual Histogram */}
            <div className="pt-4 space-y-2">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase block">Mark Dispersion Bins</span>
              <div className="grid grid-cols-5 gap-3 items-end h-40 pt-4">
                {bellCurve.distributionBins.map((bin, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-mono font-bold">{bin.count}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        bin.isBelowTarget ? 'bg-rose-500/60' : 'bg-indigo-500/60'
                      }`}
                      style={{ height: `${Math.max(15, bin.count * 20)}%` }}
                    />
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{bin.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Student Learning Profiles (Page 21) */}
        {activeTab === 'profiles' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div>
              <h3 className="text-base font-bold">Plain-Language Behavioral Learning Profiles (Page 21)</h3>
              <p className="text-xs text-[var(--text-muted)]">
                AI and telemetry synthesized narrative explaining individual problem-solving habits for faculty mentors.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-400">PRN20261001</span>
                  <h4 className="text-sm font-bold">Alice Patil</h4>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Pace: {sampleProfile.paceRating.toUpperCase()}
                </span>
              </div>

              <blockquote className="text-sm font-semibold italic text-[var(--text-main)] border-l-2 border-indigo-400 pl-3">
                "{sampleProfile.headline}"
              </blockquote>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {sampleProfile.detailedAnalysis}
              </p>

              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-bold text-[var(--text-main)] block mb-1">Pedagogical Recommendations:</span>
                <ul className="list-disc list-inside text-xs text-[var(--text-muted)] space-y-0.5">
                  {sampleProfile.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
