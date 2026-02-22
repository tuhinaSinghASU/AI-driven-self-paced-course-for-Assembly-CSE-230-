// frontend/app/login/teacher/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Student = {
  id: number;
  name: string;
  email: string;
  overallMastery: number; // 0-100
  timeOnTaskHours: number;
  modulesCompleted: number;
  totalModules: number;
  lastActiveMinutesAgo: number;
  riskLevel: "low" | "medium" | "high";
};

type Course = {
  id: number;
  code: string;
  title: string;
  term: string;
  enrollment: number;
  avgMastery: number;
  active: boolean;
};

// Mock data for now – can later be wired to backend
const MOCK_STUDENTS: Student[] = Array.from({ length: 120 }).map((_, idx) => {
  const baseMastery = 60 + (idx % 30) - 10; // 50–80 range-ish
  const mastery =
    baseMastery +
    (idx % 5 === 0 ? -20 : 0) +
    (idx % 11 === 0 ? -10 : 0) +
    (idx % 7 === 0 ? 15 : 0);
  const clamped = Math.min(100, Math.max(20, mastery));
  const riskLevel: Student["riskLevel"] =
    clamped < 50 ? "high" : clamped < 70 ? "medium" : "low";

  return {
    id: idx + 1,
    name: `Student ${idx + 1}`,
    email: `student${idx + 1}@example.edu`,
    overallMastery: clamped,
    timeOnTaskHours: 5 + (idx % 15),
    modulesCompleted: 1 + (idx % 5),
    totalModules: 10,
    lastActiveMinutesAgo: (idx * 13) % 720,
    riskLevel,
  };
});

const MOCK_COURSES: Course[] = [
  {
    id: 1,
    code: "CSE 230",
    title: "Computer Systems",
    term: "Spring 2026",
    enrollment: 120,
    avgMastery: 72,
    active: true,
  },
  {
    id: 2,
    code: "CSE 230-L",
    title: "Computer Systems Lab",
    term: "Spring 2026",
    enrollment: 115,
    avgMastery: 70,
    active: true,
  },
  {
    id: 3,
    code: "CSE 230 (FA25)",
    title: "Computer Systems",
    term: "Fall 2025",
    enrollment: 110,
    avgMastery: 75,
    active: false,
  },
];

