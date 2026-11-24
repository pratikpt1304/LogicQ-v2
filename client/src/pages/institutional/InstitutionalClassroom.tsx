import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pin,
  FileCode,
  FileText,
  CheckCircle,
  Clock,
  Lock,
  Search,
  Check,
  AlertTriangle,
  Play,
} from 'lucide-react';

interface TimelineItem {
  id: string;
  unit: number;
  week: number;
  type: 'resource' | 'announcement' | 'lab_program' | 'quiz' | 'coding_test' | 'assignment';
  title: string;
  description: string;
  dueDate?: string;
  state: 'locked' | 'open' | 'submitted' | 'graded' | 'overdue';
  marks?: number;
  maxMarks?: number;
}

export const InstitutionalClassroom: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | 'todo' | 'overdue' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const announcements = [
    {
      id: 'ann_1',
      title: 'Lab Internal Assessment 2 - Schedule Announced',
      date: 'Yesterday by Prof. Patil',
      content:
        'Continuous evaluation for Unit 3 (Searching & Sorting) will be held during your regular lab slot next week. Please complete your preparatory tasks.',
    },
  ];

  const timelineItems: TimelineItem[] = [
    {
      id: 'item_1',
      unit: 1,
      week: 1,
      type: 'resource',
      title: 'ISO C11 Standard Library & Memory Model Reference Guide',
      description: 'Official lecture handout covering pointer arithmetics, stack frames, and lvalues.',
      state: 'open',
    },
    {
      id: 'item_2',
      unit: 1,
      week: 1,
      type: 'lab_program',
      title: 'Lab 1: Bitwise Manipulation & Endianness Probe',
      description: 'Implement portable byte-order detection without using system libraries.',
      dueDate: 'Completed on Aug 14',
      state: 'graded',
      marks: 10,
      maxMarks: 10,
    },
    {
      id: 'item_3',
      unit: 2,
      week: 3,
      type: 'lab_program',
      title: 'Lab 4: Singly Linked List In-Place Reversal',
      description: 'Perform reverse traversal and loop cycle detection with Floyd algorithm.',
      dueDate: 'Completed on Sep 02',
      state: 'submitted',
      marks: 9.5,
      maxMarks: 10,
    },
    {
      id: 'item_4',
      unit: 3,
      week: 6,
      type: 'lab_program',
      title: 'Lab 7: Doubly Linked Lists & Sentinel Nodes',
      description: 'Construct a circular deque with sentinel dummy head and tail nodes.',
      dueDate: 'Due Tomorrow, 11:59 PM',
      state: 'open',
      maxMarks: 10,
    },
    {
      id: 'item_5',
      unit: 3,
      week: 7,
      type: 'coding_test',
      title: 'Class Test 1: Linear Data Structures',
      description: '45-minute proctored coding assessment with automated GCC evaluation.',
      dueDate: 'Opens Thu, 10:00 AM',
      state: 'locked',
      maxMarks: 20,
    },
  ];

  const filteredItems = timelineItems.filter((item) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter
    if (filter === 'todo') return item.state === 'open';
    if (filter === 'overdue') return item.state === 'overdue';
    if (filter === 'completed') return item.state === 'submitted' || item.state === 'graded';
    return true;
  });

  const getStateBadge = (state: TimelineItem['state']) => {
    switch (state) {
      case 'graded':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" /> Graded
          </span>
        );
      case 'submitted':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle className="w-3 h-3" /> Submitted
          </span>
        );
      case 'open':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'locked':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            <Lock className="w-3 h-3" /> Locked
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div>
          <button
            onClick={() => navigate('/lab/student/home')}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-indigo-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Course List</span>
          </button>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                CS201 · Section B
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">Data Structures & Algorithms in C</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Coordinator: Prof. H. K. Patil · Academic Term 2026-2027 (Odd Semester)
              </p>
            </div>
          </div>
        </div>

        {/* Pinned Announcements */}
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2 relative"
          >
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-indigo-400 rotate-45" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Pinned Announcement</span>
              <span className="text-xs text-[var(--text-muted)]">· {ann.date}</span>
            </div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">{ann.title}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{ann.content}</p>
          </div>
        ))}

        {/* Filters & Search Toolbar (S2. Classroom) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          {/* Tab Filters */}
          <div className="flex gap-2 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)]">
            {(['all', 'todo', 'overdue', 'completed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                  filter === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {t === 'all' ? 'All Items' : t === 'todo' ? 'To Do' : t}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline items..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Timeline Grouped by Unit & Week */}
        <div className="space-y-4 pt-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border bg-[var(--bg-card)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.state === 'open'
                  ? 'border-indigo-500/40 hover:border-indigo-500'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border-subtle-hover)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-[var(--bg-subtle)] shrink-0 mt-0.5">
                  {item.type === 'lab_program' || item.type === 'coding_test' ? (
                    <FileCode className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                      Unit {item.unit} · Week {item.week}
                    </span>
                    {getStateBadge(item.state)}
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">{item.title}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.description}</p>
                  {item.dueDate && (
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">{item.dueDate}</p>
                  )}
                </div>
              </div>

              {/* Action / Grade Pill */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {item.marks !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Marks</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {item.marks} / {item.maxMarks}
                    </span>
                  </div>
                )}

                {item.state === 'open' && (
                  <button
                    onClick={() => navigate('/practice')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Start Task</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="p-12 text-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <p className="text-xs text-[var(--text-muted)]">No timeline items match your filter criteria.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
