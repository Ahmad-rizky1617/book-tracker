import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Plus, Home, BarChart2, Quote, ChevronRight,
  X, Check, Clock, Calendar, BookMarked, Trash2,
  ChevronDown, ChevronUp, Star, Edit3, TrendingUp,
  Target, Flame, Award, ArrowLeft, Save
} from "lucide-react";

// ─── Circular Progress ───────────────────────────────────────────────────────
function CircularProgress({ percent, size = 64, stroke = 6, color = "#f97316" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

// ─── Genre Badge ─────────────────────────────────────────────────────────────
const GENRE_COLORS = {
  "Fiksi": { bg: "#1e3a5f", text: "#60a5fa", dot: "#3b82f6" },
  "Non-Fiksi": { bg: "#1a3a2a", text: "#4ade80", dot: "#22c55e" },
  "Sains": { bg: "#2d1f47", text: "#c084fc", dot: "#a855f7" },
  "Sejarah": { bg: "#3d2000", text: "#fb923c", dot: "#f97316" },
  "Self-Help": { bg: "#1f2d3d", text: "#38bdf8", dot: "#0ea5e9" },
  "Biografi": { bg: "#3d1f2d", text: "#f472b6", dot: "#ec4899" },
  "Teknologi": { bg: "#0f2d2d", text: "#2dd4bf", dot: "#14b8a6" },
  "Lainnya": { bg: "#2d2d2d", text: "#94a3b8", dot: "#64748b" },
};
function GenreBadge({ genre }) {
  const c = GENRE_COLORS[genre] || GENRE_COLORS["Lainnya"];
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.dot}22` }}
      className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit">
      <span style={{ background: c.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
      {genre}
    </span>
  );
}

// ─── Reading Speed Calc ───────────────────────────────────────────────────────
function calcReadingSpeed(sessions) {
  const valid = sessions.filter(s => s.pages > 0 && s.minutes > 0);
  if (!valid.length) return null;
  const totalPages = valid.reduce((a, b) => a + b.pages, 0);
  const totalMin = valid.reduce((a, b) => a + b.minutes, 0);
  return totalPages / totalMin; // pages/menit
}
function estimateTimeLeft(book) {
  const speed = calcReadingSpeed(book.sessions || []);
  if (!speed) return null;
  const pagesLeft = book.totalPages - book.lastPage;
  return Math.ceil(pagesLeft / speed); // menit
}
function formatMinutes(min) {
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_BOOKS = [
  {
    id: 1, title: "Atomic Habits", author: "James Clear",
    genre: "Self-Help", totalPages: 320, lastPage: 187,
    purchaseDate: "2024-12-01",
    sessions: [{ pages: 20, minutes: 10 }, { pages: 35, minutes: 18 }],
    notes: [
      { id: 1, page: 45, text: "You do not rise to the level of your goals. You fall to the level of your systems." },
      { id: 2, page: 112, text: "Every action you take is a vote for the type of person you wish to become." }
    ],
    color: "#f97316"
  },
  {
    id: 2, title: "Sapiens", author: "Yuval Noah Harari",
    genre: "Sejarah", totalPages: 512, lastPage: 89,
    purchaseDate: "2025-01-15",
    sessions: [{ pages: 30, minutes: 20 }],
    notes: [{ id: 1, page: 12, text: "Culture tends to argue that it forbids only that which is unnatural." }],
    color: "#f59e0b"
  },
  {
    id: 3, title: "Deep Work", author: "Cal Newport",
    genre: "Self-Help", totalPages: 296, lastPage: 296,
    purchaseDate: "2024-11-10",
    sessions: [{ pages: 40, minutes: 22 }, { pages: 50, minutes: 28 }],
    notes: [{ id: 1, page: 55, text: "Clarity about what matters provides clarity about what does not." }],
    color: "#6366f1"
  }
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BookTracker() {
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [tab, setTab] = useState("home");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(null); // book id
  const [expandedBook, setExpandedBook] = useState(null);
  const [showAddNote, setShowAddNote] = useState(null); // book id
  const [selectedBook, setSelectedBook] = useState(null); // for detail view
  const [quotesFolder, setQuotesFolder] = useState(null); // book id for quotes folder view

  // ── Stats ──
  const totalBooks = books.length;
  const doneBooks = books.filter(b => b.lastPage >= b.totalPages).length;
  const readingBooks = books.filter(b => b.lastPage > 0 && b.lastPage < b.totalPages).length;
  const totalPagesRead = books.reduce((a, b) => a + b.lastPage, 0);
  const avgSpeed = (() => {
    const all = books.flatMap(b => b.sessions || []);
    const s = calcReadingSpeed(all);
    return s ? s.toFixed(1) : "—";
  })();

  // ── Add Book ──
  const [form, setForm] = useState({ title: "", author: "", genre: "Fiksi", totalPages: "", purchaseDate: "", color: "#f97316" });
  const COLORS = ["#f97316","#f59e0b","#22c55e","#3b82f6","#a855f7","#ec4899","#14b8a6","#ef4444"];

  function addBook() {
    if (!form.title || !form.totalPages) return;
    const nb = {
      id: Date.now(), title: form.title, author: form.author,
      genre: form.genre, totalPages: parseInt(form.totalPages),
      lastPage: 0, purchaseDate: form.purchaseDate,
      sessions: [], notes: [], color: form.color
    };
    setBooks(p => [nb, ...p]);
    setForm({ title: "", author: "", genre: "Fiksi", totalPages: "", purchaseDate: "", color: "#f97316" });
    setShowAddBook(false);
    setTab("home");
  }

  // ── Update Progress ──
  const [upd, setUpd] = useState({ lastPage: "", sessionPages: "", sessionMinutes: "" });
  function saveUpdate(book) {
    setBooks(p => p.map(b => {
      if (b.id !== book.id) return b;
      const newPage = upd.lastPage ? Math.min(parseInt(upd.lastPage), b.totalPages) : b.lastPage;
      const newSessions = (upd.sessionPages && upd.sessionMinutes)
        ? [...b.sessions, { pages: parseInt(upd.sessionPages), minutes: parseInt(upd.sessionMinutes) }]
        : b.sessions;
      return { ...b, lastPage: newPage, sessions: newSessions };
    }));
    setShowUpdateModal(null);
    setUpd({ lastPage: "", sessionPages: "", sessionMinutes: "" });
  }

  // ── Add Note ──
  const [noteForm, setNoteForm] = useState({ page: "", text: "" });
  function saveNote(bookId) {
    if (!noteForm.text) return;
    setBooks(p => p.map(b => b.id !== bookId ? b : {
      ...b, notes: [...b.notes, { id: Date.now(), page: parseInt(noteForm.page) || 0, text: noteForm.text }]
    }));
    setShowAddNote(null);
    setNoteForm({ page: "", text: "" });
  }
  function deleteNote(bookId, noteId) {
    setBooks(p => p.map(b => b.id !== bookId ? b : { ...b, notes: b.notes.filter(n => n.id !== noteId) }));
  }
  function deleteBook(bookId) {
    setBooks(p => p.filter(b => b.id !== bookId));
    setSelectedBook(null);
  }

  const bookInUpdate = showUpdateModal ? books.find(b => b.id === showUpdateModal) : null;

  // ── Book Detail View ──
  if (selectedBook) {
    const book = books.find(b => b.id === selectedBook);
    if (!book) { setSelectedBook(null); return null; }
    const pct = Math.round((book.lastPage / book.totalPages) * 100);
    const speed = calcReadingSpeed(book.sessions || []);
    const timeLeft = estimateTimeLeft(book);
    const done = book.lastPage >= book.totalPages;

    return (
      <div style={{ background: "#080f1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet" />
        {/* Header */}
        <div style={{ padding: "48px 20px 20px", background: "linear-gradient(180deg, #0d1b2e 0%, #080f1a 100%)" }}>
          <button onClick={() => setSelectedBook(null)} style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 20, fontSize: 14 }}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 80, height: 80, borderRadius: 16, background: `linear-gradient(135deg, ${book.color}33, ${book.color}11)`, border: `2px solid ${book.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BookOpen size={32} style={{ color: book.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>{book.title}</h1>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 8px" }}>{book.author || "Penulis tidak diketahui"}</p>
              <GenreBadge genre={book.genre} />
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px 100px" }}>
          {/* Progress Card */}
          <div style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Progress Baca</span>
              {done && <span style={{ background: "#14532d", color: "#4ade80", fontSize: 12, padding: "2px 10px", borderRadius: 20, border: "1px solid #22c55e44" }}>✓ Selesai</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative" }}>
                <CircularProgress percent={pct} size={80} stroke={7} color={book.color} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{pct}%</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", lineHeight: 1 }}>{book.lastPage}<span style={{ fontSize: 14, color: "#475569", fontWeight: 400 }}>/{book.totalPages}</span></div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>halaman dibaca</div>
                {book.purchaseDate && <div style={{ color: "#475569", fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> Dibeli: {new Date(book.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>}
              </div>
            </div>
            <div style={{ marginTop: 16, background: "#0a1628", borderRadius: 8, overflow: "hidden", height: 8 }}>
              <div style={{ height: "100%", background: `linear-gradient(90deg, ${book.color}, ${book.color}aa)`, width: `${pct}%`, borderRadius: 8, transition: "width 0.6s ease" }} />
            </div>
          </div>

          {/* Reading Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#f97316", marginBottom: 8 }}><TrendingUp size={18} /></div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{speed ? speed.toFixed(1) : "—"}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>hal/menit</div>
            </div>
            <div style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#3b82f6", marginBottom: 8 }}><Clock size={18} /></div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{timeLeft ? formatMinutes(timeLeft) : "—"}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>estimasi sisa</div>
            </div>
          </div>

          {/* Reading Sessions */}
          {book.sessions.length > 0 && (
            <div style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Sesi Baca</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {book.sessions.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0a1628", borderRadius: 10 }}>
                    <span style={{ color: "#64748b", fontSize: 13 }}>Sesi {i + 1}</span>
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>{s.pages} hal • {s.minutes} mnt • <span style={{ color: book.color }}>{(s.pages / s.minutes).toFixed(1)} hal/mnt</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Catatan Favorit</h3>
              <button onClick={() => setShowAddNote(book.id)} style={{ background: "#1e3a5f", border: "none", color: "#60a5fa", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <Plus size={12} /> Tambah
              </button>
            </div>
            {book.notes.length === 0 ? (
              <p style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Belum ada catatan</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {book.notes.map(n => (
                  <div key={n.id} style={{ background: "#0a1628", borderLeft: `3px solid ${book.color}`, borderRadius: "0 12px 12px 0", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: book.color, fontSize: 11, fontWeight: 600 }}>Hal. {n.page || "?"}</span>
                      <button onClick={() => deleteNote(book.id, n.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0 }}><Trash2 size={13} /></button>
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>"{n.text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setUpd({ lastPage: book.lastPage.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id); }} style={{ flex: 1, background: book.color, border: "none", color: "#fff", borderRadius: 14, padding: "14px 0", fontWeight: 600, cursor: "pointer", fontSize: 15 }}>Update Progress</button>
            <button onClick={() => deleteBook(book.id)} style={{ background: "#1e293b", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 14, padding: "14px 18px", cursor: "pointer", fontSize: 15 }}><Trash2 size={18} /></button>
          </div>
        </div>

        {/* Add Note Modal */}
        {showAddNote && <NoteModal bookId={showAddNote} noteForm={noteForm} setNoteForm={setNoteForm} saveNote={saveNote} onClose={() => setShowAddNote(null)} books={books} />}
        {/* Update Modal */}
        {showUpdateModal && bookInUpdate && <UpdateModal book={bookInUpdate} upd={upd} setUpd={setUpd} saveUpdate={saveUpdate} onClose={() => setShowUpdateModal(null)} />}
      </div>
    );
  }

  return (
    <div style={{ background: "#080f1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet" />

      {/* ── HOME TAB ── */}
      {tab === "home" && (
        <div>
          {/* Header */}
          <div style={{ padding: "52px 20px 20px", background: "linear-gradient(180deg, #0d1b2e 0%, #080f1a 100%)" }}>
            <p style={{ color: "#475569", fontSize: 13, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Selamat Membaca 📖</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Rak Buku<span style={{ color: "#f97316" }}>.</span></h1>
          </div>

          {/* Summary Cards */}
          <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Total", value: totalBooks, icon: <BookMarked size={16} />, color: "#3b82f6" },
              { label: "Dibaca", value: readingBooks, icon: <BookOpen size={16} />, color: "#f97316" },
              { label: "Selesai", value: doneBooks, icon: <Award size={16} />, color: "#22c55e" },
            ].map(c => (
              <div key={c.label} style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ color: c.color, display: "flex", justifyContent: "center", marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>{c.value}</div>
                <div style={{ color: "#475569", fontSize: 11, fontWeight: 500 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Currently Reading */}
          <div style={{ padding: "0 20px" }}>
            {readingBooks > 0 && (
              <>
                <h2 style={{ color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Sedang Dibaca</h2>
                {books.filter(b => b.lastPage > 0 && b.lastPage < b.totalPages).map(book => (
                  <BookCard key={book.id} book={book} onOpen={() => setSelectedBook(book.id)} onUpdate={() => { setUpd({ lastPage: book.lastPage.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id); }} />
                ))}
              </>
            )}

            {books.filter(b => b.lastPage === 0).length > 0 && (
              <>
                <h2 style={{ color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, marginTop: 4 }}>Belum Dimulai</h2>
                {books.filter(b => b.lastPage === 0).map(book => (
                  <BookCard key={book.id} book={book} onOpen={() => setSelectedBook(book.id)} onUpdate={() => { setUpd({ lastPage: book.lastPage.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id); }} />
                ))}
              </>
            )}

            {doneBooks > 0 && (
              <>
                <h2 style={{ color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, marginTop: 4 }}>Selesai Dibaca</h2>
                {books.filter(b => b.lastPage >= b.totalPages).map(book => (
                  <BookCard key={book.id} book={book} onOpen={() => setSelectedBook(book.id)} onUpdate={() => { setUpd({ lastPage: book.lastPage.toString(), sessionPages: "", sessionMinutes: "" }); setShowUpdateModal(book.id); }} />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ADD BOOK TAB ── */}
      {tab === "add" && (
        <div style={{ padding: "52px 20px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: "#f1f5f9", marginBottom: 24 }}>Tambah Buku<span style={{ color: "#f97316" }}>.</span></h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InputField label="Judul Buku *" value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="Masukkan judul..." />
            <InputField label="Penulis" value={form.author} onChange={v => setForm(p => ({ ...p, author: v }))} placeholder="Nama penulis..." />
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Genre</label>
              <select value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
                style={{ width: "100%", background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "12px 16px", color: "#e2e8f0", fontSize: 15, outline: "none", appearance: "none" }}>
                {Object.keys(GENRE_COLORS).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <InputField label="Jumlah Halaman *" type="number" value={form.totalPages} onChange={v => setForm(p => ({ ...p, totalPages: v }))} placeholder="320" />
            <InputField label="Tanggal Dibeli" type="date" value={form.purchaseDate} onChange={v => setForm(p => ({ ...p, purchaseDate: v }))} />
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Warna</label>
              <div style={{ display: "flex", gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: form.color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer", transition: "border 0.2s" }} />
                ))}
              </div>
            </div>
            <button onClick={addBook} style={{ background: "#f97316", border: "none", color: "#fff", borderRadius: 14, padding: "16px 0", fontWeight: 700, cursor: "pointer", fontSize: 16, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Plus size={20} /> Simpan Buku
            </button>
          </div>
        </div>
      )}

      {/* ── QUOTES TAB — Folder List ── */}
      {tab === "quotes" && !quotesFolder && (
        <div style={{ padding: "52px 20px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>Kutipan Favorit<span style={{ color: "#f97316" }}>.</span></h1>
          <p style={{ color: "#475569", fontSize: 13, marginBottom: 24 }}>Pilih buku untuk lihat kutipannya</p>

          {books.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <p style={{ color: "#334155", fontSize: 15 }}>Belum ada buku. Tambah buku dulu di tab Tambah.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {books.map(book => (
                <button key={book.id} onClick={() => setQuotesFolder(book.id)}
                  style={{ background: "#0d1b2e", border: `1px solid ${book.color}33`, borderRadius: 18, padding: 18, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Folder icon with book color */}
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${book.color}33, ${book.color}11)`, border: `1.5px solid ${book.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Quote size={20} style={{ color: book.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</p>
                      <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
                        {book.notes.length === 0 ? "Belum ada kutipan" : `${book.notes.length} kutipan tersimpan`}
                      </p>
                    </div>
                    <ChevronRight size={18} style={{ color: "#334155", flexShrink: 0 }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QUOTES TAB — Inside Folder ── */}
      {tab === "quotes" && quotesFolder && (() => {
        const book = books.find(b => b.id === quotesFolder);
        if (!book) { setQuotesFolder(null); return null; }
        return (
          <div style={{ padding: "52px 20px 20px" }}>
            {/* Header */}
            <button onClick={() => setQuotesFolder(null)}
              style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 20, fontSize: 14 }}>
              <ArrowLeft size={16} /> Semua Buku
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: "#f1f5f9", margin: "0 0 4px" }}>{book.title}</h1>
                <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{book.notes.length} kutipan</p>
              </div>
              <button onClick={() => setShowAddNote(book.id)}
                style={{ background: book.color, border: "none", color: "#fff", borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <Plus size={15} /> Tambah
              </button>
            </div>

            {/* Quotes list */}
            {book.notes.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: 60 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${book.color}22`, border: `1.5px solid ${book.color}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Quote size={24} style={{ color: book.color }} />
                </div>
                <p style={{ color: "#334155", fontSize: 15, marginBottom: 16 }}>Belum ada kutipan untuk buku ini.</p>
                <button onClick={() => setShowAddNote(book.id)}
                  style={{ background: "#0d1b2e", border: `1px solid ${book.color}44`, color: book.color, borderRadius: 12, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}>
                  + Tambah Kutipan Pertama
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {book.notes.map((n, i) => (
                  <div key={n.id} style={{ background: "#0d1b2e", borderLeft: `4px solid ${book.color}`, borderRadius: "0 16px 16px 0", padding: 18 }}>
                    <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.75, fontStyle: "italic", margin: "0 0 12px" }}>"{n.text}"</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: book.color, fontSize: 11, fontWeight: 600 }}>Hal. {n.page || "?"}</span>
                      <button onClick={() => deleteNote(book.id, n.id)}
                        style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", padding: 4, display: "flex", borderRadius: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── STATS TAB ── */}
      {tab === "stats" && (
        <div style={{ padding: "52px 20px 20px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, color: "#f1f5f9", marginBottom: 24 }}>Statistik<span style={{ color: "#f97316" }}>.</span></h1>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Halaman Dibaca", value: totalPagesRead.toLocaleString(), icon: <BookOpen size={18} />, color: "#f97316" },
              { label: "Kecepatan Rata-rata", value: `${avgSpeed} hal/mnt`, icon: <TrendingUp size={18} />, color: "#3b82f6" },
              { label: "Buku Selesai", value: doneBooks, icon: <Award size={18} />, color: "#22c55e" },
              { label: "Total Catatan", value: books.reduce((a, b) => a + b.notes.length, 0), icon: <Quote size={18} />, color: "#a855f7" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 18, padding: 18 }}>
                <div style={{ color: s.color, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{s.value}</div>
                <div style={{ color: "#475569", fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <h2 style={{ color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Progress Per Buku</h2>
          {books.map(book => {
            const pct = Math.min(Math.round((book.lastPage / book.totalPages) * 100), 100);
            return (
              <div key={book.id} style={{ background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{book.title}</span>
                  <span style={{ color: book.color, fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ background: "#0a1628", borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: book.color, borderRadius: 6, transition: "width 0.6s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ color: "#475569", fontSize: 11 }}>{book.lastPage}/{book.totalPages} hal</span>
                  {estimateTimeLeft(book) && <span style={{ color: "#475569", fontSize: 11 }}>~{formatMinutes(estimateTimeLeft(book))} lagi</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d1b2eee", backdropFilter: "blur(16px)", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 0 18px", zIndex: 100 }}>
        {[
          { id: "home", icon: <Home size={22} />, label: "Home" },
          { id: "add", icon: <Plus size={22} />, label: "Tambah" },
          { id: "quotes", icon: <Quote size={22} />, label: "Kutipan" },
          { id: "stats", icon: <BarChart2 size={22} />, label: "Statistik" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "quotes") setQuotesFolder(null); }}
            style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 16px", borderRadius: 12, transition: "all 0.2s" }}>
            <span style={{ color: tab === t.id ? "#f97316" : "#475569", transition: "color 0.2s" }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === t.id ? "#f97316" : "#475569", letterSpacing: "0.04em" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Modals ── */}
      {showUpdateModal && bookInUpdate && <UpdateModal book={bookInUpdate} upd={upd} setUpd={setUpd} saveUpdate={saveUpdate} onClose={() => setShowUpdateModal(null)} />}
      {showAddNote && <NoteModal bookId={showAddNote} noteForm={noteForm} setNoteForm={setNoteForm} saveNote={saveNote} onClose={() => setShowAddNote(null)} books={books} />}
    </div>
  );
}

// ─── BookCard Component ───────────────────────────────────────────────────────
function BookCard({ book, onOpen, onUpdate }) {
  const pct = Math.min(Math.round((book.lastPage / book.totalPages) * 100), 100);
  const timeLeft = estimateTimeLeft(book);
  const done = book.lastPage >= book.totalPages;
  return (
    <div onClick={onOpen} style={{ background: "#0d1b2e", border: `1px solid ${book.color}22`, borderRadius: 20, padding: 18, marginBottom: 12, cursor: "pointer", transition: "transform 0.15s", active: { transform: "scale(0.98)" } }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CircularProgress percent={pct} size={60} stroke={5} color={book.color} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>{pct}%</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#f1f5f9", fontSize: 16, fontWeight: 600, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</h3>
          <p style={{ color: "#475569", fontSize: 12, margin: "0 0 6px" }}>{book.author || "—"}</p>
          <GenreBadge genre={book.genre} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{book.lastPage}/{book.totalPages} hal</span>
            {timeLeft && !done && <span style={{ color: "#475569", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} /> ~{formatMinutes(timeLeft)}</span>}
            {done && <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>✓ Selesai</span>}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onUpdate(); }}
          style={{ background: book.color + "22", border: `1px solid ${book.color}44`, color: book.color, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
          Update
        </button>
      </div>
      <div style={{ marginTop: 14, background: "#0a1628", borderRadius: 6, height: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${book.color}, ${book.color}88)`, borderRadius: 6, transition: "width 0.6s" }} />
      </div>
    </div>
  );
}

// ─── Update Modal ─────────────────────────────────────────────────────────────
function UpdateModal({ book, upd, setUpd, saveUpdate, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
        <div style={{ width: 40, height: 4, background: "#1e3a5f", borderRadius: 2, margin: "0 auto 20px" }} />
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#f1f5f9", fontSize: 20, marginBottom: 20 }}>Update: {book.title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Halaman Terakhir Dibaca" type="number" value={upd.lastPage} onChange={v => setUpd(p => ({ ...p, lastPage: v }))} placeholder={`Maks ${book.totalPages}`} />
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 14 }}>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 10 }}>Sesi baca kali ini (opsional):</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField label="Halaman Dibaca" type="number" value={upd.sessionPages} onChange={v => setUpd(p => ({ ...p, sessionPages: v }))} placeholder="20" />
              <InputField label="Durasi (menit)" type="number" value={upd.sessionMinutes} onChange={v => setUpd(p => ({ ...p, sessionMinutes: v }))} placeholder="10" />
            </div>
          </div>
          <button onClick={() => saveUpdate(book)} style={{ background: book.color, border: "none", color: "#fff", borderRadius: 14, padding: "15px 0", fontWeight: 700, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Save size={18} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────
function NoteModal({ bookId, noteForm, setNoteForm, saveNote, onClose, books }) {
  const fromQuotes = bookId === "from-quotes";
  const [selectedBookId, setSelectedBookId] = useState(fromQuotes ? (books[0]?.id || "") : bookId);

  function handleSave() {
    if (fromQuotes) saveNote(selectedBookId);
    else saveNote(bookId);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
        <div style={{ width: 40, height: 4, background: "#1e3a5f", borderRadius: 2, margin: "0 auto 20px" }} />
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#f1f5f9", fontSize: 20, marginBottom: 20 }}>Tambah Kutipan</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {fromQuotes && (
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Pilih Buku *</label>
              <select value={selectedBookId} onChange={e => setSelectedBookId(Number(e.target.value))}
                style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: "12px 16px", color: "#e2e8f0", fontSize: 15, outline: "none", appearance: "none" }}>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
          )}
          <InputField label="Nomor Halaman" type="number" value={noteForm.page} onChange={v => setNoteForm(p => ({ ...p, page: v }))} placeholder="45" />
          <div>
            <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Kutipan / Catatan *</label>
            <textarea value={noteForm.text} onChange={e => setNoteForm(p => ({ ...p, text: e.target.value }))} placeholder="Tulis kalimat favoritmu..."
              style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: "12px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", resize: "none", height: 100, lineHeight: 1.6, boxSizing: "border-box" }} />
          </div>
          <button onClick={handleSave} style={{ background: "#f97316", border: "none", color: "#fff", borderRadius: 14, padding: "15px 0", fontWeight: 700, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Plus size={18} /> Simpan Kutipan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: "12px 14px", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}
