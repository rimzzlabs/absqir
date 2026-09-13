/** Halaman di balik tautan publik sebuah acara terbuka. */
export const publicEvent = {
  registered: "{{count}} terdaftar",
  seats: "{{registered}} dari {{limit}} kursi terisi",
  full: " · penuh",
  youAreRegistered: "Anda sudah terdaftar",
  youAreRegisteredHint:
    "Saat acaranya berlangsung, pindai layar di ruangan, atau tunjukkan pas Anda di pintu.",
  myEvents: "Acara saya",
  withdrawing: "Menarik…",
  withdraw: "Tarik pendaftaran saya",
  over: "Acara ini sudah selesai.",
  closed: "Pendaftaran sudah ditutup.",
  soldOut: "Semua kursi sudah terisi.",
  signIn: "Masuk untuk mendaftar",
  signInHint:
    "Belum punya akun? Pintu yang sama membuatkannya lewat kode yang dikirim ke email Anda.",
  registering: "Mendaftar…",
  register: "Daftar",
  joinNote: "Anda bergabung ke {{organization}} sebagai anggota, dan acara ini mengharapkan Anda.",
  brokenTitle: "Tidak ada yang bisa didaftar",
  brokenDescription:
    "Tautan ini tidak mengarah ke acara terbuka. Minta tautan baru ke penyelenggara.",
} as const;
