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
    hint: "Setiap layar, setiap notifikasi, dan setiap email untuk akun Anda memakai bahasa ini. Orang lain tetap dengan pilihannya sendiri.",
    selectLabel: "Pilih bahasa",
    followingDevice: "Peramban Anda meminta {{language}}.",
  },
  preferences: {
    title: "Preferensi",
    description: "Disimpan di peramban ini, bukan di akun. Ponsel dan layar ruangan bisa berbeda.",
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
