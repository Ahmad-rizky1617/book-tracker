import { useState, useEffect, useCallback } from "react"
import {
  BookOpen, Plus, Home, BarChart2, Quote, X,
  Clock, Calendar, BookMarked, Trash2, TrendingUp,
  Award, ArrowLeft, Save, Loader2, LogOut, User
} from "lucide-react"
import { supabase } from "./supabaseClient"
import Auth from "./Auth"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcSpeed(sessions = []) {
  const v = sessions.filter(s => s.pages_read > 0 && s.minutes > 0)
  if (!v.length) return null
  return v.reduce((a, b) => a + b.pages_read, 0) / v.reduce((a, b) => a + b.minutes, 0)
}
function timeLeft(book) {
  const sp = calcSpeed(book.sessions)
  if (!sp) return null
  return Math.ceil((book.total_pages - book.last_page) / sp)
}
function fmtMin(m) {
  if (m < 60) return `${m} mnt`
  const h = Math.floor(m / 60), r = m % 60
  return r > 0 ? `${h} jam ${r} mnt` : `${h} jam`
}

// ─── Circular Progress ─────────────────────────────────────────────────────────
function CircularProgress({ percent, size = 64, stroke = 6, color = "#f97316" }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  )
}

// ─── Genre Badge ───────────────────────────────────────────────────────────────
const GENRE_COLORS = {
  "Fiksi":     { bg: "#1e3a5f", text: "#60a5fa", dot: "#3b82f6" },
  "Non-Fiksi": { bg: "#1a3a2a", text: "#4ade80", dot: "#22c55e" },
  "Sains":     { bg: "#2d1f47", text: "#c084fc", dot: "#a855f7" },
  "Sejarah":   { bg: "#3d2000", text: "#fb923c", dot: "#f97316" },
  "Self-Help": { bg: "#1f2d3d", text: "#38bdf8", dot: "#0ea5e9" },
  "Biografi":  { bg: "#3d1f2d", text: "#f472b6", dot: "#ec4899" },
  "Teknologi": { bg: "#0f2d2d", text: "#2dd4bf", dot: "#14b8a6" },
  "Lainnya":   { bg: "#2d2d2d", text: "#94a3b8", dot: "#64748b" },
}
function GenreBadge({ genre }) {
  const c = GENRE_COLORS[genre] || GENRE_COLORS["Lainnya"]
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.dot}22` }}
      className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit">
      <span style={{ background: c.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
      {genre}
    </span>
  )
}

// ─── Input Field ───────────────────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600,
        letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f",
          borderRadius: 12, padding: "12px 14px", color: "#e2e8f0", fontSize: 15,
          outline: "none", boxSizing: "border-box" }} />
    </div>
  )
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ text = "Memuat..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", gap: 14 }}>
      <Loader2 size={32} style={{ color: "#f97316", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#475569", fontSize: 14 }}>{text}</p>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [books, setBooks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState("home")
  const [selectedBook, setSelectedBook]   = useState(null)
  const [quotesFolder, setQuotesFolder]   = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(null)
  const [showAddNote, setShowAddNote]         = useState(null)
  const COLORS = ["#f97316","#f59e0b","#22c55e","#3b82f6","#a855f7","#ec4899","#14b8a6","#ef4444"]

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch books when session ready ──
  const fetchBooks = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const uid = session.user.id

    const { data: booksData } = await supabase
      .from("books").select("*")
      .eq("user_id", uid).order("created_at", { ascending: false })

    if (!booksData) { setLoading(false); return }

    const { data: sessData } = await supabase
      .from("reading_sessions").select("*").eq("user_id", uid)

    const { data: notesData } = await supabase
      .from("notes").select("*").eq("user_id", uid)

    const enriched = booksData.map(b => ({
      ...b,
      sessions: (sessData || []).filter(s => s.book_id === b.id),
      notes:    (notesData || []).filter(n => n.book_id === b.id),
    }))
    setBooks(enriched)
    setLoading(false)
  }, [session])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  // ── Logout ──
  async function logout() {
    await supabase.auth.signOut()
    setBooks([])
    setTab("home")
  }

  // ── Add Book ──
  const [form, setForm] = useState({
    title: "", author: "", genre: "Fiksi",
    totalPages: "", purchaseDate: "", color: "#f97316"
  })
  async function addBook() {
    if (!form.title || !form.totalPages) return
    const { data, error } = await supabase.from("books").insert({
      user_id: session.user.id,
      title: form.title, author: form.author, genre: form.genre,
      total_pages: parseInt(form.totalPages), last_page: 0,
      color: form.color,
      purchase_date: form.purchaseDate || null,
    }).select().single()
    if (!error && data) {
      setBooks(p => [{ ...data, sessions: [], notes: [] }, ...p])
      setForm({ title: "", author: "", genre: "Fiksi", totalPages: "", purchaseDate: "", color: "#f97316" })
      setTab("home")
    }
  }

  // ── Update Progress ──
  const [upd, setUpd] = useState({ lastPage: "", sessionPages: "", sessionMinutes: "" })
  async function saveUpdate(book) {
    const newPage = upd.lastPage
      ? Math.min(parseInt(upd.lastPage), book.total_pages) : book.last_page
    await supabase.from("books").update({ last_page: newPage }).eq("id", book.id)
    if (upd.sessionPages && upd.sessionMinutes) {
      await supabase.from("reading_sessions").insert({
        book_id: book.id, user_id: session.user.id,
        pages_read: parseInt(upd.sessionPages),
        minutes: parseInt(upd.sessionMinutes),
      })
    }
    await fetchBooks()
    setShowUpdateModal(null)
    setUpd({ lastPage: "", sessionPages: "", sessionMinutes: "" })
  }

  // ── Add Note ──
  const [noteForm, setNoteForm] = useState({ page: "", text: "" })
  async function saveNote(bookId) {
    if (!noteForm.text) return
    await supabase.from("notes").insert({
      book_id: bookId, user_id: session.user.id,
      text: noteForm.text, page: parseInt(noteForm.page) || 0,
    })
    await fetchBooks()
    setShowAddNote(null)
    setNoteForm({ page: "", text: "" })
  }

  // ── Delete ──
  async function deleteNote(noteId) {
    await supabase.from("notes").delete().eq("id", noteId)
    await fetchBooks()
  }
  async function deleteBook(bookId) {
    await supabase.from("books").delete().eq("id", bookId)
    setBooks(p => p.filter(b => b.id !== bookId))
    setSelectedBook(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER GUARDS
  // ─────────────────────────────────────────────────────────────────────────
  if (session === undefined) return (
    <div style={{ background: "#080f1a", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <Spinner text="Memeriksa sesi..." />
    </div>
  )
  if (!session) return <Auth />

  const user       = session.user
  const email      = user.email
  const displayName = user.user_metadata?.full_name || email?.split("@")[0] || "User"

  const totalBooks     = books.length
  const doneBooks      = books.filter(b => b.last_page >= b.total_pages).length
  const readingBooks   = books.filter(b => b.last_page > 0 && b.last_page < b.total_pages).length
  const totalPagesRead = books.reduce((a, b) => a + b.last_page, 0)
  const avgSpeed = (() => {
    const all = books.flatMap(b => b.sessions || [])
    const s = calcSpeed(all)
    return s ? s.toFixed(1) : "—"
  })()

  const bookInUpdate = showUpdateModal ? books.find(b => b.id === showUpdateModal) : null

  // ─── Book Detail View ─────────────────────────────────────────────────────
  if (selectedBook) {
    const book = books.find(b => b.id === selectedBook)
    if (!book) { setSelectedBook(null); return null }
    const pct  = Math.min(Math.round((book.last_page / book.total_pages) * 100), 100)
    const spd  = calcSpeed(book.sessions)
    const tLeft = timeLeft(book)
    const done  = book.last_page >= book.total_pages

    return (
      <div style={{ background: "#080f1a", minHeight: "100vh", color: "#e2e8f0",
        fontFamily: "'DM Sans', sans-serif", maxWidth: 480, margin: "0 auto" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet" />
        <div style={{ padding: "48px 20px 20px", background: "linear-gradient(180deg,#0d1b2e,#080f1a)" }}>
          <button onClick={() => setSelectedBook(null)}
            style={{ background: "#1e293b", border: "none", color: "#94a3b8",
              borderRadius: 12, padding: "8px 14px", display: "flex",
              alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 20, fontSize: 14 }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0,
              background: `linear-gradient(135deg,${book.color}33,${book.color}11)`,
              border: `2px solid ${book.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={32} style={{ color: book.color }} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20,
                fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>{book.title}</h1>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 8px" }}>{book.author || "—"}</p>
              <GenreBadge genre={book.genre} />
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px 100px" }}>
          {/* Progress */}
          <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f",
            borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <CircularProgress percent={pct} size={80} stroke={7} color={book.color} />
                <div style={{ position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{pct}%</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", lineHeight: 1 }}>
                  {book.last_page}<span style={{ fontSize: 13, color: "#475569" }}>/{book.total_pages}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>halaman dibaca</div>
                {book.purchase_date && (
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 6,
                    display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={11} />
                    Dibeli: {new Date(book.purchase_date).toLocaleDateString("id-ID", { day:"numeric",month:"short",year:"numeric" })}
                  </div>
                )}
                {done && <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>✓ Selesai</span>}
              </div>
            </div>
            <div style={{ marginTop: 16, background: "#0a1628", borderRadius: 8, height: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: book.color, borderRadius: 8, transition: "width 0.6s" }} />
            </div>
          </div>

          {/* Speed cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "hal/menit", value: spd ? spd.toFixed(1) : "—", icon: <TrendingUp size={18} />, color: "#f97316" },
              { label: "estimasi sisa", value: tLeft ? fmtMin(tLeft) : "—", icon: <Clock size={18} />, color: "#3b82f6" },
            ].map(c => (
              <div key={c.label} style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 16 }}>
                <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{c.value}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Sessions */}
          {book.sessions.length > 0 && (
            <div style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Sesi Baca</h3>
              {book.sessions.map((s, i) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between",
                  padding: "8px 12px", background: "#0a1628", borderRadius: 10, marginBottom: 6 }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Sesi {i+1}</span>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>
                    {s.pages_read} hal • {s.minutes} mnt •{" "}
                    <span style={{ color: book.color }}>{(s.pages_read/s.minutes).toFixed(1)} hal/mnt</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Kutipan Favorit</h3>
              <button onClick={() => setShowAddNote(book.id)}
                style={{ background: "#1e3a5f", border: "none", color: "#60a5fa",
                  borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 4 }}>
                <Plus size={12} /> Tambah
              </button>
            </div>
            {book.notes.length === 0
              ? <p style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Belum ada catatan</p>
              : book.notes.map(n => (
                <div key={n.id} style={{ background: "#0a1628", borderLeft: `3px solid ${book.color}`,
                  borderRadius: "0 12px 12px 0", padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: book.color, fontSize: 11, fontWeight: 600 }}>Hal. {n.page || "?"}</span>
                    <button onClick={() => deleteNote(n.id)}
                      style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>"{n.text}"</p>
                </div>
              ))
            }
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setUpd({ lastPage: book.last_page.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id) }}
              style={{ flex: 1, background: book.color, border: "none", color: "#fff",
                borderRadius: 14, padding: "14px 0", fontWeight: 600, cursor: "pointer", fontSize: 15 }}>
              Update Progress
            </button>
            <button onClick={() => deleteBook(book.id)}
              style={{ background: "#1e293b", border: "1px solid #ef444433",
                color: "#ef4444", borderRadius: 14, padding: "14px 18px", cursor: "pointer" }}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {showAddNote && <NoteModal bookId={showAddNote} noteForm={noteForm}
          setNoteForm={setNoteForm} saveNote={saveNote} onClose={() => setShowAddNote(null)} books={books} />}
        {showUpdateModal && bookInUpdate && <UpdateModal book={bookInUpdate}
          upd={upd} setUpd={setUpd} saveUpdate={saveUpdate} onClose={() => setShowUpdateModal(null)} />}
      </div>
    )
  }

  // ─── Main Shell ───────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#080f1a", minHeight: "100vh", color: "#e2e8f0",
      fontFamily: "'DM Sans', sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet" />

      {/* ── HOME ── */}
      {tab === "home" && (
        <div>
          <div style={{ padding: "48px 20px 20px", background: "linear-gradient(180deg,#0d1b2e,#080f1a)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: "#475569", fontSize: 12, margin: "0 0 4px",
                  textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Selamat Membaca 📖</p>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26,
                  fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
                  Rak Buku<span style={{ color: "#f97316" }}>.</span>
                </h1>
              </div>
              {/* User info + logout */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600, margin: 0 }}>{displayName}</p>
                  <p style={{ color: "#334155", fontSize: 10, margin: 0 }}>{email}</p>
                </div>
                <button onClick={logout}
                  style={{ background: "#1e293b", border: "1px solid #334155",
                    color: "#94a3b8", borderRadius: 10, padding: "7px 10px",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <LogOut size={13} /> Keluar
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Total",  value: totalBooks,   icon: <BookMarked size={16} />, color: "#3b82f6" },
              { label: "Dibaca", value: readingBooks,  icon: <BookOpen size={16} />,   color: "#f97316" },
              { label: "Selesai",value: doneBooks,     icon: <Award size={16} />,      color: "#22c55e" },
            ].map(c => (
              <div key={c.label} style={{ background: "#0d1b2e", border: "1px solid #1e293b",
                borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ color: c.color, display: "flex", justifyContent: "center", marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>{c.value}</div>
                <div style={{ color: "#475569", fontSize: 11 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "0 20px" }}>
            {loading ? <Spinner text="Mengambil data buku..." /> : (
              <>
                {readingBooks > 0 && <>
                  <SectionLabel>Sedang Dibaca</SectionLabel>
                  {books.filter(b => b.last_page > 0 && b.last_page < b.total_pages).map(book => (
                    <BookCard key={book.id} book={book}
                      onOpen={() => setSelectedBook(book.id)}
                      onUpdate={() => { setUpd({ lastPage: book.last_page.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id) }} />
                  ))}
                </>}
                {books.filter(b => b.last_page === 0).length > 0 && <>
                  <SectionLabel>Belum Dimulai</SectionLabel>
                  {books.filter(b => b.last_page === 0).map(book => (
                    <BookCard key={book.id} book={book}
                      onOpen={() => setSelectedBook(book.id)}
                      onUpdate={() => { setUpd({ lastPage: book.last_page.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id) }} />
                  ))}
                </>}
                {doneBooks > 0 && <>
                  <SectionLabel>Selesai Dibaca</SectionLabel>
                  {books.filter(b => b.last_page >= b.total_pages).map(book => (
                    <BookCard key={book.id} book={book}
                      onOpen={() => setSelectedBook(book.id)}
                      onUpdate={() => { setUpd({ lastPage: book.last_page.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id) }} />
                  ))}
                </>}
                {books.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <p style={{ color: "#334155", fontSize: 15 }}>Belum ada buku.</p>
                    <p style={{ color: "#1e293b", fontSize: 13 }}>Tap "+ Tambah" untuk mulai.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ADD BOOK ── */}
      {tab === "add" && (
        <div style={{ padding: "52px 20px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26,
            fontWeight: 600, color: "#f1f5f9", marginBottom: 24 }}>
            Tambah Buku<span style={{ color: "#f97316" }}>.</span>
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InputField label="Judul Buku *" value={form.title} onChange={v => setForm(p => ({...p,title:v}))} placeholder="Masukkan judul..." />
            <InputField label="Penulis" value={form.author} onChange={v => setForm(p => ({...p,author:v}))} placeholder="Nama penulis..." />
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Genre</label>
              <select value={form.genre} onChange={e => setForm(p => ({...p,genre:e.target.value}))}
                style={{ width: "100%", background: "#0d1b2e", border: "1px solid #1e3a5f",
                  borderRadius: 12, padding: "12px 16px", color: "#e2e8f0",
                  fontSize: 15, outline: "none", appearance: "none" }}>
                {Object.keys(GENRE_COLORS).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <InputField label="Jumlah Halaman *" type="number" value={form.totalPages} onChange={v => setForm(p => ({...p,totalPages:v}))} placeholder="320" />
            <InputField label="Tanggal Dibeli" type="date" value={form.purchaseDate} onChange={v => setForm(p => ({...p,purchaseDate:v}))} />
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Warna</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({...p,color:c}))}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: c,
                      border: form.color === c ? "3px solid #fff" : "3px solid transparent",
                      cursor: "pointer" }} />
                ))}
              </div>
            </div>
            <button onClick={addBook}
              style={{ background: "#f97316", border: "none", color: "#fff",
                borderRadius: 14, padding: "16px 0", fontWeight: 700,
                cursor: "pointer", fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
              <Plus size={20} /> Simpan Buku
            </button>
          </div>
        </div>
      )}

      {/* ── QUOTES — Folder List ── */}
      {tab === "quotes" && !quotesFolder && (
        <div style={{ padding: "52px 20px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26,
            fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>
            Kutipan Favorit<span style={{ color: "#f97316" }}>.</span>
          </h1>
          <p style={{ color: "#475569", fontSize: 13, marginBottom: 24 }}>Pilih buku untuk lihat kutipannya</p>
          {loading ? <Spinner /> : books.length === 0
            ? <p style={{ color: "#334155", textAlign: "center", marginTop: 60 }}>Belum ada buku.</p>
            : books.map(book => (
              <button key={book.id} onClick={() => setQuotesFolder(book.id)}
                style={{ background: "#0d1b2e", border: `1px solid ${book.color}33`,
                  borderRadius: 18, padding: 18, cursor: "pointer",
                  textAlign: "left", width: "100%", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: `${book.color}22`, border: `1.5px solid ${book.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Quote size={20} style={{ color: book.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600,
                      margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {book.title}
                    </p>
                    <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
                      {book.notes.length === 0 ? "Belum ada kutipan" : `${book.notes.length} kutipan`}
                    </p>
                  </div>
                  <ArrowLeft size={16} style={{ color: "#334155", transform: "rotate(180deg)" }} />
                </div>
              </button>
            ))
          }
        </div>
      )}

      {/* ── QUOTES — Inside Folder ── */}
      {tab === "quotes" && quotesFolder && (() => {
        const book = books.find(b => b.id === quotesFolder)
        if (!book) { setQuotesFolder(null); return null }
        return (
          <div style={{ padding: "52px 20px 20px" }}>
            <button onClick={() => setQuotesFolder(null)}
              style={{ background: "#1e293b", border: "none", color: "#94a3b8",
                borderRadius: 12, padding: "8px 14px", display: "flex",
                alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 20, fontSize: 14 }}>
              <ArrowLeft size={16} /> Semua Buku
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22,
                  fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>{book.title}</h1>
                <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{book.notes.length} kutipan</p>
              </div>
              <button onClick={() => setShowAddNote(book.id)}
                style={{ background: book.color, border: "none", color: "#fff",
                  borderRadius: 12, padding: "8px 14px", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={15} /> Tambah
              </button>
            </div>
            {book.notes.length === 0
              ? <p style={{ color: "#334155", textAlign: "center", marginTop: 60 }}>Belum ada kutipan.</p>
              : book.notes.map(n => (
                <div key={n.id} style={{ background: "#0d1b2e", borderLeft: `4px solid ${book.color}`,
                  borderRadius: "0 16px 16px 0", padding: 18, marginBottom: 12 }}>
                  <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7,
                    fontStyle: "italic", margin: "0 0 10px" }}>"{n.text}"</p>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: book.color, fontSize: 11, fontWeight: 600 }}>Hal. {n.page || "?"}</span>
                    <button onClick={() => deleteNote(n.id)}
                      style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", padding: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )
      })()}

      {/* ── STATS ── */}
      {tab === "stats" && (
        <div style={{ padding: "52px 20px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26,
            fontWeight: 600, color: "#f1f5f9", marginBottom: 24 }}>
            Statistik<span style={{ color: "#f97316" }}>.</span>
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Halaman", value: totalPagesRead.toLocaleString(), icon: <BookOpen size={18} />, color: "#f97316" },
              { label: "Kec. Rata-rata", value: `${avgSpeed} hal/mnt`, icon: <TrendingUp size={18} />, color: "#3b82f6" },
              { label: "Buku Selesai",   value: doneBooks, icon: <Award size={18} />, color: "#22c55e" },
              { label: "Total Kutipan",  value: books.reduce((a,b) => a+b.notes.length,0), icon: <Quote size={18} />, color: "#a855f7" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 18, padding: 18 }}>
                <div style={{ color: s.color, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{s.value}</div>
                <div style={{ color: "#475569", fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <h2 style={{ color: "#475569", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Progress Per Buku</h2>
          {loading ? <Spinner /> : books.map(book => {
            const pct = Math.min(Math.round((book.last_page/book.total_pages)*100), 100)
            const tl  = timeLeft(book)
            return (
              <div key={book.id} style={{ background: "#0d1b2e", border: "1px solid #1e293b",
                borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{book.title}</span>
                  <span style={{ color: book.color, fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ background: "#0a1628", borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: book.color, borderRadius: 6 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ color: "#475569", fontSize: 11 }}>{book.last_page}/{book.total_pages} hal</span>
                  {tl && <span style={{ color: "#475569", fontSize: 11 }}>~{fmtMin(tl)} lagi</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "#0d1b2eee",
        backdropFilter: "blur(16px)", borderTop: "1px solid #1e293b",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 18px", zIndex: 100 }}>
        {[
          { id: "home",   icon: <Home size={22} />,     label: "Home" },
          { id: "add",    icon: <Plus size={22} />,     label: "Tambah" },
          { id: "quotes", icon: <Quote size={22} />,    label: "Kutipan" },
          { id: "stats",  icon: <BarChart2 size={22} />, label: "Statistik" },
        ].map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); if (t.id !== "quotes") setQuotesFolder(null) }}
            style={{ background: "none", border: "none", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 4,
              cursor: "pointer", padding: "4px 16px" }}>
            <span style={{ color: tab === t.id ? "#f97316" : "#475569" }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600,
              color: tab === t.id ? "#f97316" : "#475569" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      {showUpdateModal && bookInUpdate && (
        <UpdateModal book={bookInUpdate} upd={upd} setUpd={setUpd}
          saveUpdate={saveUpdate} onClose={() => setShowUpdateModal(null)} />
      )}
      {showAddNote && (
        <NoteModal bookId={showAddNote} noteForm={noteForm} setNoteForm={setNoteForm}
          saveNote={saveNote} onClose={() => setShowAddNote(null)} books={books} />
      )}
    </div>
  )
}

// ─── Helper Components ────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <h2 style={{ color: "#475569", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, marginTop: 4 }}>{children}</h2>
}

function BookCard({ book, onOpen, onUpdate }) {
  const pct   = Math.min(Math.round((book.last_page / book.total_pages) * 100), 100)
  const tLeft = timeLeft(book)
  const done  = book.last_page >= book.total_pages
  return (
    <div onClick={onOpen} style={{ background: "#0d1b2e", border: `1px solid ${book.color}22`,
      borderRadius: 20, padding: 18, marginBottom: 12, cursor: "pointer" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CircularProgress percent={pct} size={60} stroke={5} color={book.color} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#f1f5f9" }}>{pct}%</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", color: "#f1f5f9",
            fontSize: 15, fontWeight: 600, margin: "0 0 2px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</h3>
          <p style={{ color: "#475569", fontSize: 12, margin: "0 0 6px" }}>{book.author || "—"}</p>
          <GenreBadge genre={book.genre} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{book.last_page}/{book.total_pages} hal</span>
            {tLeft && !done && <span style={{ color: "#475569", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} /> ~{fmtMin(tLeft)}</span>}
            {done && <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>✓ Selesai</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onUpdate() }}
          style={{ background: `${book.color}22`, border: `1px solid ${book.color}44`,
            color: book.color, borderRadius: 10, padding: "6px 12px",
            fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
          Update
        </button>
      </div>
      <div style={{ marginTop: 14, background: "#0a1628", borderRadius: 6, height: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg,${book.color},${book.color}88)`,
          borderRadius: 6, transition: "width 0.6s" }} />
      </div>
    </div>
  )
}

function UpdateModal({ book, upd, setUpd, saveUpdate, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#0d1b2e", border: "1px solid #1e3a5f",
          borderRadius: "24px 24px 0 0", padding: "24px 20px 40px",
          width: "100%", maxWidth: 480 }}>
        <div style={{ width: 40, height: 4, background: "#1e3a5f", borderRadius: 2, margin: "0 auto 20px" }} />
        <h3 style={{ fontFamily: "'Playfair Display',serif", color: "#f1f5f9", fontSize: 20, marginBottom: 20 }}>
          Update: {book.title}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Halaman Terakhir" type="number" value={upd.lastPage}
            onChange={v => setUpd(p => ({...p,lastPage:v}))} placeholder={`Maks ${book.total_pages}`} />
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 14 }}>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 10 }}>Sesi baca kali ini (opsional):</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField label="Halaman Dibaca" type="number" value={upd.sessionPages}
                onChange={v => setUpd(p => ({...p,sessionPages:v}))} placeholder="20" />
              <InputField label="Durasi (menit)" type="number" value={upd.sessionMinutes}
                onChange={v => setUpd(p => ({...p,sessionMinutes:v}))} placeholder="10" />
            </div>
          </div>
          <button onClick={() => saveUpdate(book)}
            style={{ background: book.color, border: "none", color: "#fff",
              borderRadius: 14, padding: "15px 0", fontWeight: 700,
              cursor: "pointer", fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Save size={18} /> Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

function NoteModal({ bookId, noteForm, setNoteForm, saveNote, onClose, books }) {
  const book = books.find(b => b.id === bookId)
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#0d1b2e", border: "1px solid #1e3a5f",
          borderRadius: "24px 24px 0 0", padding: "24px 20px 40px",
          width: "100%", maxWidth: 480 }}>
        <div style={{ width: 40, height: 4, background: "#1e3a5f", borderRadius: 2, margin: "0 auto 20px" }} />
        <h3 style={{ fontFamily: "'Playfair Display',serif", color: "#f1f5f9", fontSize: 20, marginBottom: 20 }}>
          Tambah Kutipan {book ? `— ${book.title}` : ""}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InputField label="Nomor Halaman" type="number" value={noteForm.page}
            onChange={v => setNoteForm(p => ({...p,page:v}))} placeholder="45" />
          <div>
            <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Kutipan *
            </label>
            <textarea value={noteForm.text} onChange={e => setNoteForm(p => ({...p,text:e.target.value}))}
              placeholder="Tulis kalimat favoritmu..."
              style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f",
                borderRadius: 12, padding: "12px 14px", color: "#e2e8f0",
                fontSize: 14, outline: "none", resize: "none",
                height: 100, lineHeight: 1.6, boxSizing: "border-box" }} />
          </div>
          <button onClick={() => saveNote(bookId)}
            style={{ background: "#f97316", border: "none", color: "#fff",
              borderRadius: 14, padding: "15px 0", fontWeight: 700,
              cursor: "pointer", fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Plus size={18} /> Simpan Kutipan
          </button>
        </div>
      </div>
    </div>
  )
}
