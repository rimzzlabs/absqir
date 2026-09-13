/** Check-in: pemindai, kartu masuk, hasilnya, dan jalan kembali. */
export const checkin = {
  title: "Check-in",
  description:
    "Arahkan kamera ke layar di ruangan. Atau tunjukkan kartu masuk Anda ke penyelenggara.",
  scanner: {
    title: "Pindai layar ruangan",
    description:
      "Tahan kode di dalam bingkai. Kodenya terbaca sendiri, jadi tidak ada yang perlu ditekan.",
    notALink: "Itu bukan kode dari layar ruangan.",
    pasteFallback: "Tempelkan tautan yang tercetak di bawah kode pada layar ruangan.",
    locatingNote: "Mencari posisi Anda.",
    checkingNote: "Mencatat kehadiran Anda.",
    youAreIn: "{{name}}, Anda tercatat hadir di {{event}}.",
    locatingTitle: "Mencari posisi Anda",
    locatingHint:
      "Acara ini memeriksa apakah Anda ada di tempatnya. Izinkan lokasi, lalu diam sebentar.",
    refusedTitle: "Anda belum tercatat hadir",
    manualLabel: "Tidak bisa memindai? Tempel tautannya",
    manualSubmit: "Check-in",
    manualHint: "Layar ruangan mencetak tautannya di bawah kode.",
  },
  viewfinder: {
    looking: "Mencari kode",
    opening: "Membuka kamera…",
    checking: "Mencatat kehadiran Anda…",
  },
  result: {
    already: "Sudah tercatat, {{name}}",
    welcome: "Anda tercatat hadir, {{name}}",
    at: "pukul {{time}}",
    inAt: "masuk pukul {{time}}",
    scanAnother: "Pindai lagi",
    myHistory: "Riwayat saya",
    saved: "Anda bisa menutup halaman ini. Catatannya sudah tersimpan.",
    myEvents: "Acara saya",
  },
  scanPage: {
    title: "Pindai layarnya",
    description:
      "Halaman ini terbuka dari kode QR di ruangan. Arahkan kamera ponsel Anda ke sana, atau buka pemindai di sini.",
    openScanner: "Buka pemindai",
    scanAgain: "Pindai layarnya lagi",
    scanMyself: "Saya pindai sendiri",
    checkingTitle: "Mencatat kehadiran Anda…",
    checkingHint: "Sebentar ya. Biarkan halaman ini terbuka.",
    locatingTitle: "Mencari posisi Anda…",
  },
  pass: {
    title: "Tunjukkan kartu masuk saya",
    description:
      "Kalau penyelenggara yang memindai, bukan layar ruangan, tunjukkan ini. Satu kartu masuk untuk satu acara.",
    myEvents: "Acara saya",
    runsUntil: "Berlangsung sampai {{time}}",
    myPass: "Kartu masuk saya",
    upNext: "Berikutnya",
    opens: "Check-in dibuka {{when}}",
    emptyTitle: "Belum ada acara untuk Anda",
    emptyDescription: "Acara muncul di sini begitu penyelenggara merencanakannya untuk grup Anda.",
    nothingRuns:
      "Tidak ada acara yang berlangsung sekarang, jadi belum ada kartu masuk yang berlaku.",
  },
  steps: {
    title: "Cara kerjanya",
    description: "Dua jalan masuk. Keduanya menulis catatan yang sama.",
    one: "Arahkan ke layar ruangan",
    oneHint:
      "Penyelenggara menampilkan kode di layar atau di lembar cetak. Tahan kode itu di dalam bingkai.",
    two: "Atau tunjukkan kartu masuk Anda",
    twoHint:
      "Tidak ada layar di ruangan? Buka kartu masuk Anda dan biarkan penyelenggara memindainya.",
    three: "Catatan Anda ditulis",
    threeHint: "Anda langsung melihat jam dan statusnya. Catatan itu masuk ke riwayat Anda juga.",
  },
  recent: {
    title: "Check-in terakhir Anda",
    description: "Terbaru dulu.",
    history: "Riwayat",
    empty:
      "Nama Anda belum muncul di acara mana pun yang sudah ditutup. Check-in pertama Anda akan muncul di sini.",
    inAt: " · masuk pukul {{time}}",
  },
  report: {
    pending:
      "Anda sudah melaporkan ini, dan penyelenggara belum memutuskan. Anda akan mendapat notifikasi, apa pun hasilnya.",
    approved:
      "Penyelenggara menerima laporan Anda, jadi kehadiran Anda sudah tercatat untuk acara ini.",
    declined:
      "Penyelenggara membaca laporan Anda dan tidak menerimanya, jadi acara ini tetap seperti sekarang. Bicaralah dengan mereka kalau itu keliru. Mereka masih bisa mencatat Anda hadir secara manual.",
    open: "Saya ada di sini, beri tahu penyelenggara",
    sentTitle: "Laporan terkirim",
    title: "Beri tahu penyelenggara",
    sentDescription:
      "Penyelenggara akan membacanya dan memutuskan. Kalau mereka setuju, Anda dicatat hadir pada jam Anda memindai, bukan pada jam mereka membaca laporan ini.",
    description:
      "Kalau Anda ada di acaranya tetapi pemeriksaan tetap menolak, katakan di sini. Pindaian Anda atas layar ruangan sudah tercatat.",
    doneBefore:
      "Tidak ada lagi yang perlu Anda lakukan. Anda bisa menutup halaman ini dan memeriksa catatan Anda nanti di",
    doneLink: "Acara saya",
    message: "Apa yang terjadi?",
    messagePlaceholder:
      "Saya ada di aula, tetapi ponsel saya terus menempatkan saya di jalan sebelah.",
    messageHint: "Satu laporan untuk satu acara. Sebutkan Anda sebenarnya ada di mana.",
    sending: "Mengirim…",
    send: "Kirim laporan",
  },
  camera: {
    insecure: "Kamera butuh alamat https.",
    refused: "Akses kamera ditolak.",
    missing: "Tidak ada kamera di perangkat ini.",
    busy: "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.",
    unknown: "Kamera tidak bisa dibuka.",
    noCamera: "Peramban ini tidak punya kamera.",
  },
  scannerPage: {
    fallbackTitle: "Pemindai",
    description: "Arahkan kamera ke kartu masuk di ponsel anggota. Setiap kartu dihitung sekali.",
    fallback: "Minta kode di bawah QR anggota, lalu ketik di bawah ini.",
    opening: "Membuka kamera…",
    notAvailable: "Kamera tidak tersedia",
    manualPlaceholder: "Atau tempel kode kartu di sini",
    manualLabel: "Kode kartu masuk",
    checkIn: "Check-in",
    alreadyIn: "Sudah hadir sejak {{time}}",
    checkedIn: "Tercatat hadir pukul {{time}}",
  },
  reports: {
    title: "Masalah check-in",
    description:
      "Anggota yang menyatakan bahwa pemeriksaan tempat menolak mereka padahal mereka berada di acara.",
    waiting: "Menunggu",
    decided: "Sudah diputuskan",
    all: "Semua",
    approved: "Diterima",
    declined: "Ditolak",
    emptyTitle: "Tidak ada apa-apa",
    emptyDescription:
      "Belum ada yang melaporkan masalah dengan pemeriksaan tempat. Anggota yang ditolak padahal sedang berdiri di acara bisa mengirimnya dari halaman check-in.",
    started: "{{event}} · mulai {{when}}",
    earlier_one: "{{count, number}} laporan sebelumnya",
    earlier_other: "{{count, number}} laporan sebelumnya",
    theySaid: "Katanya",
    noAttempt: "Check-in yang ditolak sudah tidak tercatat, jadi hanya kata-katanya yang tersisa.",
    recorded: "Apa yang tercatat",
    scanned: "Dipindai",
    scannedRoomCode: "Kode yang berganti otomatis di layar ruangan",
    scannedPass: "Kartu masuk, dibaca oleh pemindai penyelenggara",
    distance: "Jarak",
    distanceFrom: "{{distance}} dari tempatnya",
    noLocation: "Perangkat tidak mengirim lokasi",
    coarse: "Terlalu kabur untuk menentukan posisinya",
    notRecorded: "Tidak tercatat",
    accuracy: "Akurasi",
    accuracyAbout: "Sekitar {{meters, number}} m",
    scannedAt: "Dipindai pada",
    conflict:
      "Dua fakta ini saling bertentangan. Kode yang dia pindai hanya bisa dibaca orang yang berdiri di depan layar ruangan, tetapi ponselnya menempatkan dia jauh dari lokasi acara. Bisa jadi ponselnya salah membaca posisi, yang sering terjadi di dalam ruangan, atau ada orang lain yang meneruskan kodenya kepada dia.",
    signals: "Sinyal",
    recordThemAs: "Catat sebagai",
    clockSays: "Menurut jam, {{status}}, dihitung dari waktu dia memindai.",
    noClock:
      "Tidak ada pindaian yang tersisa untuk diambil waktunya, jadi pilih sendiri apa yang terjadi.",
    noteLabel: "Catatan untuk {{name}}",
    notePlaceholder: "Tidak wajib. Anggota membaca ini bersama keputusannya.",
    recordAs: "Catat sebagai {{status}}",
    decline: "Tolak",
    afterHint:
      "Catatannya memakai waktu dia memindai, bukan waktu Anda memutuskan. Apa pun hasilnya dia mendapat notifikasi, dan acara itu tidak bisa dilaporkan lagi.",
    markedIn: "Dicatat hadir",
    wasDeclined: "Ditolak",
  },
  risk: {
    "patched-api": "Ada yang mengganti bagian peramban yang melaporkan lokasi.",
    "automated-browser": "Peramban melaporkan bahwa dirinya dijalankan skrip, bukan oleh orang.",
    "frozen-track":
      "Semua pembacaan lokasi menunjuk titik yang sama persis, sampai setengah meter.",
    teleport: "Terlalu jauh dari check-in sebelumnya untuk ditempuh dalam waktu sesingkat itu.",
    "shared-coordinates": "Orang lain mengirim koordinat yang persis sama.",
    "network-far": "Alamat jaringannya berada jauh dari titik yang dia sebutkan.",
    "network-relay": "Alamat jaringannya milik VPN atau penyedia hosting.",
    "perfect-accuracy": "Akurasi yang dilaporkan terlalu sempurna untuk sebuah ponsel.",
    "constant-accuracy": "Setiap pembacaan melaporkan angka akurasi bulat yang sama.",
    "no-altitude":
      "Tidak ada pembacaan yang menyertakan ketinggian, jadi tidak ada yang berasal dari satelit.",
    "timezone-mismatch": "Jam di perangkatnya disetel ke belahan dunia yang lain.",
    "single-fix": "Hanya satu pembacaan yang masuk, jadi pergerakannya tidak bisa diperiksa.",
  },
} as const;
