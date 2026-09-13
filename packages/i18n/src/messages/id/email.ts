/** Yang absqir kirim ke kotak masuk. Tiap pesan memakai bahasa pembacanya. */
export const email = {
  otp: {
    signInHeading: "Kode masuk Anda",
    signInLead: "Masukkan kode ini untuk menyelesaikan proses masuk. Berlaku sekali pakai.",
    signInSubject: "{{code}} adalah kode masuk absqir Anda",
    verifyHeading: "Konfirmasi email Anda",
    verifyLead: "Masukkan kode ini untuk mengonfirmasi alamat ini. Berlaku sekali pakai.",
    verifySubject: "{{code}} mengonfirmasi email Anda",
    resetHeading: "Atur ulang kata sandi Anda",
    resetLead: "Masukkan kode ini untuk membuat kata sandi baru. Berlaku sekali pakai.",
    resetSubject: "{{code}} mengatur ulang kata sandi Anda",
    changeHeading: "Konfirmasi email baru Anda",
    changeLead:
      "Masukkan kode ini untuk memindahkan akun Anda ke alamat ini. Berlaku sekali pakai.",
    changeSubject: "{{code}} mengonfirmasi email baru Anda",
    preview: "{{code}} adalah kode absqir Anda",
    footer:
      "absqir mengirim kode hanya ketika ada yang memintanya. Tidak ada orang absqir yang akan meminta Anda meneruskan kode ini.",
    expiry:
      "Kode ini kedaluwarsa dalam {{count}} menit. Kalau Anda tidak memintanya, abaikan email ini. Tidak ada yang berubah sampai kodenya dipakai.",
  },
  invitation: {
    preview: "{{inviter}} mengundang Anda ke {{organization}} di absqir",
    subject: "Bergabung ke {{organization}} di absqir",
    heading: "Bergabung ke {{organization}}",
    body: "{{inviter}} mengundang Anda ke {{organization}} sebagai {{role}}. Buka tautannya untuk menerima. Kalau Anda belum punya akun, akunnya dibuat di jalan.",
    accept: "Terima undangannya",
    expiry: "Undangan ini kedaluwarsa dalam 7 hari.",
    footer:
      "{{inviter}} mengirim undangan ini ke alamat Anda. Kalau Anda tidak mengenalnya, abaikan saja dan undangannya kedaluwarsa dengan sendirinya.",
  },
  notification: {
    footer: "Anda menerima ini karena Anda tergabung di {{organization}} pada absqir.",
    preferences: "Pilih email mana yang boleh sampai ke Anda",
    yourOrganization: "organisasi Anda",
  },
  fallbackLink: "Atau tempel alamat ini ke peramban Anda:",
  actions: {
    "event-reminder": "Buka acara saya",
    "event-closed": "Buka acaranya",
    "leave-requested": "Buka antreannya",
    "leave-decided": "Buka izin saya",
    "join-requested": "Buka permintaannya",
    "join-decided": "Buka absqir",
    "check-in-reported": "Buka antreannya",
    "check-in-decided": "Buka acara saya",
  },
  notify: {
    reminderHour: "{{event}} mulai dalam satu jam",
    reminderDay: "{{event}} sebentar lagi",
    when: "{{start}} sampai {{end}} ({{timezone}}).",
    eventClosed: "{{event}} ditutup",
    eventClosedBody:
      "{{present}} hadir, {{late}} terlambat, {{excused}} izin, {{absent}} tidak hadir.",
    leaveRequested: "{{name}} mengajukan izin untuk {{event}}",
    leaveApproved: "Izin Anda untuk {{event}} disetujui",
    leaveDeclined: "Izin Anda untuk {{event}} ditolak",
    leaveApprovedBody: "Catatan untuk acara ini tertulis izin.",
    leaveDeclinedBody:
      "Catatannya tetap seperti sekarang. Bicaralah dengan penyelenggara kalau itu keliru.",
    joinRequested: "{{name}} minta bergabung",
    joinApproved: "Anda sudah masuk {{organization}}",
    joinDeclined: "{{organization}} menolak permintaan Anda",
    joinApprovedBody: "Buka absqir untuk melihat acara Anda.",
    joinDeclinedBody: "Minta orang di sana mengundang Anda kalau itu keliru.",
    checkInReported: "{{name}} tidak bisa check-in ke {{event}}",
    checkInDecidedApproved: "Anda dicatat hadir di {{event}}",
    checkInDecidedDeclined: "Laporan Anda tentang {{event}} tidak diterima",
    checkInApprovedBody: "Catatannya memakai waktu Anda memindai, bukan waktu keputusan dibuat.",
    checkInDeclinedBody:
      "Catatannya tetap seperti sekarang. Bicaralah dengan penyelenggara kalau itu keliru.",
  },
} as const;
