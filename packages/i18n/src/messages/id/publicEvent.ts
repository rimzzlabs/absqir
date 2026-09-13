/** Halaman di balik tautan publik sebuah acara terbuka. */
export const publicEvent = {
  registered: "{{count, number}} terdaftar",
  seats: "{{registered, number}} dari {{limit, number}} kursi terisi",
  full: " · penuh",
  youAreRegistered: "Anda sudah terdaftar",
  youAreRegisteredHint:
    "Saat acaranya berlangsung, pindai layar di ruangan, atau tunjukkan kartu masuk Anda di pintu.",
  myEvents: "Acara saya",
  withdrawing: "Menarik…",
  withdraw: "Tarik pendaftaran saya",
  over: "Acara ini sudah selesai.",
  closed: "Pendaftaran sudah ditutup.",
  soldOut: "Semua kursi sudah terisi.",
  signIn: "Masuk untuk mendaftar",
  signInHint:
    "Belum punya akun? Masukkan email Anda, dan absqir membuatkannya lewat kode yang dikirim ke sana.",
  registering: "Mendaftar…",
  register: "Daftar",
  joinNote: "Anda bergabung ke {{organization}} sebagai anggota, dan acara ini mengharapkan Anda.",
  brokenTitle: "Tidak ada acara yang bisa diikuti",
  brokenDescription:
    "Tautan ini tidak mengarah ke acara terbuka. Minta tautan baru ke penyelenggara.",
} as const;
