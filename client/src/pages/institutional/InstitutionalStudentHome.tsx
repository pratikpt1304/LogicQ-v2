import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  BookOpen,
  Clock,
  AlertCircle,
  Download,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface EnrolledCourse {
  courseId: string;
  code: string;
  title: string;
  credits: number;
  nextLabDate: string;
  nextLabTime: string;
  nearestDueItem: string;
  nearestDueDate: string;
  completedTasks: number;
  totalTasks: number;
  internalMarksSoFar: number;
  maxMarksSoFar: number;
}

export const InstitutionalStudentHome: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrolledCourse[]>([
    {
      courseId: 'COURSE_CS201',
      code: 'CS201',
      title: 'Data Structures & Algorithms in C',
      credits: 4,
      nextLabDate: '2026-11-26',
      nextLabTime: '10:00 AM - 12:00 PM',
      nearestDueItem: 'Lab 5: Doubly Linked Lists & Sentinel Nodes',
      nearestDueDate: 'Tomorrow, 11:59 PM',
      completedTasks: 8,
      totalTasks: 12,
      internalMarksSoFar: 18.5,
      maxMarksSoFar: 20.0,
    },
    {
      courseId: 'COURSE_CS301',
      code: 'CS301',
      title: 'Operating Systems & System Programming Lab',
      credits: 3,
      nextLabDate: '2026-11-27',
      nextLabTime: '02:00 PM - 04:00 PM',
      nearestDueItem: 'Lab 4: POSIX Fork, Exec & IPC Pipes',
      nearestDueDate: 'Friday, 05:00 PM',
      completedTasks: 6,
      totalTasks: 10,
      internalMarksSoFar: 14.0,
      maxMarksSoFar: 16.0,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'current' | 'calendar' | 'previous'>('current');

  const downloadIcsCalendar = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sanjivani University//LogicQ Lab Course//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:CS201 Lab Session - Batch A1
DESCRIPTION:Data Structures & Algorithms in C - Lab Room 204
DTSTART:20261126T100000Z
DTEND:20261126T120000Z
LOCATION:Sanjivani University, Lab 204
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'logicq_lab_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header with Institutional Branding & DPDP Notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Sanjivani University
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> DPDP 2023 Consented
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Student Lab Portal</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Continuous Internal Evaluation (CIE) & ISO C11 Lab Progression
            </p>
          </div>

          <button
            onClick={downloadIcsCalendar}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Sync to Calendar (ICS)</span>
          </button>
        </div>

        {/* Tab Navigation (S1. Home) */}
        <div className="flex border-b border-[var(--border-subtle)] gap-6">
          <button
            onClick={() => setActiveTab('current')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'current'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Current Semester Courses
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'calendar'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Term Calendar & Deadlines
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'previous'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Previous Semesters
          </button>
        </div>

        {/* Tab 1: Current Semester Course Cards */}
        {activeTab === 'current' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div
                key={course.courseId}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {course.code}
                      </span>
                      <h2 className="text-lg font-bold mt-2 text-[var(--text-main)]">{course.title}</h2>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] font-mono">{course.credits} Credits</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                      <span>Coursework Completion</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {Math.round((course.completedTasks / course.totalTasks) * 100)}% ({course.completedTasks}/{course.totalTasks})
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(course.completedTasks / course.totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Nearest Items */}
                  <div className="mt-5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-subtle)]">
                      <CalendarIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[var(--text-muted)]">Next Lab: </span>
                        <span className="font-semibold">{course.nextLabDate} ({course.nextLabTime})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-subtle)]">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[var(--text-muted)]">Due: </span>
                        <span className="font-semibold text-amber-300">{course.nearestDueItem}</span>
                        <span className="text-[var(--text-muted)]"> ({course.nearestDueDate})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[var(--text-muted)]">Internal Marks: </span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {course.internalMarksSoFar.toFixed(1)} / {course.maxMarksSoFar.toFixed(1)}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/lab/classroom/${course.courseId}`)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                  >
                    <span>Open Classroom</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Calendar View */}
        {activeTab === 'calendar' && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
            <h3 className="text-lg font-bold">Academic Schedule & Lab Deadlines (Asia/Kolkata)</h3>
            <p className="text-xs text-[var(--text-muted)]">
              All dates are automatically synchronized with Sanjivani University's official academic calendar.
            </p>
            <div className="space-y-3 mt-4">
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400">UPCOMING LAB</span>
                  <p className="text-sm font-semibold">CS201: Data Structures Lab Session #9</p>
                  <p className="text-xs text-[var(--text-muted)]">Thu, Nov 26 · 10:00 AM - 12:00 PM · Lab 204</p>
                </div>
                <span className="text-xs font-mono px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded">In 2 Days</span>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400">ASSIGNMENT DEADLINE</span>
                  <p className="text-sm font-semibold">CS201: Doubly Linked Lists & Sentinel Nodes Submission</p>
                  <p className="text-xs text-[var(--text-muted)]">Fri, Nov 27 · 11:59 PM (Grace period: 24h)</p>
                </div>
                <span className="text-xs font-mono px-2 py-1 bg-amber-500/20 text-amber-300 rounded">3 Days Left</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Previous Semesters */}
        {activeTab === 'previous' && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center py-12">
            <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <h3 className="text-base font-bold">Previous Semesters Record</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1">
              Internal marks recorded on LogicQ for previous terms are preserved here. Official semester grade sheets and transcripts are issued by the Controller of Examinations (CoE).
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
