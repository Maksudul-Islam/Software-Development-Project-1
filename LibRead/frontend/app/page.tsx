'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Bookmark, Check, ChevronDown, Clock3,
  Eye, EyeOff, FileText, FileUp, FolderOpen, Grid2X2, Library as LibraryIcon, LogOut, Menu, Minus, Plus, Search,
  Settings, ShieldAlert, ShieldCheck, Upload, UserRound, X, ClipboardCheck, Maximize2, Loader2,
} from 'lucide-react'
import { DEPARTMENT_OPTIONS, formatDepartment, type SafeUser } from '@/lib/auth'

type Pending = { id: number; title: string; course: string; sender: string; type: string }

const courses = [
  { code: 'CSE-501', name: 'Software Development Project - I', count: '12 resources', tone: 'bg-blue-50 text-blue-700' },
  { code: 'CSE-502', name: 'Operating System', count: '18 resources', tone: 'bg-slate-100 text-slate-700' },
  { code: 'CSE-503', name: 'Compiler Design', count: '15 resources', tone: 'bg-indigo-50 text-indigo-700' },
  { code: 'CSE-504', name: 'Data Communication', count: '21 resources', tone: 'bg-sky-50 text-sky-700' },
  { code: 'CSE-505', name: 'Microprocessor and Assembly Language', count: '16 resources', tone: 'bg-cyan-50 text-cyan-700' },
  { code: 'MAT-506', name: 'Linear Algebra and Matrix', count: '14 resources', tone: 'bg-amber-50 text-amber-700' },
  { code: 'CSE-507', name: 'Theory of Computing', count: '19 resources', tone: 'bg-violet-50 text-violet-700' },
]

type Book = {
  bookId: number
  title: string
  author: string
  category: string
  isDownloadable: boolean
}

const ALL_CATEGORIES = 'All materials'

function getInitials(name?: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatSemester(semester?: number | null): string {
  if (!semester) return 'Active Semester'
  const s = ['th', 'st', 'nd', 'rd']
  const v = semester % 100
  return semester + (s[(v - 20) % 10] || s[v] || s[0]) + ' Semester'
}

function formatBatch(batchNumber?: number | null): string {
  if (!batchNumber) return 'General Batch'
  const s = ['th', 'st', 'nd', 'rd']
  const v = batchNumber % 100
  return batchNumber + (s[(v - 20) % 10] || s[v] || s[0]) + ' Batch'
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <BookOpen className="size-5" />
      </div>
      <div>
        <p className="font-mono text-lg font-bold tracking-tight">LibRead</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">BrIU library system</p>
      </div>
    </div>
  )
}

function Login({
  onLoginSuccess,
  onContinueGuest,
  onSignUp,
}: {
  onLoginSuccess: (user: SafeUser) => void
  onContinueGuest: () => void
  onSignUp: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid email or password.')
        return
      }

      onLoginSuccess(data.user)
    } catch {
      setError('Unable to reach the server. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-0 sm:p-5">
      <div className="grid min-h-[640px] w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl lg:grid-cols-2">
        <div className="hidden bg-primary p-12 text-primary-foreground lg:block">
          <Brand />
          <div className="mt-28 max-w-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
              Brahmaputra International University
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-tight tracking-tight">Your campus, in one quiet place.</h1>
            <p className="mt-5 text-sm leading-7 text-primary-foreground/75">
              Read, organize, and share the academic resources that move your semester forward.
            </p>
          </div>
        </div>
        <div className="p-7 sm:p-12">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="mx-auto mt-12 max-w-sm lg:mt-16">
            <p className="text-sm font-semibold text-primary">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Sign in to LibRead</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use your credentials to access your library and portal.
            </p>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-xs font-semibold">
                Email Address
                <input
                  name="email"
                  id="login-email"
                  required
                  placeholder="name@gmail.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                />
              </label>
              <label className="block text-xs font-semibold">
                Password
                <div className="relative mt-2">
                  <input
                    name="password"
                    id="login-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in securely'
                )}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button type="button" onClick={onSignUp} className="font-bold text-primary hover:underline">
                Sign Up Here
              </button>
            </p>
            <button
              type="button"
              onClick={onContinueGuest}
              className="mt-8 w-full text-center text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

type BatchOption = {
  batchId: number
  batchNumber: number
  currentSemester: number
}

