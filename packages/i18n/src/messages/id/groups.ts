/** Grup: siapa yang diharapkan hadir. */
export const groups = {
  title: "Grup",
  description: "Siapa diharapkan hadir di mana. Acara bisa mengundang satu grup sekaligus.",
  new: "Grup baru",
  emptyTitle: "Belum ada grup",
  emptyDescription:
    "Grup bisa berupa tim, divisi, kelas, atau angkatan. Sebuah acara mengharapkan satu grup, dan setiap orang di dalamnya yang tidak check-in dicatat tidak hadir.",
  dialog: {
    editTitle: "Ubah grup",
    newTitle: "Grup baru",
    editDescription: "Ganti namanya atau ubah keterangannya.",
    newDescription: "Beri nama dulu. Tambahkan orangnya setelah itu.",
    name: "Nama",
    namePlaceholder: "Teknik, Angkatan 12, Relawan",
    description: "Keterangan",
    descriptionHint: "Tidak wajib.",
    create: "Buat",
  },
  sheet: {
    fallbackTitle: "Grup",
    noDescription: "Tanpa keterangan.",
    saveMembers: "Simpan anggota",
    filter: "Saring direktori",
    noEmail: "tanpa email",
    nobodyMatches: "Tidak ada yang cocok.",
    deleteTitle: "Hapus {{name}}?",
    deleteDescription: "Orangnya tetap ada di direktori. Hanya grupnya yang hilang.",
    keep: "Biarkan",
    deleting: "Menghapus…",
  },
} as const;
