'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Bookmark, Check, ChevronDown, Clock3, Download,
  Eye, EyeOff, FileText, FileUp, FolderOpen, Grid2X2, Library as LibraryIcon, LogOut, Menu, Minus, Plus, Search,
  Settings, ShieldAlert, ShieldCheck, Upload, UserRound, X, ClipboardCheck, Maximize2, Loader2, Trash2,
} from 'lucide-react'
import { DEPARTMENT_OPTIONS, formatDepartment, type SafeUser } from '@/lib/auth'
import { AdminCategoryManagement } from '@/components/admin-category-management'
import {
  BookCategorySelector,
  type CategoryOption,
} from '@/components/book-category-selector'

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
  mainCategories?: Array<{
    mainCategoryId: number
    name: string
    subcategories: Array<{ subcategoryId: number; name: string }>
  }>
  primaryMainCategory?: { mainCategoryId: number; name: string } | null
  primaryMainCategoryId?: number
}

type ReaderBook = {
  bookId?: number
  title: string
  author: string
  isDownloadable?: boolean
}

const BOOK_STATUSES = ['Draft', 'Pending', 'Published'] as const
type BookStatus = (typeof BOOK_STATUSES)[number]

type AdminBook = Book & {
  status: BookStatus
  hasPdf: boolean
  mainCategories: NonNullable<Book['mainCategories']>
  primaryMainCategoryId: number
}

function isBookStatus(value: string): value is BookStatus {
  return BOOK_STATUSES.some((status) => status === value)
}

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

