/** Satu pintu: email dulu, lalu kata sandi, kode, atau tanda tertutup. */
export const auth = {
  door: {
    signInTitle: "Masuk",
    title: "Masuk atau buat akun",
    description: "Masukkan email Anda. Kami akan memberi tahu langkah berikutnya.",
    email: "Email",
    checking: "Memeriksa…",
    continue: "Lanjut",
  },
  closed: {
    title: "Email ini butuh undangan",
    description:
      "Tidak ada akun untuk {{email}}, dan absqir ini hanya menerima orang yang diundang.",
    hint: "Minta penyelenggara di organisasi Anda untuk mengundang Anda. Email undangannya berisi tautan yang membuka halaman ini dengan alamat Anda sudah terisi.",
    tryAnother: "Coba email lain",
  },
  code: {
    titleNew: "Periksa kotak masuk Anda",
    title: "Masukkan kode Anda",
    description: "Kami mengirim kode 6 digit ke {{email}}. Kode ini berlaku 10 menit.",
    label: "Kode",
    createAccount: "Buat akun saya",
    signIn: "Masuk",
    useAnotherEmail: "Pakai email lain",
    sendNewCode: "Kirim kode baru",
    newCodeIn: "Kode baru dalam {{seconds}} detik",
    sending: "Mengirim…",
  },
  password: {
    title: "Selamat datang kembali",
    label: "Kata sandi",
    remember: "Biarkan saya tetap masuk",
    signingIn: "Masuk…",
    signIn: "Masuk",
    useAnotherEmail: "Pakai email lain",
    emailCodeInstead: "Kirimi saya kode lewat email",
  },
  reset: {
    title: "Masukkan kode Anda",
    description:
      "Kami mengirim kode 6 digit ke {{email}}. Pakai kode itu untuk memilih kata sandi baru.",
    newPassword: "Kata sandi baru",
    minLength: "Minimal {{count}} karakter.",
    submit: "Simpan kata sandi lalu masuk",
    backToPassword: "Kembali ke kata sandi",
  },
  providers: {
    or: "atau",
    continueWith: "Lanjut dengan {{provider}}",
    opening: "Membuka…",
    fallbackName: "Penyedia itu",
  },
  callback: {
    noInvitationWithEmail:
      "{{provider}} memasukkan Anda sebagai {{email}}. Alamat itu tidak punya undangan di sini.",
    noInvitation: "Alamat yang dikembalikan {{provider}} tidak punya undangan di sini.",
    accessDenied: "Proses masuk lewat {{provider}} dibatalkan.",
    emailMismatch: "Akun {{provider}} itu memakai alamat yang berbeda dari akun ini.",
    alreadyLinked: "Akun {{provider}} itu sudah dipakai orang lain di sini.",
    unableToLink: "absqir tidak bisa menautkan akun {{provider}} itu.",
    emailNotFound: "{{provider}} tidak membagikan alamat. Tambahkan satu di sana, lalu coba lagi.",
    emailNotVerified: "{{provider}} belum memverifikasi alamat itu.",
    unknown: "Proses masuk lewat {{provider}} tidak selesai. Coba lagi, atau pakai email Anda.",
  },
  validation: {
    passwordRequired: "Masukkan kata sandi Anda.",
    passwordShort: "Pakai minimal {{count}} karakter.",
    passwordLong: "Kata sandi itu terlalu panjang.",
    codeLength: "Masukkan kode {{count}} digit.",
    digitsOnly: "Angka saja.",
    nameRequired: "Isi nama Anda.",
  },
} as const;