function SignUp({ onBack }: { onBack: () => void }) {
  const [role, setRole] = useState('General User / Reader')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const studentRole = role === 'BrIU Student'

  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false)
  const [batchError, setBatchError] = useState<string>('')

  useEffect(() => {
    if (!studentRole || !selectedDepartment) return

    const controller = new AbortController()

    async function loadBatches() {
      setLoadingBatches(true)
      setBatchError('')
      setSelectedBatch('')
      setBatches([])

      try {
        const response = await fetch(
          `/api/batches?department=${encodeURIComponent(selectedDepartment)}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load batches.')
        }

        const data = await response.json()
        const fetched: BatchOption[] = data.batches || []

        setBatches(fetched)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        setBatchError(err instanceof Error ? err.message : 'Unable to load batches.')
        setBatches([])
        setSelectedBatch('')
      } finally {
        if (!controller.signal.aborted) {
          setLoadingBatches(false)
        }
      }
    }

    loadBatches()

    return () => {
      controller.abort()
    }
  }, [selectedDepartment, studentRole])

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (studentRole && (!selectedDepartment || !selectedBatch || loadingBatches || !!batchError)) {
      setError(!selectedDepartment ? 'Please select a department.' : 'Please select a valid batch for your department.')
      return
    }

    setSubmitting(true)

    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('fullName') || ''),
          email: String(form.get('email') || ''),
          password: String(form.get('password') || ''),
          confirmPassword: String(form.get('confirmPassword') || ''),
          role: studentRole ? 'Student' : 'General_User',
          studentId: String(form.get('studentId') || ''),
          department: studentRole ? selectedDepartment : '',
          batchNumber: studentRole ? selectedBatch : '',
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to create the account.')
        return
      }
      onBack()
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-0 sm:p-5">
      <div className="grid min-h-[640px] w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl lg:grid-cols-2">
        <div className="hidden bg-primary p-12 text-primary-foreground lg:block">
          <Brand />
          <div className="mt-28 max-w-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
              Brahmaputra International University
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-tight tracking-tight">Join LibRead.</h1>
            <p className="mt-5 text-sm leading-7 text-primary-foreground/75">
              Expand your knowledge and access academic resources.
            </p>
          </div>
        </div>
        <div className="p-7 sm:p-12">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="mx-auto max-w-sm lg:mt-3">
            <p className="text-sm font-semibold text-primary">Create your account</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Join LibRead</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose your reader profile to personalize your access.
            </p>
            <form className="mt-7 space-y-4" onSubmit={submitSignup}>
              <fieldset>
                <legend className="text-xs font-semibold">I want to register as:</legend>
                <div className="mt-2 grid grid-cols-2 rounded-lg border border-input bg-background p-1">
                  <button
                    type="button"
                    aria-pressed={!studentRole}
                    onClick={() => setRole('General User / Reader')}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                      !studentRole ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    General User / Reader
                  </button>
                  <button
                    type="button"
                    aria-pressed={studentRole}
                    onClick={() => setRole('BrIU Student')}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                      studentRole ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    BrIU Student
                  </button>
                </div>
              </fieldset>

              <label className="block text-xs font-semibold">
                Full Name
                <input
                  id="full-name"
                  name="fullName"
                  required
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                />
              </label>

              <label className="block text-xs font-semibold">
                Email Address
                <input
                  id={studentRole ? 'university-email' : 'email-address'}
                  name="email"
                  required
                  type="email"
                  placeholder="name@gmail.com"
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                />
              </label>

              {studentRole && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold">
                    Student ID
                    <input
                      id="student-id"
                      name="studentId"
                      required
                      placeholder="074XXXXXXXXXXXXX"
                      className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Department
                    <select
                      id="department"
                      name="department"
                      required
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value)
                        setSelectedBatch('')
                        setBatches([])
                        setBatchError('')
                      }}
                      className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="" disabled>
                        Select Department...
                      </option>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <option key={dept.value} value={dept.label}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 block text-xs font-semibold">
                    Batch Number
                    <select
                      id="batch"
                      name="batch"
                      required
                      disabled={!selectedDepartment || loadingBatches || !!batchError}
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {!selectedDepartment ? (
                        <option value="" disabled>
                          Select a department first
                        </option>
                      ) : loadingBatches ? (
                        <option value="" disabled>
                          Loading batches...
                        </option>
                      ) : batchError ? (
                        <option value="" disabled>
                          {batchError}
                        </option>
                      ) : batches.length === 0 ? (
                        <option value="" disabled>
                          No active batches for {selectedDepartment}
                        </option>
                      ) : (
                        <>
                          <option value="" disabled>
                            Select Batch...
                          </option>
                          {batches.map((b) => (
                            <option key={b.batchId} value={b.batchNumber}>
                              {formatBatch(b.batchNumber)} ({formatSemester(b.currentSemester)})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold">
                  Password
                  <div className="relative mt-2">
                    <input
                      id="signup-password"
                      name="password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-gray-500"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
                <label className="block text-xs font-semibold">
                  Confirm Password
                  <div className="relative mt-2">
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-gray-500"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
              </div>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <button
                disabled={submitting || (studentRole && (loadingBatches || batches.length === 0 || !selectedBatch || !!batchError))}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? 'Creating account...' : studentRole ? 'Register as BrIU Student' : 'Create Account'}
              </button>
            </form>
            <button
              type="button"
              onClick={onBack}
              className="mt-5 w-full text-center text-sm font-semibold text-muted-foreground hover:text-primary"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function ProfileMenu({
  open,
  setOpen,
  user,
  onLogout,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  user: SafeUser | null
  onLogout: () => void
}) {
  const name = user?.name || 'Reader'
  const initials = getInitials(name)
  const isStudent = user?.role === 'Student'
  const roleDisplay = user?.role ? user.role.replace('_', ' ') : 'General Reader'
  const batchDisplay = user?.batchNumber ? formatBatch(user.batchNumber) : ''
  const semesterDisplay = user?.currentSemester ? formatSemester(user.currentSemester) : ''

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-muted"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-semibold">{name}</p>
          <p className="text-[11px] text-muted-foreground">
            {roleDisplay} {batchDisplay ? `· ${batchDisplay}` : ''}
          </p>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-border bg-card p-2 shadow-xl">
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-semibold">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {roleDisplay}
              {isStudent && user?.department ? ` - ${formatDepartment(user.department)}` : ''}
              {isStudent && batchDisplay ? ` ${batchDisplay}` : ''}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <span className="rounded-md bg-muted px-2 py-1.5 text-muted-foreground">
                {semesterDisplay || roleDisplay}
              </span>
              <span className="rounded-md bg-muted px-2 py-1.5 text-muted-foreground">
                {user?.studentId ? `ID: ${user.studentId}` : `User #${user?.userId ?? '—'}`}
              </span>
            </div>
          </div>
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <UserRound className="size-4" />
            View profile
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

function Sidebar({ portal, user, guest }: { portal: boolean; user: SafeUser | null; guest: boolean }) {
  const items = portal
    ? ([
        ['Departmental Notes', FolderOpen],
        ['My Courses', BookOpen],
        ['Upload Center', Upload],
      ] as const)
    : ([
        ['Browse catalog', Grid2X2],
        ['My bookmarks', Bookmark],
        ['Reading history', Clock3],
      ] as const)

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card px-5 py-6 lg:flex lg:flex-col">
      <Brand />
      <nav className="mt-10 space-y-1">
        {items.map(([label, Icon], i) => (
          <button
            key={label}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              i === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="size-[18px]" />
            {label}
            {portal && i === 0 && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                7
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto rounded-xl bg-primary p-4 text-primary-foreground">
        {guest ? (
          <>
            <ShieldAlert className="mb-3 size-5" />
            <p className="text-sm font-semibold">Guest access</p>
            <p className="mt-1 text-xs leading-5 text-primary-foreground/70">Sign in to unlock academic portals.</p>
          </>
        ) : user?.studentId ? (
          <>
            <ShieldCheck className="mb-3 size-5" />
            <p className="text-sm font-semibold">BrIU verified access</p>
            <p className="mt-1 text-xs leading-5 text-primary-foreground/70">Student ID {user.studentId} is active.</p>
          </>
        ) : (
          <>
            <ShieldCheck className="mb-3 size-5" />
            <p className="text-sm font-semibold">LibRead Reader</p>
            <p className="mt-1 text-xs leading-5 text-primary-foreground/70">{user?.name || 'User'} is active.</p>
          </>
        )}
      </div>
    </aside>
  )
}

function AccessModal({ currentRole, onClose }: { currentRole: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-5">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/40">
            <ShieldAlert className="size-6" />
          </div>
          <button aria-label="Close access warning" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <h2 className="mt-5 text-xl font-bold">Access Denied</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This zone is strictly restricted to authenticated Brahmaputra International University (BrIU) Faculty, Students, and CRs.
        </p>
        <div className="mt-6 flex items-center justify-between rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <span>Current role</span>
          <span className="font-bold text-foreground">{currentRole}</span>
        </div>
        <button onClick={onClose} className="mt-5 h-10 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          Return to library
        </button>
      </div>
    </div>
  )
}

function Reader({ book, onBack }: { book: { title: string; author: string }; onBack: () => void }) {
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-slate-100">
      <header className="flex min-h-16 items-center justify-between border-b border-slate-800 px-4 sm:px-7">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
          <ArrowLeft className="size-4" />
          Back to LibRead
        </button>
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <BookOpen className="size-4 text-sky-400" />
          In-app PDF Reader
        </div>
        <button aria-label="Full screen" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <Maximize2 className="size-4" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center bg-slate-900/70 p-4 sm:p-10">
          <div
            className="flex h-[min(68vh,680px)] w-full max-w-3xl flex-col bg-white text-slate-900 shadow-2xl"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            <div className="flex-1 p-8 sm:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">LibRead preview document</p>
              <h1 className="mt-10 text-3xl font-bold">{book.title}</h1>
              <p className="mt-2 text-slate-500">{book.author}</p>
              <div className="mt-14 space-y-5">
                <div className="h-3 w-4/5 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-200" />
                <div className="h-3 w-11/12 rounded bg-slate-200" />
                <div className="mt-10 h-36 rounded-lg bg-sky-50" />
                <div className="h-3 w-full rounded bg-slate-200" />
                <div className="h-3 w-3/4 rounded bg-slate-200" />
              </div>
            </div>
            <div className="border-t border-slate-200 px-8 py-4 text-center text-xs text-slate-400">
              Simulated PDF page {page}
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
            <button
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="min-w-16 text-center text-slate-300">{page} / 24</span>
            <button
              onClick={() => setPage(Math.min(24, page + 1))}
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
            >
              <ArrowRight className="size-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-slate-700" />
            <button
              onClick={() => setZoom(Math.max(80, zoom - 10))}
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-slate-300">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(130, zoom + 10))}
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </main>
        <aside className="hidden w-80 overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 xl:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">Book information</p>
          <h2 className="mt-3 text-lg font-bold">{book.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{book.author}</p>
          <div className="mt-8 border-t border-slate-800 pt-6">
            <p className="text-sm font-semibold">Your notes</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note about this page..."
              className="mt-3 h-28 w-full resize-none rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
            <button
              onClick={() => setNote(note.trim() || 'Saved note for page 1')}
              className="mt-2 text-xs font-bold text-sky-400"
            >
              Save note
            </button>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-6">
            <p className="text-sm font-semibold">Reviews</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">A clear and practical reference for semester study.</p>
            <div className="mt-3 text-xs font-bold text-amber-400">4.8 / 5 · 126 readers</div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Library() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const hasCategoryOptions = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const searchParams = new URLSearchParams()
    const trimmedQuery = query.trim()

    if (trimmedQuery) searchParams.set('search', trimmedQuery)
    if (category !== ALL_CATEGORIES) searchParams.set('category', category)

    const queryString = searchParams.toString()
    const url = queryString ? `/api/books?${queryString}` : '/api/books'

    async function loadBooks() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Unable to load books.')
        }

        const data: { books: Book[] } = await response.json()
        setBooks(data.books)

        if ((category === ALL_CATEGORIES && !trimmedQuery) || !hasCategoryOptions.current) {
          setCategories([...new Set(data.books.map((book) => book.category))].sort((a, b) => a.localeCompare(b)))
          hasCategoryOptions.current = true
        }
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load books. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadBooks()
    return () => controller.abort()
  }, [query, category])

  const categoryOptions = [ALL_CATEGORIES, ...categories]

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-border pb-7 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <LibraryIcon className="size-4" />
            General collection
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find something worth reading.</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Explore books in the LibRead collection.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Matching titles</p>
          <p className="mt-1 text-xl font-bold">{loading || error ? '—' : books.length}</p>
        </div>
      </section>
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or author..."
          className="h-12 w-full rounded-xl border border-border bg-card pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryOptions.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold ${
              category === item
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div role="status" className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Loading books...
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          {query.trim() || category !== ALL_CATEGORIES ? 'No books match your search and category.' : 'No books are available yet.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {books.map((book) => (
            <article
              key={book.bookId}
              className="rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-36 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="size-12 opacity-70" />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary">{book.category}</p>
              <h2 className="mt-2 font-semibold">{book.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{book.author}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Download permission: {book.isDownloadable ? 'Enabled' : 'Disabled'}
              </p>
              <button
                type="button"
                disabled
                title="Book access is not available yet."
                className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground opacity-60"
              >
                <BookOpen className="size-3.5" />
                Book access coming soon
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Portal({
  user,
  onRead,
}: {
  user: SafeUser | null
  onRead: (book: { title: string; author: string }) => void
}) {
  const [pending, setPending] = useState<Pending[]>([])
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState(courses[0].code)
  const [type, setType] = useState('Class note')
  const [file, setFile] = useState('')

  const semesterDisplay = user?.currentSemester ? formatSemester(user.currentSemester) : 'Current Semester'
  const batchDisplay = user?.batchNumber ? formatBatch(user.batchNumber) : ''
  const deptDisplay = user?.department ? formatDepartment(user.department) : 'Academic'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !file) return
    setPending((v) => [
      {
        id: Date.now(),
        title,
        course,
        sender: user?.name || 'Class Student',
        type,
      },
      ...v,
    ])
    setTitle('')
    setFile('')
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Academic portal</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Your semester, organized.</h1>
        <p className="mt-2 text-sm text-primary-foreground/75">
          {semesterDisplay} {deptDisplay ? `· ${deptDisplay}` : ''} {batchDisplay ? `· ${batchDisplay}` : ''}
        </p>
      </section>
      <section>
        <h2 className="font-semibold">My course folders</h2>
        <p className="mt-1 text-xs text-muted-foreground">Your current semester curriculum at a glance</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <button
              key={c.code}
              onClick={() => onRead({ title: `${c.name} — Course Reader`, author: 'BrIU Departmental Notes' })}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/30 hover:shadow-md"
            >
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
                <FolderOpen className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.code}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{c.name}</p>
                <p className="mt-2 text-[11px] font-medium text-primary">{c.count}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Upload className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Upload Resource</h2>
              <p className="mt-1 text-xs text-muted-foreground">Share useful material with your class</p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold">
              Resource title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating System Chapter 4"
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Course
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                >
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Resource type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option>Class note</option>
                  <option>PDF</option>
                  <option>Image</option>
                  <option>Assignment</option>
                </select>
              </label>
            </div>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 text-center hover:border-primary/50">
              <FileUp className="size-6 text-primary" />
              <span className="mt-2 text-sm font-semibold">{file || 'Choose a PDF, image, or document'}</span>
              <span className="mt-1 text-xs text-muted-foreground">Maximum file size 10 MB</span>
              <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name || '')} />
            </label>
            <button className="h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Submit for approval
            </button>
          </form>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Pending Approvals Queue</h2>
              <p className="mt-1 text-xs text-muted-foreground">CR and faculty moderation panel</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
              {pending.length} pending
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.course} · {item.type} · by {item.sender}
                    </p>
                  </div>
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setPending((v) => v.filter((p) => p.id !== item.id))}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Check className="mr-1 inline size-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => setPending((v) => v.filter((p) => p.id !== item.id))}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Dashboard({
  guest,
  user,
  onLogout,
  logoutError,
}: {
  guest: boolean
  user: SafeUser | null
  onLogout: () => void
  logoutError: string
}) {
  const [portal, setPortal] = useState(false)
  const [profile, setProfile] = useState(false)
  const [denied, setDenied] = useState(false)
  const [reader, setReader] = useState<{ title: string; author: string } | null>(null)

  const canAccessPortal = !guest && user && user.role !== 'General_User' && user.role !== 'Guest'
  const greetingName = guest ? 'Guest' : (user?.name?.split(' ')[0] || user?.name || 'Reader')
  const currentRoleName = guest ? 'Guest' : (user?.role?.replace('_', ' ') || 'General User')

  const [currentDate, setCurrentDate] = useState('')
  const [currentGreeting, setCurrentGreeting] = useState('Good morning')

  useEffect(() => {
    function update() {
      const now = new Date()
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
      const h = now.getHours()
      if (h >= 5 && h < 12) setCurrentGreeting('Good morning')
      else if (h >= 12 && h < 17) setCurrentGreeting('Good afternoon')
      else if (h >= 17 && h < 21) setCurrentGreeting('Good evening')
      else setCurrentGreeting('Good night')
    }
    update()
    // refresh every minute so date/greeting stay current
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  if (reader) return <Reader book={reader} onBack={() => setReader(null)} />

  const handlePortalSwitch = () => {
    if (canAccessPortal) {
      setPortal(true)
    } else {
      setDenied(true)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar portal={portal} user={user} guest={guest} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button className="rounded-lg p-2 hover:bg-muted">
                <Menu className="size-5" />
              </button>
              <Brand />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">{currentDate}</p>
              <p className="text-xl font-semibold">{currentGreeting}, {greetingName}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex rounded-xl border border-border bg-muted/60 p-1">
                <button
                  onClick={() => setPortal(false)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 ${
                    !portal ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  General E-Library
                </button>
                <button
                  onClick={handlePortalSwitch}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 ${
                    portal ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  BrIU Academic Portal
                </button>
              </div>
              <button
                aria-label="Notifications"
                className="hidden rounded-lg p-2.5 text-muted-foreground hover:bg-muted sm:block"
              >
                <Bell className="size-[18px]" />
              </button>
              {guest ? (
                <button
                  onClick={onLogout}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground"
                >
                  Sign in
                </button>
              ) : (
                <ProfileMenu open={profile} setOpen={setProfile} user={user} onLogout={onLogout} />
              )}
            </div>
          </header>
          {logoutError && (
            <p role="alert" className="mx-auto mt-4 max-w-[1440px] px-5 text-sm font-medium text-red-600 sm:px-8 lg:px-10">
              {logoutError}
            </p>
          )}
          <main className="mx-auto max-w-[1440px] p-5 sm:p-8 lg:p-10">
            {portal ? <Portal user={user} onRead={setReader} /> : <Library />}
          </main>
        </div>
      </div>
      {denied && <AccessModal currentRole={currentRoleName} onClose={() => setDenied(false)} />}
    </div>
  )
}

export default function Page() {
  const [authenticated, setAuthenticated] = useState(false)
  const [signingUp, setSigningUp] = useState(false)
  const [guest, setGuest] = useState(false)
  const [user, setUser] = useState<SafeUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function checkCurrentSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user && isMounted) {
            setUser(data.user)
            setAuthenticated(true)
            setGuest(false)
          }
        }
      } catch (err) {
        console.error('Session restore error:', err)
      } finally {
        if (isMounted) {
          setCheckingSession(false)
        }
      }
    }

    checkCurrentSession()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLoginSuccess = (authenticatedUser: SafeUser) => {
    setUser(authenticatedUser)
    setAuthenticated(true)
    setGuest(false)
  }

  const handleContinueGuest = () => {
    setUser(null)
    setAuthenticated(true)
    setGuest(true)
  }

  const handleLogout = async () => {
    setLogoutError('')

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) {
        setLogoutError('Unable to log out right now. Please try again.')
        return
      }

      const result: unknown = await response.json()
      if (typeof result !== 'object' || result === null || !('success' in result) || result.success !== true) {
        setLogoutError('Unable to log out right now. Please try again.')
        return
      }

      setUser(null)
      setAuthenticated(false)
      setGuest(false)
    } catch (err) {
      console.error('Logout error:', err)
      setLogoutError('Unable to log out right now. Please try again.')
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-5">
        <div className="flex flex-col items-center gap-4">
          <Brand />
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return signingUp ? (
      <SignUp onBack={() => setSigningUp(false)} />
    ) : (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onContinueGuest={handleContinueGuest}
        onSignUp={() => setSigningUp(true)}
      />
    )
  }

  return <Dashboard guest={guest} user={user} onLogout={handleLogout} logoutError={logoutError} />
}
