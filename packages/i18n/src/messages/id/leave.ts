/** Antrean pengajuan izin milik penyelenggara. */
export const leave = {
  title: "Pengajuan izin",
  description:
    "Anggota mengajukan izin sebelum acaranya berlangsung. Setujui, dan catatannya menjadi izin, bukan tidak hadir.",
  pending: "Menunggu",
  decided: "Sudah diputuskan",
  tableLabel: "Pengajuan izin",
  person: "Orang",
  event: "Acara",
  reason: "Alasan",
  note: "Catatan: {{note}}",
  asked: "Diajukan",
  status: "Status",
  approve: "Setujui",
  decline: "Tolak",
  emptyPendingTitle: "Tidak ada yang perlu diputuskan",
  emptyPendingDescription:
    "Anggota yang tidak bisa hadir mengajukan di sini. Anda menyetujui atau menolak.",
  emptyDecidedTitle: "Belum ada yang diputuskan",
  emptyDecidedDescription: "Pengajuan yang disetujui dan ditolak muncul di sini.",
  dialog: {
    title: "{{decision}} {{name}}",
    approveDescription: "Catatan untuk acara ini menjadi izin, bukan tidak hadir.",
    declineDescription: "Catatannya tetap seperti sekarang. Anggota melihat catatan Anda.",
    note: "Catatan",
    noteHint: "Tidak wajib. Anggota membacanya.",
  },
} as const;