export default function TeacherPage() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [selectedCourseId, setSelectedCourseId] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [showOnlyStruggling, setShowOnlyStruggling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

  // Simulate "real-time" refresh every 30s (could be wired to SSE/WebSocket later)
  useEffect(() => {
    setLastUpdated(new Date());
    const interval = setInterval(() => {
      // Tiny random noise on mastery to simulate dynamics
      setStudents((prev) =>
        prev.map((s) => {
          const delta = (Math.random() - 0.5) * 2; // -1..+1
          const nextMastery = Math.min(100, Math.max(20, s.overallMastery + delta));
          const riskLevel: Student["riskLevel"] =
            nextMastery < 50 ? "high" : nextMastery < 70 ? "medium" : "low";
          return { ...s, overallMastery: nextMastery, riskLevel };
        })
      );
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    if (students.length === 0) {
      return {
        avgMastery: 0,
        modulesCompletedAvg: 0,
        totalTimeOnTask: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
      };
    }
    const totalMastery = students.reduce((sum, s) => sum + s.overallMastery, 0);
    const totalModulesCompleted = students.reduce(
      (sum, s) => sum + s.modulesCompleted,
      0
    );
    const totalTime = students.reduce((sum, s) => sum + s.timeOnTaskHours, 0);
    const highRiskCount = students.filter((s) => s.riskLevel === "high").length;
    const mediumRiskCount = students.filter((s) => s.riskLevel === "medium").length;
    const lowRiskCount = students.filter((s) => s.riskLevel === "low").length;

    return {
      avgMastery: Math.round(totalMastery / students.length),
      modulesCompletedAvg: (totalModulesCompleted / students.length).toFixed(1),
      totalTimeOnTask: totalTime.toFixed(1),
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };
  }, [students]);

  const strugglingStudents = useMemo(
    () =>
      students
        .filter((s) => s.riskLevel === "high" || s.overallMastery < 60)
        .sort((a, b) => a.overallMastery - b.overallMastery)
        .slice(0, 10),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (showOnlyStruggling && s.riskLevel !== "high") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        String(s.id).includes(q)
      );
    });
  }, [students, showOnlyStruggling, search]);

  const handleToggleCourseActive = (courseId: number) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, active: !c.active } : c))
    );
  };

  const handleExport = async (type: "csv" | "pdf") => {
    setIsExporting(type);
    try {
      if (type === "csv") {
        const header =
          "id,name,email,overallMastery,timeOnTaskHours,modulesCompleted,totalModules,riskLevel\n";
        const rows = students
          .map(
            (s) =>
              `${s.id},"${s.name}",${s.email},${s.overallMastery},${s.timeOnTaskHours},${s.modulesCompleted},${s.totalModules},${s.riskLevel}`
          )
          .join("\n");
        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "cse230-student-report.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Simple PDF-like export: generate a printable window that the instructor can “Save as PDF”
        const printable = window.open("", "_blank", "noopener,noreferrer");
        if (printable) {
          printable.document.write(`
            <html>
              <head>
                <title>CSE 230 Student Report</title>
                <style>
                  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
                  h1 { margin-bottom: 4px; }
                  h2 { margin-top: 24px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                  th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
                  th { background: #f3f4f6; }
                </style>
              </head>
              <body>
                <h1>CSE 230 Student Progress Report</h1>
                <p>Generated at: ${new Date().toLocaleString()}</p>
                <h2>Summary</h2>
                <ul>
                  <li>Average Mastery: ${metrics.avgMastery}%</li>
                  <li>Average Modules Completed: ${metrics.modulesCompletedAvg}</li>
                  <li>Total Time on Task: ${metrics.totalTimeOnTask} hours</li>
                  <li>High Risk Students: ${metrics.highRiskCount}</li>
                </ul>
                <h2>Students</h2>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Mastery</th>
                      <th>Modules</th>
                      <th>Time (h)</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${students
                      .map(
                        (s) => `
                          <tr>
                            <td>${s.id}</td>
                            <td>${s.name}</td>
                            <td>${s.email}</td>
                            <td>${s.overallMastery}%</td>
                            <td>${s.modulesCompleted}/${s.totalModules}</td>
                            <td>${s.timeOnTaskHours.toFixed(1)}</td>
                            <td>${s.riskLevel}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
                <script>
                  window.onload = function() { window.print(); };
                </script>
              </body>
            </html>
          `);
          printable.document.close();
        }
      }
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#800020] px-6 py-4 shadow-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 h-10 w-10 rounded flex items-center justify-center">
              <span className="text-[#800020] font-bold text-lg">CSE</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                CSE 230 Instructor Dashboard
              </h1>
              <p className="text-sm text-yellow-100">
                Monitor mastery-based progress and support struggling students
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                // manual refresh hook; in future, call backend
                setLastUpdated(new Date());
              }}
              className="text-white border border-white/30 px-3 py-1.5 rounded text-sm hover:bg-white/10 transition-colors"
            >
              Refresh
            </button>
            <Link
              href="/login"
              className="text-white hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm font-medium">Logout</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Top row: key metrics + export */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            {/* Average Mastery */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Average Mastery
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.avgMastery}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Across {students.length} students
                </p>
              </div>
              <div className="text-yellow-400">
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>

            {/* Modules Completed */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Avg Modules Completed
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.modulesCompletedAvg}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Out of 10 per student
                </p>
              </div>
              <div className="text-[#800020]">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>

            {/* Time on Task */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Time on Task
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.totalTimeOnTask}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total hours spent</p>
              </div>
              <div className="text-[#800020]">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Risk Distribution
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="inline-flex items-center mr-3">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                    <span className="text-xs">
                      Low: {metrics.lowRiskCount}
                    </span>
                  </span>
                  <span className="inline-flex items-center mr-3">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1" />
                    <span className="text-xs">
                      Medium: {metrics.mediumRiskCount}
                    </span>
                  </span>
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                    <span className="text-xs">
                      High: {metrics.highRiskCount}
                    </span>
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-end text-xs text-gray-500">
                <span>Last updated</span>
                <span className="font-medium">
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString()
                    : "Just now"}
                </span>
              </div>
            </div>
          </div>

          {/* Export panel */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 w-full lg:w-72 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Export Reports
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                Download current student data for grading or accreditation
                documentation.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={!!isExporting}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium bg-[#800020] text-white hover:bg-[#640018] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">
                    {isExporting === "csv" ? "Exporting..." : "Export CSV"}
                  </span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4h16v4H4zM4 12h16v8H4z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={!!isExporting}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">
                    {isExporting === "pdf" ? "Preparing..." : "Export PDF"}
                  </span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 11V3m0 8l-3-3m3 3l3-3m-9 5h12v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">
              Tip: Use your browser&apos;s &quot;Save as PDF&quot; from the print
              dialog for a formatted PDF snapshot.
            </p>
          </div>
        </div>

        {/* Middle row: alerts + course management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Struggling students alerts */}
          <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h2 className="text-base font-semibold text-gray-900">
                  Struggling Students
                </h2>
              </div>
              <span className="ml-auto text-xs text-gray-600">
                Showing top {strugglingStudents.length} by lowest mastery
              </span>
            </div>
            {strugglingStudents.length === 0 ? (
              <p className="text-sm text-gray-600">
                No high-risk students right now. 🎉
              </p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        Student
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        Mastery
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 hidden md:table-cell">
                        Modules
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 hidden sm:table-cell">
                        Time (h)
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        Suggested Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {strugglingStudents.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {s.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {s.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.overallMastery < 50
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {s.overallMastery.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell text-gray-700">
                          {s.modulesCompleted}/{s.totalModules}
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell text-gray-700">
                          {s.timeOnTaskHours.toFixed(1)}
                        </td>
                        <td className="px-3 py-2">
                          <button className="text-xs font-medium text-[#800020] hover:underline">
                            Send nudge via LMS
                          </button>
                          <span className="block text-[11px] text-gray-500">
                            Recommend targeted practice on low-mastery modules.
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Course management */}
          <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center mb-4">
              <svg
                className="w-5 h-5 text-[#800020]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2v-9a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z"
                />
              </svg>
              <h2 className="ml-2 text-base font-semibold text-gray-900">
                Course Management
              </h2>
            </div>

            <label className="block mb-3">
              <span className="text-xs font-medium text-gray-700">
                Active Course
              </span>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/60 focus:border-[#800020]/60"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.term}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`border rounded-md px-3 py-2 text-sm ${
                    course.id === selectedCourseId
                      ? "border-[#800020] bg-[#800020]/5"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {course.code}
                      </p>
                      <p className="text-xs text-gray-600">
                        {course.title} · {course.term}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleCourseActive(course.id)}
                      className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                        course.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {course.active ? "Active" : "Archived"}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <span>Enrollment: {course.enrollment}</span>
                    <span>Avg mastery: {course.avgMastery}%</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-[11px] hover:bg-gray-100">
                      Manage modules
                    </button>
                    <button className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-[11px] hover:bg-gray-100">
                      Update syllabus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Bottom row: full roster table */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M13 4a4 4 0 11-8 0 4 4 0 018 0zM6 20h7v-2a4 4 0 00-7.03-2.472"
                />
              </svg>
              <h2 className="text-base font-semibold text-gray-900">
                Student Roster
              </h2>
            </div>
            <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:justify-end">
              <div className="relative w-full md:w-64">
                <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16l-4 4m0 0l4-4m-4 4V4m13 12a5 5 0 10-10 0 5 5 0 0010 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or ID"
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/60 focus:border-[#800020]/60"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={showOnlyStruggling}
                  onChange={(e) => setShowOnlyStruggling(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
                />
                Show only high-risk
              </label>
            </div>
          </div>

          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Student
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Mastery
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 hidden md:table-cell">
                    Modules
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 hidden sm:table-cell">
                    Time (h)
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 hidden lg:table-cell">
                    Last Active
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-gray-700">{s.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {s.name}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {s.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">
                          {s.overallMastery.toFixed(0)}%
                        </span>
                        <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              s.overallMastery < 50
                                ? "bg-red-500"
                                : s.overallMastery < 70
                                ? "bg-yellow-400"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${s.overallMastery}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700 hidden md:table-cell">
                      {s.modulesCompleted}/{s.totalModules}
                    </td>
                    <td className="px-3 py-2 text-gray-700 hidden sm:table-cell">
                      {s.timeOnTaskHours.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 hidden lg:table-cell">
                      {s.lastActiveMinutesAgo === 0
                        ? "Now"
                        : `${s.lastActiveMinutesAgo} min ago`}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          s.riskLevel === "high"
                            ? "bg-red-100 text-red-800"
                            : s.riskLevel === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {s.riskLevel === "high"
                          ? "High"
                          : s.riskLevel === "medium"
                          ? "Medium"
                          : "Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                No students match this filter.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
