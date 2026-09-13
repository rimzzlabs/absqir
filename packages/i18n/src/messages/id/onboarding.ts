/** Langkah awal akun baru: nama, foto, dan tempatnya bernaung. */
export const onboarding = {
  steps: {
    label: "Langkah pendaftaran",
    profile: "Profil",
    avatar: "Foto",
    organization: "Organisasi",
  },
  language: {
    label: "Bahasa",
    hint: "Kami membuka dalam bahasa yang diminta peramban Anda. Ubah di sini, atau nanti di pengaturan.",
  },
  profile: {
    title: "Siapa nama Anda",
    description: "Nama yang dilihat penyelenggara Anda.",
    descriptionWithPassword:
      "Nama yang dilihat penyelenggara Anda, dan kata sandi untuk masuk berikutnya.",
    fullName: "Nama lengkap",
    password: "Kata sandi",
    passwordHint:
      "Minimal {{count, number}} karakter. Anda juga bisa masuk lewat kode yang dikirim ke email.",
    addPassword: "Tambahkan kata sandi",
    addPasswordHint:
      "{{provider}} sudah bisa memasukkan Anda. Kata sandi adalah jalan masuk tambahan, untuk perangkat yang tidak punya akun itu.",
    continue: "Lanjut",
  },
  avatar: {
    title: "Tambahkan foto",
    description:
      "Tidak wajib. Foto membantu penyelenggara mengenali Anda di daftar. Boleh dilewati.",
    choose: "Pilih foto",
    chooseAnother: "Pilih foto lain",
    formats: "PNG, JPEG, atau WebP. absqir mengecilkannya untuk Anda.",
    unreadable: "absqir tidak bisa membaca foto itu. Coba foto lain.",
    saveAndContinue: "Simpan lalu lanjut",
  },
  organization: {
    finishing: "Menyelesaikan…",
    finishWithout: "Selesai tanpa bergabung",
  },
  event: {
    soldOut: "Semua kursi sudah terisi.",
    closed: "Acara ini sudah tidak menerima pendaftaran.",
    register: "Daftar",
    registering: "Mendaftar…",
  },
  done: "Beres. Sebentar ya…",
  pageTitle: "Selamat datang",
} as const;
