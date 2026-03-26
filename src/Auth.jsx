import { useState } from "react"
import { supabase } from "./supabaseClient"
import { BookOpen, Mail, Lock, Eye, EyeOff, Loader2, User } from "lucide-react"

export default function Auth() {
  const [mode, setMode]         = useState("login") // "login" | "signup"
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [name, setName]         = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState("")

  async function handleSubmit() {
    setError("")
    setSuccess("")
    if (!email || !password) { setError("Email dan password wajib diisi."); return }
    if (password.length < 6)  { setError("Password minimal 6 karakter."); return }
    setLoading(true)

    if (mode === "login") {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) setError(e.message)
    } else {
      const { error: e } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (e) setError(e.message)
      else   setSuccess("Akun berhasil dibuat! Silakan login.")
    }
    setLoading(false)
  }

  const labelStyle = {
    color: "#64748b", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase",
    display: "block", marginBottom: 8
  }
  const inputWrap = {
    position: "relative", marginBottom: 14
  }
  const inputStyle = {
    width: "100%", background: "#0a1628",
    border: "1px solid #1e3a5f", borderRadius: 14,
    padding: "13px 16px 13px 44px",
    color: "#e2e8f0", fontSize: 15, outline: "none",
    boxSizing: "border-box", transition: "border 0.2s"
  }
  const iconStyle = {
    position: "absolute", left: 14,
    top: "50%", transform: "translateY(-50%)",
    color: "#334155", pointerEvents: "none"
  }

  return (
    <div style={{
      background: "#080f1a", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "'DM Sans', sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "linear-gradient(135deg, #f9731622, #f9731644)",
            border: "2px solid #f9731644",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <BookOpen size={28} style={{ color: "#f97316" }} />
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 28,
            fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px"
          }}>
            Rak Buku<span style={{ color: "#f97316" }}>.</span>
          </h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            {mode === "login" ? "Masuk ke akun kamu" : "Buat akun baru"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#0d1b2e", border: "1px solid #1e3a5f",
          borderRadius: 24, padding: "28px 24px"
        }}>
          {/* Tab switch */}
          <div style={{
            display: "flex", background: "#0a1628",
            borderRadius: 12, padding: 4, marginBottom: 24
          }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess("") }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                  cursor: "pointer", fontWeight: 600, fontSize: 13,
                  background: mode === m ? "#f97316" : "transparent",
                  color: mode === m ? "#fff" : "#475569",
                  transition: "all 0.2s"
                }}>
                {m === "login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          {/* Fields */}
          {mode === "signup" && (
            <div style={inputWrap}>
              <label style={labelStyle}>Nama</label>
              <div style={{ position: "relative" }}>
                <User size={16} style={iconStyle} />
                <input
                  type="text" value={name} placeholder="Nama kamu"
                  onChange={e => setName(e.target.value)}
                  style={inputStyle} />
              </div>
            </div>
          )}

          <div style={inputWrap}>
            <label style={labelStyle}>Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={iconStyle} />
              <input
                type="email" value={email} placeholder="email@kamu.com"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={inputStyle} />
            </div>
          </div>

          <div style={{ ...inputWrap, marginBottom: 20 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={iconStyle} />
              <input
                type={showPw ? "text" : "password"} value={password}
                placeholder="Minimal 6 karakter"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ ...inputStyle, paddingRight: 44 }} />
              <button onClick={() => setShowPw(p => !p)}
                style={{
                  position: "absolute", right: 14, top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none",
                  color: "#475569", cursor: "pointer", padding: 0
                }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              background: "#2d0a0a", border: "1px solid #ef444433",
              borderRadius: 10, padding: "10px 14px", marginBottom: 14,
              color: "#f87171", fontSize: 13
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{
              background: "#0a2d14", border: "1px solid #22c55e33",
              borderRadius: 10, padding: "10px 14px", marginBottom: 14,
              color: "#4ade80", fontSize: 13
            }}>
              ✅ {success}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", background: loading ? "#7c3912" : "#f97316",
              border: "none", color: "#fff", borderRadius: 14,
              padding: "15px 0", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontSize: 15, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "background 0.2s"
            }}>
            {loading
              ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Memproses...</>
              : mode === "login" ? "Masuk →" : "Buat Akun →"
            }
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#334155", fontSize: 12, marginTop: 20 }}>
          Data kamu aman dan terisolasi dari pengguna lain
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
