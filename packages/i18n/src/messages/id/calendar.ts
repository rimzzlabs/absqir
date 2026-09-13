/** Kisi kalender, dan lembar di balik satu hari. */
export const calendar = {
  title: "Kalender",
  description: "Semua acara dalam satu kalender, termasuk yang masih akan dibuat jadwal Anda.",
  newEvent: "Acara baru",
  previous: "Sebelumnya",
  next: "Berikutnya",
  today: "Hari ini",
  month: "Bulan",
  week: "Minggu",
  weekRange: "{{from}} sampai {{to}}",
  days: {
    mon: "Sen",
    tue: "Sel",
    wed: "Rab",
    thu: "Kam",
    fri: "Jum",
    sat: "Sab",
    sun: "Min",
  },
  projectedTitle: "Sebuah jadwal akan membuat acara ini",
  whatHappens: "Apa yang terjadi pada {{date}}",
  newEventOn: "Acara baru pada {{date}}",
  more: "{{count, number}} lagi",
  sheet: {
    empty: "Belum ada rencana pada hari ini.",
    count: "{{count, number}} di kalender.",
    range: "{{from}} sampai {{to}}",
    counts:
      "{{expected, number}} diharapkan · {{present, number}} hadir · {{late, number}} terlambat · {{absent, number}} tidak hadir",
    fromSchedule: "Dari sebuah jadwal",
    projectedHint:
      "Jadwalnya membuat acara ini dua minggu sebelum harinya. Belum ada yang perlu dilakukan.",
    newEvent: "Acara baru pada tanggal ini",
  },
} as const;
