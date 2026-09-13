/** Semua jalan masuk ke organisasi: undangan, domain, atau bikin sendiri. */
export const join = {
  waiting: {
    title: "Permintaan Anda ada di tangan mereka",
    description:
      "{{name}} yang memutuskan siapa yang masuk. Jawabannya datang lewat absqir dan email.",
    sent: "Dikirim {{when}}",
    withdraw: "Tarik kembali",
    withdrawing: "Menarik…",
  },
  event: {
    title: "Bergabung ke organisasi",
    description: "Daftar ke acaranya, dan Anda masuk ke organisasinya sebagai anggota.",
  },
  invited: {
    title: "Anda diundang",
    description: "Terima undangannya untuk mulai.",
    joinAs: "Masuk sebagai {{role}}",
    accept: "Terima",
    joining: "Bergabung…",
  },
  workspace: {
    title: "{{name}} ada di absqir",
    autoDescription: "Semua orang di {{domain}} bisa langsung masuk.",
    requestDescription:
      "Mereka menerima orang dari {{domain}}. Ajukan, lalu penyelenggara memutuskan.",
    join: "Gabung",
    ask: "Ajukan diri",
    send: "Kirim permintaan",
    sending: "Mengirim…",
    notePlaceholder: "Ceritakan ke {{name}} siapa Anda. Ini tidak wajib.",
    noteLabel: "Catatan untuk penyelenggara",
  },
  none: {
    title: "Anda belum ada di organisasi mana pun",
    canCreate: "Mulai satu di bawah, atau tunggu undangan.",
    cannotCreate: "Penyelenggara harus mengundang Anda.",
  },
  create: "Buat organisasi",
  createSeparate: "Mulai organisasi terpisah",
  invitationHint:
    "Undangan ke {{email}} membawa Anda langsung masuk. Buka tautannya dan Anda sudah di dalam.",
} as const;
