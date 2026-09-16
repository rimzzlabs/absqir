/** Pengaturan: akun Anda sendiri, dan cara aplikasi ini bekerja untuk Anda. */
export const settings = {
  title: "Pengaturan",
  description: "Akun Anda dan cara aplikasi ini bekerja untuk Anda.",
  nav: {
    label: "Bagian pengaturan",
    profile: "Profil",
    preferences: "Preferensi",
    notifications: "Notifikasi",
    security: "Keamanan",
  },
  language: {
    label: "Bahasa",
    hint: "Akun Anda yang menyimpan pilihan ini, jadi setiap perangkat yang Anda pakai membaca absqir dengan bahasa yang sama. Notifikasi dan email Anda ikut. Orang lain tetap dengan pilihannya sendiri.",
    selectLabel: "Pilih bahasa",
    followingDevice: "Peramban Anda meminta {{language}}.",
  },
  preferences: {
    title: "Preferensi",
    description:
      "Tema dan animasi tersimpan di peramban ini, jadi ponsel dan layar ruangan bisa berbeda. Bahasa mengikuti akun Anda.",
    theme: "Tema",
    themeHint: "Sistem mengikuti pengaturan perangkat dan berubah bersamanya.",
    themes: {
      system: "Sistem",
      systemHint: "Mengikuti perangkat",
      light: "Terang",
      lightHint: "Selalu",
      dark: "Gelap",
      darkHint: "Selalu",
    },
    animation: "Animasi",
    animationHint:
      "Mati menghentikan setiap transisi, popup, dan gerak halaman. Ikuti perangkat akan mengikuti pengaturan kurangi gerak di sistem operasi Anda.",
    motions: {
      system: "Ikuti perangkat",
      on: "Nyala",
      off: "Mati",
    },
  },
} as const;