function Reader({ book, onBack }: { book: ReaderBook; onBack: () => void }) {
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [note, setNote] = useState('')
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pdfError, setPdfError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const readerRef = useRef<HTMLDivElement>(null)
  const pdfUrl = book.bookId !== undefined ? `/api/books/${book.bookId}/pdf` : null

  useEffect(() => {
    if (book.bookId === undefined) return

    const controller = new AbortController()
    let active = true

    async function checkPdfAvailability() {
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

      try {
        const response = await fetch(`/api/books/${book.bookId}/pdf`, {
          headers: { Range: 'bytes=0-0' },
          signal: controller.signal,
        })

        if (!active || controller.signal.aborted) {
          await response.body?.cancel()
          return
        }

        if (!response.ok) {
          await response.body?.cancel()
          if (!active || controller.signal.aborted) return
          setPdfError(
            response.status === 404
              ? 'This book’s PDF is not available.'
              : 'Unable to load this book’s PDF. Please try again.',
          )
          setPdfStatus('error')
          return
        }

        if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) {
          await response.body?.cancel()
          if (!active || controller.signal.aborted) return
          setPdfError('The requested book file is not a PDF.')
          setPdfStatus('error')
          return
        }

        reader = response.body?.getReader() ?? null
        if (!reader) {
          if (!active || controller.signal.aborted) return
          setPdfError('The requested book PDF is empty.')
          setPdfStatus('error')
          return
        }

        const { done } = await reader.read()
        if (!active || controller.signal.aborted) {
          await reader.cancel()
          return
        }
        if (done) {
          await reader.cancel()
          if (!active || controller.signal.aborted) return
          setPdfError('The requested book PDF is empty.')
          setPdfStatus('error')
          return
        }

        await reader.cancel()
        reader = null
        if (!active || controller.signal.aborted) return
        setPdfStatus('ready')
      } catch {
        if (reader) {
          try {
            await reader.cancel()
          } catch {
            // The stream may already be errored or aborted.
          }
        }
        if (active && !controller.signal.aborted) {
          setPdfError('Unable to load this book’s PDF. Please check your connection and try again.')
          setPdfStatus('error')
        }
      }
    }

    void checkPdfAvailability()
    return () => {
      active = false
      controller.abort()
    }
  }, [book.bookId])

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(document.fullscreenElement === readerRef.current)
      setFullscreenError('')
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  async function toggleFullscreen() {
    const readerElement = readerRef.current

    if (document.fullscreenElement === readerElement) {
      if (!document.exitFullscreen) {
        setFullscreenError('Exiting full screen is not supported by this browser.')
        return
      }

      try {
        await document.exitFullscreen()
      } catch {
        setFullscreenError('Unable to exit full screen.')
      }
      return
    }

    if (!readerElement || !document.fullscreenEnabled || !readerElement.requestFullscreen) {
      setFullscreenError('Full screen is not supported by this browser.')
      return
    }

    try {
      await readerElement.requestFullscreen()
    } catch {
      setFullscreenError('Unable to enter full screen.')
    }
  }

  return (
    <div ref={readerRef} className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-slate-100">
      <header className="flex min-h-16 items-center justify-between border-b border-slate-800 px-4 sm:px-7">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
          <ArrowLeft className="size-4" />
          Back to LibRead
        </button>
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <BookOpen className="size-4 text-sky-400" />
          In-app PDF Reader
        </div>
        <button
          type="button"
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          aria-pressed={isFullscreen}
          onClick={() => void toggleFullscreen()}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Maximize2 className="size-4" />
        </button>
      </header>
      {fullscreenError && (
        <p role="alert" className="border-b border-slate-800 px-4 py-2 text-center text-sm text-amber-300">
          {fullscreenError}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center bg-slate-900/70 p-4 sm:p-10">
          {pdfUrl ? (
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
              {pdfStatus === 'loading' && (
                <p role="status" className="py-3 text-center text-sm text-slate-300">
                  Loading PDF…
                </p>
              )}
              {pdfStatus === 'error' ? (
                <div role="alert" className="rounded-lg border border-red-900 bg-red-950/50 p-5 text-sm text-red-200">
                  {pdfError}
                </div>
              ) : pdfStatus === 'ready' ? (
                <iframe
                  src={pdfUrl}
                  title={`PDF reader: ${book.title}`}
                  className="min-h-[60vh] w-full flex-1 rounded bg-white"
                />
              ) : null}
              <p className="text-center text-xs text-slate-400">
                PDF display uses your browser’s built-in viewer.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
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

function Library({ onRead }: { onRead: (book: Book) => void }) {
  const [query, setQuery] = useState('')
  const [mainCategoryId, setMainCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const searchParams = new URLSearchParams()
    const trimmedQuery = query.trim()

    if (trimmedQuery) searchParams.set('search', trimmedQuery)
    if (mainCategoryId) searchParams.set('mainCategoryId', mainCategoryId)
    if (subcategoryId) searchParams.set('subcategoryId', subcategoryId)
    searchParams.set('page', String(page))

    const queryString = searchParams.toString()
    const url = `/api/books?${queryString}`

    async function loadBooks() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Unable to load books.')
        }

        const data: {
          books: Book[]
          categories: CategoryOption[]
          pagination: { pageCount: number }
        } = await response.json()
        setBooks(data.books)
        setCategories(data.categories)
        setPageCount(data.pagination.pageCount)
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
  }, [query, mainCategoryId, subcategoryId, page])

  const selectedMainCategoryId = Number(mainCategoryId)
  const selectedCategory = categories.find((category) => category.mainCategoryId === selectedMainCategoryId)
  const visibleSubcategories = selectedCategory?.subcategories ?? []

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
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Search by title or author..."
          className="h-12 w-full rounded-xl border border-border bg-card pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Main category
          <select
            value={mainCategoryId}
            onChange={(event) => {
              setMainCategoryId(event.target.value)
              setSubcategoryId('')
              setPage(1)
            }}
            className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="">All main categories</option>
            {categories.map((item) => (
              <option key={item.mainCategoryId} value={item.mainCategoryId}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Subcategory
          <select
            value={subcategoryId}
            disabled={!mainCategoryId}
            onChange={(event) => {
              setSubcategoryId(event.target.value)
              setPage(1)
            }}
            className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm disabled:opacity-60"
          >
            <option value="">All subcategories</option>
            {visibleSubcategories.map((item) => (
              <option key={item.subcategoryId} value={item.subcategoryId}>{item.name}</option>
            ))}
          </select>
        </label>
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
          {query.trim() || mainCategoryId || subcategoryId
            ? 'No books match your search and category.'
            : 'No published books are available yet.'}
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
              <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary">
                {book.mainCategories?.map((item) => item.name).join(', ') || book.category}
              </p>
              <h2 className="mt-2 font-semibold">{book.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{book.author}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Download permission: {book.isDownloadable ? 'Enabled' : 'Disabled'}
              </p>
              <button
                type="button"
                onClick={() => onRead(book)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                <BookOpen className="size-3.5" />
                Read book
              </button>
              {book.isDownloadable && (
                <a
                  href={`/api/books/${book.bookId}/download`}
                  aria-label={`Download ${book.title}`}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              )}
            </article>
          ))}
        </div>
      )}
      {!error && pageCount > 1 && (
        <nav aria-label="Book catalog pages" className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
          <button
            type="button"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}

function Portal({
  user,
  onRead,
}: {
  user: SafeUser | null
  onRead: (book: ReaderBook) => void
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

function AdminBookManagement({ onLogout }: { onLogout: () => void }) {
  const [activeSection, setActiveSection] = useState<'books' | 'categories'>('books')
  const [books, setBooks] = useState<AdminBook[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [updatingBookId, setUpdatingBookId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [uploadingBookIds, setUploadingBookIds] = useState<number[]>([])
  const [uploadFeedback, setUploadFeedback] = useState<
    Record<number, { type: 'success' | 'error'; message: string }>
  >({})
  const uploadingBookIdsRef = useRef(new Set<number>())
  const [addingBook, setAddingBook] = useState(false)
  const [newMainCategoryIds, setNewMainCategoryIds] = useState<number[]>([])
  const [newPrimaryMainCategoryId, setNewPrimaryMainCategoryId] = useState<number | null>(null)
  const [newSubcategoryIds, setNewSubcategoryIds] = useState<number[]>([])
  const [editingBookId, setEditingBookId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingAuthor, setEditingAuthor] = useState('')
  const [editingMainCategoryIds, setEditingMainCategoryIds] = useState<number[]>([])
  const [editingPrimaryMainCategoryId, setEditingPrimaryMainCategoryId] = useState<number | null>(null)
  const [editingSubcategoryIds, setEditingSubcategoryIds] = useState<number[]>([])
  const [savingBookEditId, setSavingBookEditId] = useState<number | null>(null)
  const savingBookEditIdsRef = useRef(new Set<number>())
  const [bookEditFeedback, setBookEditFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [addBookFeedback, setAddBookFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const addingBookRef = useRef(false)
  const [deletingBookIds, setDeletingBookIds] = useState<number[]>([])
  const deletingBookIdsRef = useRef(new Set<number>())
  const [deleteFeedback, setDeleteFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function isAdminBook(value: unknown): value is AdminBook {
    if (!isRecord(value)) return false
    const mainCategories = value.mainCategories
    const validMainCategories =
      Array.isArray(mainCategories) &&
      mainCategories.every((category) =>
        isRecord(category) &&
        typeof category.mainCategoryId === 'number' &&
        typeof category.name === 'string' &&
        Array.isArray(category.subcategories) &&
        category.subcategories.every((subcategory) =>
          isRecord(subcategory) &&
          typeof subcategory.subcategoryId === 'number' &&
          typeof subcategory.name === 'string',
        ),
      )
    return (
      typeof value.bookId === 'number' &&
      Number.isSafeInteger(value.bookId) &&
      value.bookId > 0 &&
      typeof value.title === 'string' &&
      typeof value.author === 'string' &&
      typeof value.category === 'string' &&
      typeof value.status === 'string' &&
      isBookStatus(value.status) &&
      typeof value.isDownloadable === 'boolean' &&
      typeof value.hasPdf === 'boolean' &&
      typeof value.primaryMainCategoryId === 'number' &&
      Number.isSafeInteger(value.primaryMainCategoryId) &&
      validMainCategories
    )
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadBooks() {
      setLoading(true)
      setLoadError('')
      setSessionExpired(false)

      try {
        const [response, categoryResponse] = await Promise.all([
          fetch('/api/admin/books', { signal: controller.signal }),
          fetch('/api/admin/categories', { signal: controller.signal }),
        ])

        if (controller.signal.aborted) return
        if (response.status === 401 || categoryResponse.status === 401) {
          setSessionExpired(true)
          setLoadError('Your session has expired. Sign in again to manage books.')
          return
        }
        if (!response.ok || !categoryResponse.ok) {
          throw new Error('Unable to load books. Please try again.')
        }

        const [data, categoryData]: [unknown, unknown] = await Promise.all([
          response.json(),
          categoryResponse.json(),
        ])
        if (
          !isRecord(data) ||
          !Array.isArray(data.books) ||
          !data.books.every(isAdminBook) ||
          !isRecord(categoryData) ||
          !Array.isArray(categoryData.categories)
        ) {
          throw new Error('Invalid Admin book list response.')
        }

        if (!controller.signal.aborted) {
          setBooks(data.books)
          setCategories(categoryData.categories as CategoryOption[])
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadError('Unable to load books. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadBooks()
    return () => controller.abort()
  }, [retryCount])

  async function updateBookStatus(bookId: number, status: BookStatus) {
    setUpdatingBookId(bookId)
    setStatusError('')

    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.status === 401) {
        setSessionExpired(true)
        setStatusError('Your session has expired. Sign in again to manage books.')
        return
      }

      if (!response.ok) {
        let message = 'Unable to update book status. Please try again.'
        try {
          const data: { error?: unknown } = await response.json()
          if (typeof data.error === 'string') message = data.error
        } catch {
          // Use the fallback message if the server response is not JSON.
        }
        setStatusError(message)
        return
      }

      let data: unknown
      try {
        data = await response.json()
      } catch {
        setStatusError('The server response did not confirm the requested status. Reload the book list.')
        return
      }

      if (
        !isRecord(data) ||
        !isRecord(data.book) ||
        data.book.bookId !== bookId ||
        data.book.status !== status
      ) {
        setStatusError('The server response did not confirm the requested status. Reload the book list.')
        return
      }

      setBooks((currentBooks) =>
        currentBooks.map((book) => (book.bookId === bookId ? { ...book, status } : book)),
      )
    } catch {
      setStatusError('Unable to update book status. Please try again.')
    } finally {
      setUpdatingBookId(null)
    }
  }

  function bookEditHasChanges(book: AdminBook): boolean {
    const sameIds = (left: number[], right: number[]) => {
      if (left.length !== right.length) return false
      const sortedRight = [...right].sort((a, b) => a - b)
      return [...left].sort((a, b) => a - b).every((id, index) => id === sortedRight[index])
    }
    const originalSubcategoryIds = book.mainCategories.flatMap((category) =>
      category.subcategories.map((subcategory) => subcategory.subcategoryId),
    )
    return (
      editingTitle.trim() !== book.title ||
      editingAuthor.trim() !== book.author ||
      !sameIds(editingMainCategoryIds, book.mainCategories.map((category) => category.mainCategoryId)) ||
      editingPrimaryMainCategoryId !== book.primaryMainCategoryId ||
      !sameIds(editingSubcategoryIds, originalSubcategoryIds)
    )
  }

  function startBookEdit(book: AdminBook) {
    setEditingBookId(book.bookId)
    setEditingTitle(book.title)
    setEditingAuthor(book.author)
    setEditingMainCategoryIds(book.mainCategories.map((category) => category.mainCategoryId))
    setEditingPrimaryMainCategoryId(book.primaryMainCategoryId)
    setEditingSubcategoryIds(
      book.mainCategories.flatMap((category) =>
        category.subcategories.map((subcategory) => subcategory.subcategoryId),
      ),
    )
    setBookEditFeedback(null)
  }

  function closeBookEdit(book: AdminBook) {
    if (
      bookEditHasChanges(book) &&
      !window.confirm('Discard unsaved changes to this book?')
    ) {
      return
    }
    setEditingBookId(null)
    setBookEditFeedback(null)
  }

  async function saveBookEdit(bookId: number) {
    if (savingBookEditIdsRef.current.has(bookId)) return
    const title = editingTitle.trim()
    const author = editingAuthor.trim()
    if (!title || title.length > 255) {
      setBookEditFeedback({ type: 'error', message: 'Enter a title of 1–255 characters.' })
      return
    }
    if (!author || author.length > 100) {
      setBookEditFeedback({ type: 'error', message: 'Enter an author of 1–100 characters.' })
      return
    }
    if (
      editingMainCategoryIds.length === 0 ||
      editingPrimaryMainCategoryId === null ||
      !editingMainCategoryIds.includes(editingPrimaryMainCategoryId)
    ) {
      setBookEditFeedback({
        type: 'error',
        message: 'Select at least one main category and choose its primary category.',
      })
      return
    }

    savingBookEditIdsRef.current.add(bookId)
    setSavingBookEditId(bookId)
    setBookEditFeedback(null)
    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          mainCategoryIds: editingMainCategoryIds,
          primaryMainCategoryId: editingPrimaryMainCategoryId,
          subcategoryIds: editingSubcategoryIds,
        }),
      })
      if (response.status === 401) {
        setSessionExpired(true)
        setBookEditFeedback({
          type: 'error',
          message: 'Your session has expired. Sign in again to manage books.',
        })
        return
      }
      if (!response.ok) {
        let message = 'Unable to save book changes. Please try again.'
        try {
          const data: { error?: unknown } = await response.json()
          if (typeof data.error === 'string') message = data.error
        } catch {
          message = 'Unable to save book changes. Please try again.'
        }
        setBookEditFeedback({ type: 'error', message })
        return
      }

      let data: unknown
      try {
        data = await response.json()
      } catch {
        setBookEditFeedback({
          type: 'error',
          message: 'The save may have completed, but the response could not be confirmed. Refresh the book list before retrying.',
        })
        setRetryCount((count) => count + 1)
        return
      }
      if (
        !isRecord(data) ||
        !isRecord(data.book) ||
        data.book.bookId !== bookId ||
        data.book.title !== title ||
        data.book.author !== author
      ) {
        setBookEditFeedback({
          type: 'error',
          message: 'The save may have completed, but the response did not confirm the changes. Refresh the book list before retrying.',
        })
        setRetryCount((count) => count + 1)
        return
      }

      setEditingBookId(null)
      setBookEditFeedback({ type: 'success', message: 'Book details and categories saved.' })
      setRetryCount((count) => count + 1)
    } catch {
      setBookEditFeedback({
        type: 'error',
        message: 'Unable to save book changes. Check the refreshed list before retrying.',
      })
      setRetryCount((count) => count + 1)
    } finally {
      savingBookEditIdsRef.current.delete(bookId)
      setSavingBookEditId(null)
    }
  }

  async function deleteBook(book: AdminBook) {
    if (deletingBookIdsRef.current.has(book.bookId)) return

    const confirmed = window.confirm(
      `Delete "${book.title}"?\n\nThis removes the book record and deletes its PDF only if no other book references it. A shared PDF will be kept. This action cannot be undone.`,
    )
    if (!confirmed) return

    deletingBookIdsRef.current.add(book.bookId)
    setDeletingBookIds((current) => [...current, book.bookId])
    setDeleteFeedback(null)

    try {
      const response = await fetch(`/api/admin/books/${book.bookId}`, { method: 'DELETE' })
      let data: unknown
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (response.status === 401) {
        setSessionExpired(true)
        setStatusError('Your session has expired. Sign in again to manage books.')
        return
      }

      if (!response.ok) {
        if (isRecord(data) && data.bookDeleted === true) {
          setRetryCount((count) => count + 1)
        }
        const message =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Unable to delete the book. Please try again.'
        setDeleteFeedback({ type: 'error', message })
        return
      }

      setRetryCount((count) => count + 1)
      if (!isRecord(data) || data.bookDeleted !== true || typeof data.message !== 'string') {
        setDeleteFeedback({
          type: 'error',
          message: 'The server did not confirm the deletion. The list was refreshed; verify the book before retrying.',
        })
        return
      }

      setDeleteFeedback({ type: 'success', message: data.message })
    } catch {
      setRetryCount((count) => count + 1)
      setDeleteFeedback({
        type: 'error',
        message: 'Unable to confirm deletion. The request may have completed; verify the refreshed list before retrying.',
      })
    } finally {
      deletingBookIdsRef.current.delete(book.bookId)
      setDeletingBookIds((current) => current.filter((id) => id !== book.bookId))
    }
  }

  async function uploadBookPdf(book: AdminBook, form: HTMLFormElement) {
    const fileInput = form.elements.namedItem('file')
    if (!(fileInput instanceof HTMLInputElement)) {
      setUploadFeedback((current) => ({
        ...current,
        [book.bookId]: { type: 'error', message: 'Select a PDF file to upload.' },
      }))
      return
    }

    const file = fileInput.files?.[0]
    if (!file || uploadingBookIdsRef.current.has(book.bookId)) return

    uploadingBookIdsRef.current.add(book.bookId)
    setUploadingBookIds((current) => [...current, book.bookId])
    setUploadFeedback((current) => {
      const next = { ...current }
      delete next[book.bookId]
      return next
    })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/admin/books/${book.bookId}/pdf`, {
        method: 'POST',
        body: formData,
      })

      let data: unknown
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (response.status === 401) {
        setSessionExpired(true)
        setUploadFeedback((current) => ({
          ...current,
          [book.bookId]: { type: 'error', message: 'Your session has expired. Sign in again to manage books.' },
        }))
        return
      }

      if (!response.ok) {
        const message =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Unable to upload the PDF. Please try again.'
        setUploadFeedback((current) => ({
          ...current,
          [book.bookId]: { type: 'error', message },
        }))
        return
      }

      if (!isRecord(data) || typeof data.message !== 'string') {
        setUploadFeedback((current) => ({
          ...current,
          [book.bookId]: { type: 'error', message: 'The server did not confirm the PDF upload.' },
        }))
        return
      }

      const successMessage = data.message
      setBooks((currentBooks) =>
        currentBooks.map((currentBook) =>
          currentBook.bookId === book.bookId ? { ...currentBook, hasPdf: true } : currentBook,
        ),
      )
      setUploadFeedback((current) => ({
        ...current,
        [book.bookId]: { type: 'success', message: successMessage },
      }))
    } catch {
      setUploadFeedback((current) => ({
        ...current,
        [book.bookId]: { type: 'error', message: 'Unable to upload the PDF. Please try again.' },
      }))
    } finally {
      form.reset()
      uploadingBookIdsRef.current.delete(book.bookId)
      setUploadingBookIds((current) => current.filter((id) => id !== book.bookId))
    }
  }

  async function addBookWithPdf(form: HTMLFormElement) {
    const titleInput = form.elements.namedItem('title')
    const authorInput = form.elements.namedItem('author')
    const categoryInput = form.elements.namedItem('category')
    const fileInput = form.elements.namedItem('file')

    if (
      !(titleInput instanceof HTMLInputElement) ||
      !(authorInput instanceof HTMLInputElement) ||
      !(categoryInput instanceof HTMLInputElement) ||
      !(fileInput instanceof HTMLInputElement)
    ) {
      setAddBookFeedback({ type: 'error', message: 'Complete all book fields and select a PDF.' })
      return
    }

    const title = titleInput.value.trim()
    const author = authorInput.value.trim()
    const category = categoryInput.value.trim()
    const file = fileInput.files?.[0]

    if (!title || title.length > 255) {
      setAddBookFeedback({ type: 'error', message: 'Enter a title of 1–255 characters.' })
      return
    }
    if (!author || author.length > 100) {
      setAddBookFeedback({ type: 'error', message: 'Enter an author of 1–100 characters.' })
      return
    }
    if (!category || category.length > 50) {
      setAddBookFeedback({ type: 'error', message: 'Enter a category of 1–50 characters.' })
      return
    }
    if (
      newMainCategoryIds.length === 0 ||
      newPrimaryMainCategoryId === null ||
      !newMainCategoryIds.includes(newPrimaryMainCategoryId)
    ) {
      setAddBookFeedback({
        type: 'error',
        message: 'Select at least one main category and choose its primary category.',
      })
      return
    }
    if (!file) {
      setAddBookFeedback({ type: 'error', message: 'Select a PDF file for the new book.' })
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setAddBookFeedback({ type: 'error', message: 'Choose a file with the .pdf extension.' })
      return
    }
    if (file.size === 0 || file.size > 25 * 1024 * 1024) {
      setAddBookFeedback({ type: 'error', message: 'The PDF must be non-empty and no larger than 25 MB.' })
      return
    }
    if (addingBookRef.current) return

    addingBookRef.current = true
    setAddingBook(true)
    setAddBookFeedback(null)

    try {
      const createResponse = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          category,
          mainCategoryIds: newMainCategoryIds,
          primaryMainCategoryId: newPrimaryMainCategoryId,
          subcategoryIds: newSubcategoryIds,
        }),
      })

      let createData: unknown
      try {
        createData = await createResponse.json()
      } catch {
        createData = null
      }

      if (createResponse.status === 401) {
        setSessionExpired(true)
        setAddBookFeedback({
          type: 'error',
          message: 'Your session has expired. Sign in again to add books.',
        })
        return
      }
      if (!createResponse.ok) {
        const message =
          isRecord(createData) && typeof createData.error === 'string'
            ? createData.error
            : 'Unable to create the book. Please try again.'
        setAddBookFeedback({ type: 'error', message })
        return
      }

      if (
        !isRecord(createData) ||
        !isRecord(createData.book) ||
        typeof createData.book.bookId !== 'number' ||
        !Number.isSafeInteger(createData.book.bookId) ||
        createData.book.bookId < 1 ||
        typeof createData.book.title !== 'string' ||
        createData.book.status !== 'Draft' ||
        createData.book.isDownloadable ||
        createData.book.hasPdf
      ) {
        setRetryCount((count) => count + 1)
        setAddBookFeedback({
          type: 'error',
          message: 'The book may have been created, but the server did not return a valid book ID. Refresh and check the list before trying again.',
        })
        return
      }

      const createdBook = createData.book
      setNewMainCategoryIds([])
      setNewPrimaryMainCategoryId(null)
      setNewSubcategoryIds([])
      const uploadData = new FormData()
      uploadData.append('file', file)

      let uploadFailure: string | null = null
      try {
        const uploadResponse = await fetch(`/api/admin/books/${createdBook.bookId}/pdf`, {
          method: 'POST',
          body: uploadData,
        })
        let responseData: unknown
        try {
          responseData = await uploadResponse.json()
        } catch {
          responseData = null
        }

        if (uploadResponse.status === 401) {
          setSessionExpired(true)
          uploadFailure = 'Your session expired before the PDF upload completed.'
        } else if (!uploadResponse.ok) {
          uploadFailure =
            isRecord(responseData) && typeof responseData.error === 'string'
              ? responseData.error
              : 'The PDF upload failed.'
        } else if (!isRecord(responseData) || typeof responseData.message !== 'string') {
          uploadFailure = 'The server did not confirm the PDF upload.'
        }
      } catch {
        uploadFailure = 'The PDF upload could not be confirmed because of a connection error.'
      }

      setRetryCount((count) => count + 1)
      form.reset()

      if (uploadFailure) {
        setAddBookFeedback({
          type: 'error',
          message: `Draft book #${createdBook.bookId} was created, but its PDF upload failed: ${uploadFailure} Find it in the list below and use that book card's Upload PDF control to retry.`,
        })
        return
      }

      setAddBookFeedback({
        type: 'success',
        message: `Book "${createdBook.title}" and its PDF were added successfully.`,
      })
    } catch {
      setAddBookFeedback({
        type: 'error',
        message: 'Unable to create the book. Please check the connection and try again.',
      })
    } finally {
      addingBookRef.current = false
      setAddingBook(false)
    }
  }

  if (activeSection === 'categories') {
    return (
      <AdminCategoryManagement
        onSessionExpired={onLogout}
        onBack={() => {
          setActiveSection('books')
          setRetryCount((count) => count + 1)
        }}
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-border pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Administration</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Book Management</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review book availability, category assignments, and publication status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('categories')}
            className="h-10 rounded-lg border border-border px-4 text-xs font-bold hover:bg-muted"
          >
            Manage Categories
          </button>
        </div>
      </div>

      {sessionExpired && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError || statusError}</span>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold hover:bg-amber-100"
          >
            Sign in again
          </button>
        </div>
      )}

      {statusError && !sessionExpired && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {statusError}
        </p>
      )}
      {bookEditFeedback && (
        <p
          role={bookEditFeedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border p-4 text-sm ${
            bookEditFeedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {bookEditFeedback.message}
        </p>
      )}

      {deleteFeedback && (
        <p
          role={deleteFeedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border p-4 text-sm ${
            deleteFeedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {deleteFeedback.message}
        </p>
      )}

      <form
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          void addBookWithPdf(event.currentTarget)
        }}
      >
        <h2 className="text-lg font-semibold">Add Book</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a separate Draft book record and upload its PDF.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Title
            <input
              name="title"
              type="text"
              maxLength={255}
              required
              disabled={addingBook}
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Author
            <input
              name="author"
              type="text"
              maxLength={100}
              required
              disabled={addingBook}
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Category
            <span className="ml-1 font-normal">(legacy label)</span>
            <input
              name="category"
              type="text"
              maxLength={50}
              required
              disabled={addingBook}
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <div className="sm:col-span-2">
            <BookCategorySelector
              categories={categories}
              mainCategoryIds={newMainCategoryIds}
              primaryMainCategoryId={newPrimaryMainCategoryId}
              subcategoryIds={newSubcategoryIds}
              onMainCategoryIdsChange={setNewMainCategoryIds}
              onPrimaryMainCategoryIdChange={setNewPrimaryMainCategoryId}
              onSubcategoryIdsChange={setNewSubcategoryIds}
              disabled={addingBook}
            />
          </div>
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
            PDF file
            <input
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              required
              disabled={addingBook}
              className="mt-1.5 block w-full cursor-pointer rounded-lg border border-input bg-background text-sm text-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={addingBook}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingBook && <Loader2 className="size-3.5 animate-spin" />}
            {addingBook ? 'Adding book...' : 'Add Book'}
          </button>
          {addBookFeedback && (
            <p
              role={addBookFeedback.type === 'error' ? 'alert' : 'status'}
              className={`text-sm ${
                addBookFeedback.type === 'error' ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {addBookFeedback.message}
            </p>
          )}
        </div>
      </form>

      {loadError && !sessionExpired ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-700">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div role="status" className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Loading books...
        </div>
      ) : sessionExpired ? null : books.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          No books have been added yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {books.map((book) => (
            <article key={book.bookId} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold">{book.title}</h2>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{book.author}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span>
                      Main categories: {book.mainCategories.map((category) => category.name).join(', ') || 'None'}
                    </span>
                    <span>Primary: {book.mainCategories.find((category) => category.mainCategoryId === book.primaryMainCategoryId)?.name ?? 'Unknown'}</span>
                    {book.mainCategories.some((category) => category.subcategories.length > 0) && (
                      <span>
                        Subcategories: {book.mainCategories.flatMap((category) => category.subcategories.map((subcategory) => subcategory.name)).join(', ')}
                      </span>
                    )}
                    <span>PDF: {book.hasPdf ? 'Available' : 'Not available'}</span>
                    <span>Download: {book.isDownloadable ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <label className="flex items-center justify-between gap-3 text-xs font-semibold md:min-w-48 md:flex-col md:items-start">
                  <span>Status</span>
                  <select
                    aria-label={`Status for ${book.title}`}
                    value={book.status}
                    disabled={updatingBookId !== null}
                    onChange={(event) => {
                      const status = event.target.value
                      if (isBookStatus(status)) void updateBookStatus(book.bookId, status)
                    }}
                    className="h-10 min-w-36 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                  >
                    {BOOK_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={savingBookEditId !== null}
                onClick={() => {
                  if (editingBookId === book.bookId) {
                    closeBookEdit(book)
                    return
                  }
                  const currentBook = books.find((item) => item.bookId === editingBookId)
                  if (
                    currentBook &&
                    bookEditHasChanges(currentBook) &&
                    !window.confirm('Discard unsaved changes to the current book?')
                  ) {
                    return
                  }
                  startBookEdit(book)
                }}
                className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"
              >
                {editingBookId === book.bookId ? 'Close Edit Book' : 'Edit Book'}
              </button>
              {editingBookId === book.bookId && (
                <form
                  className="mt-4 space-y-4 rounded-xl border border-border bg-muted/20 p-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveBookEdit(book.bookId)
                  }}
                >
                  <h3 className="font-semibold">Edit Book</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Title
                      <input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        maxLength={255}
                        required
                        disabled={savingBookEditId === book.bookId}
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Author
                      <input
                        value={editingAuthor}
                        onChange={(event) => setEditingAuthor(event.target.value)}
                        maxLength={100}
                        required
                        disabled={savingBookEditId === book.bookId}
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                  </div>
                  <BookCategorySelector
                    categories={categories}
                    mainCategoryIds={editingMainCategoryIds}
                    primaryMainCategoryId={editingPrimaryMainCategoryId}
                    subcategoryIds={editingSubcategoryIds}
                    onMainCategoryIdsChange={setEditingMainCategoryIds}
                    onPrimaryMainCategoryIdChange={setEditingPrimaryMainCategoryId}
                    onSubcategoryIdsChange={setEditingSubcategoryIds}
                    disabled={savingBookEditId === book.bookId}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={savingBookEditId === book.bookId}
                      className="h-10 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {savingBookEditId === book.bookId ? 'Saving changes…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      disabled={savingBookEditId === book.bookId}
                      onClick={() => closeBookEdit(book)}
                      className="h-10 rounded-lg border border-border px-4 text-xs font-semibold disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault()
                  void uploadBookPdf(book, event.currentTarget)
                }}
              >
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`pdf-upload-${book.bookId}`}
                    className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                  >
                    PDF file
                  </label>
                  <input
                    id={`pdf-upload-${book.bookId}`}
                    name="file"
                    type="file"
                    accept=".pdf,application/pdf"
                    aria-label={`Choose a PDF for ${book.title}`}
                    disabled={uploadingBookIds.includes(book.bookId)}
                    className="block w-full cursor-pointer rounded-lg border border-input bg-background text-sm text-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadingBookIds.includes(book.bookId)}
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 text-xs font-bold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingBookIds.includes(book.bookId) ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileUp className="size-3.5" />
                  )}
                  {uploadingBookIds.includes(book.bookId) ? 'Uploading...' : 'Upload PDF'}
                </button>
                {uploadFeedback[book.bookId] && (
                  <p
                    role={uploadFeedback[book.bookId].type === 'error' ? 'alert' : 'status'}
                    className={`text-xs ${
                      uploadFeedback[book.bookId].type === 'error'
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {uploadFeedback[book.bookId].message}
                  </p>
                )}
              </form>
              {updatingBookId === book.bookId && (
                <p role="status" className="mt-3 text-xs text-muted-foreground">Updating status...</p>
              )}
              <button
                type="button"
                onClick={() => void deleteBook(book)}
                disabled={deletingBookIds.includes(book.bookId)}
                className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingBookIds.includes(book.bookId) ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {deletingBookIds.includes(book.bookId) ? 'Deleting...' : 'Delete book'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
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
  const [adminBooks, setAdminBooks] = useState(false)
  const [profile, setProfile] = useState(false)
  const [denied, setDenied] = useState(false)
  const [reader, setReader] = useState<ReaderBook | null>(null)

  const canAccessPortal = !guest && user && user.role !== 'General_User' && user.role !== 'Guest'
  const canManageBooks = !guest && user?.role === 'Admin'
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
      setAdminBooks(false)
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
                  aria-pressed={!portal && !adminBooks}
                  onClick={() => {
                    setPortal(false)
                    setAdminBooks(false)
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 ${
                    !portal && !adminBooks ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  General E-Library
                </button>
                <button
                  aria-pressed={portal}
                  onClick={handlePortalSwitch}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 ${
                    portal ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  BrIU Academic Portal
                </button>
                {canManageBooks && (
                  <button
                    type="button"
                    aria-pressed={adminBooks}
                    onClick={() => {
                      setPortal(false)
                      setAdminBooks(true)
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 ${
                      adminBooks ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Admin Books
                  </button>
                )}
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
            {adminBooks && canManageBooks ? (
              <AdminBookManagement onLogout={onLogout} />
            ) : portal ? (
              <Portal user={user} onRead={setReader} />
            ) : (
              <Library onRead={setReader} />
            )}
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
