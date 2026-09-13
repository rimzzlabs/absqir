/** Kisi kalender, dan lembar di balik satu hari. */
export const calendar = {
  title: "Kalender",
  description: "Semua acara dalam satu kisi, termasuk yang masih dijanjikan jadwal Anda.",
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
  more: "{{count}} lagi",
  sheet: {
    empty: "Belum ada rencana pada hari ini.",
    count: "{{count}} di kalender.",
    range: "{{from}} sampai {{to}}",
    counts:
      "{{expected}} diharapkan · {{present}} hadir · {{late}} terlambat · {{absent}} tidak hadir",
    fromSchedule: "Dari sebuah jadwal",
    projectedHint:
      "Jadwalnya membuat acara ini dua minggu sebelumnya. Belum ada yang perlu dilakukan.",
    newEvent: "Acara baru pada hari ini",
  },
} as const;
