/* Host panel language: Uzbek is written in the page itself; Russian and English come from here.
   Keys are the Uzbek texts, so a string that has no translation yet simply stays in Uzbek.
   - In HTML: data-h (inner HTML), data-hp (placeholder), data-ht (title)
   - In JS:   H("O'zbekcha matn {n}", {n: 5}) */
const HOST_LANGS = {uz: "O'zbekcha", ru: 'Русский', en: 'English'};
let HLANG = (() => { try { const l = JSON.parse(localStorage.getItem('bilimdon_hlang')); return HOST_LANGS[l] ? l : 'uz'; } catch (e) { return 'uz'; } })();

const HDICT = {
ru: {
  // sign in
  "O'yin o'tkazuvchi va test tuzuvchilar uchun": "Для ведущих игр и авторов тестов",
  "Kirish": "Войти", "Ro'yxatdan o'tish": "Регистрация",
  "Foydalanuvchi nomi": "Имя пользователя", "Parol": "Пароль", "Parolni takrorlang": "Повторите пароль",
  "Parolni unutdingizmi?": "Забыли пароль?",
  "Ro'yxatdan o'tganda berilgan <b>tiklash kodi</b> bilan yangi parol qo'ying:": "Задайте новый пароль с помощью <b>кода восстановления</b>, выданного при регистрации:",
  "Login": "Логин", "Tiklash kodi: XXXX-XXXX-XXXX-XXXX": "Код восстановления: XXXX-XXXX-XXXX-XXXX",
  "Yangi parol (kamida 6 belgi)": "Новый пароль (не менее 6 символов)", "Yangi parolni takrorlang": "Повторите новый пароль",
  "Parolni tiklash": "Восстановить пароль", "Kod ham yo'qolganmi?": "Код тоже потерян?",
  "← O'yinga kirish (o'yinchilar uchun)": "← Войти в игру (для игроков)",
  "Nom va parolni kiriting": "Введите имя и пароль", "Parollar bir xil emas": "Пароли не совпадают",
  "Server bilan aloqa yo'q": "Нет связи с сервером", "Xatolik yuz berdi": "Произошла ошибка",
  "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urinib ko'ring.": "Слишком много попыток. Попробуйте через несколько минут.",
  "Nom 3–20 ta lotin harfi, raqam yoki _ . - dan iborat bo'lsin": "Имя: 3–20 латинских букв, цифр или _ . -",
  "Parol kamida 6 ta belgidan iborat bo'lsin": "Пароль должен быть не короче 6 символов",
  "Bu nom band, boshqasini tanlang": "Это имя занято, выберите другое", "Login yoki parol noto'g'ri": "Неверный логин или пароль",
  "🌙 Tungi rejim": "🌙 Тёмная тема", "☀️ Kunduzgi rejim": "☀️ Светлая тема",
  // navigation and profile menu
  "Bosh sahifa": "Главная", "Viktorinalarim": "Мои викторины", "Sinflar": "Классы", "Guruhlar": "Группы",
  "Kashf etish": "Обзор", "Hisobotlar": "Отчёты", "Yaratish": "Создать",
  "🎮 O'yinga qo'shilish sahifasi": "🎮 Страница входа в игру", "📂 Viktorina import qilish": "📂 Импорт викторины",
  "💾 Zaxira nusxani yuklab olish": "💾 Скачать резервную копию", "♻️ Zaxiradan tiklash": "♻️ Восстановить из копии",
  "🔑 Parolni o'zgartirish": "🔑 Сменить пароль", "🔐 Yangi tiklash kodi": "🔐 Новый код восстановления", "🚪 Chiqish": "🚪 Выйти",
  "🌐 Til": "🌐 Язык",
  // lobby
  "QR kodni skanerlang yoki oching:": "Отсканируйте QR-код или откройте:",
  "(kompyuter bilan bir xil Wi-Fi tarmog'ida)": "(в той же сети Wi-Fi, что и компьютер)",
  "O'yin PIN kodi": "PIN-код игры",
  "Savollarni aralashtirish": "Перемешать вопросы", "Javoblarni aralashtirish": "Перемешать ответы",
  "Savolni telefonda ko'rsatish": "Показывать вопрос на телефоне", "🎲 Tasodifiy ismlar": "🎲 Случайные имена",
  "Yakka o'yin": "Каждый сам за себя", "2 jamoa": "2 команды", "3 jamoa": "3 команды", "4 jamoa": "4 команды",
  "🎯 Aniqlik rejimi": "🎯 Режим точности", "😀 Reaksiyalar": "😀 Реакции",
  "O'qish vaqti yo'q": "Без времени на чтение", "O'qish: 3 s": "Чтение: 3 с", "O'qish: 5 s": "Чтение: 5 с", "O'qish: 10 s": "Чтение: 10 с",
  "Barcha savollar": "Все вопросы", "Tasodifiy 5 ta": "Случайные 5", "Tasodifiy 10 ta": "Случайные 10", "Tasodifiy 15 ta": "Случайные 15",
  "Tasodifiy 20 ta": "Случайные 20", "Tasodifiy 30 ta": "Случайные 30",
  "⏩ Avtomatik davom etish": "⏩ Автопереход", "🔈 Ovozli o'qish": "🔈 Читать вслух", "🏁 Poyga ko'rinishi": "🏁 Вид «гонка»",
  "Har kim kira oladi": "Может войти любой", "🔒 Qulflash": "🔒 Закрыть вход",
  "Tezlik hisobga olinmaydi: har bir to'g'ri javob bir xil ball oladi": "Скорость не учитывается: каждый верный ответ стоит одинаково",
  "O'yinchilar telefondan emoji yuboradi, ular katta ekranda uchib chiqadi (savol vaqtida o'chadi)": "Игроки отправляют эмодзи с телефона, они вылетают на большом экране (во время вопроса отключено)",
  "Avval faqat savol ko'rsatiladi, javoblar va vaqt bir necha soniyadan keyin ochiladi": "Сначала показывается только вопрос, ответы и таймер — через несколько секунд",
  "Viktorinadagi savollardan tasodifiy N tasi o'ynaladi": "Играются N случайных вопросов из викторины",
  "Savol va javoblarni kompyuter ovoz chiqarib o'qiydi": "Компьютер читает вопрос и ответы вслух",
  "Har savoldan keyingi reyting poyga yo'lagi ko'rinishida: o'yinchilar ballariga qarab oldinga siljiydi": "Рейтинг после вопроса в виде гоночной трассы: игроки продвигаются по очкам",
  "Faqat ro'yxatdagi o'quvchilar kira oladi": "Войти могут только ученики из списка",
  "Boshlash →": "Начать →", "Bekor qilish": "Отмена",
  "⌨️ <kbd>Probel</kbd>/<kbd>Enter</kbd> — keyingi · <kbd>P</kbd> — pauza · <kbd>M</kbd> — ovoz · <kbd>F</kbd> — to'liq ekran": "⌨️ <kbd>Пробел</kbd>/<kbd>Enter</kbd> — далее · <kbd>P</kbd> — пауза · <kbd>M</kbd> — звук · <kbd>F</kbd> — полный экран",
  "🔒 O'yin qulflangan — yangi o'yinchilar kira olmaydi": "🔒 Игра закрыта — новые игроки не могут войти",
  "{n} ta o'yinchi": "Игроков: {n}", "O'yinchilarni kutmoqdamiz…": "Ждём игроков…",
  " · 👻 {n} ta arvoh — o'tgan o'yin natijalarini yengib ko'ring!": " · 👻 призраков: {n} — побейте результаты прошлой игры!",
  "🎓 {name}: {a}/{t} keldi": "🎓 {name}: пришли {a}/{t}", " · Hali kelmaganlar: {list}": " · Ещё нет: {list}", " · Hamma keldi! ✔": " · Все пришли! ✔",
  "Chiqarish": "Удалить из игры",
  // question screen
  "javob": "ответов", "PAUZA": "ПАУЗА", "Davom ettirish uchun bosing": "Нажмите, чтобы продолжить",
  "⏸ Pauza": "⏸ Пауза", "▶ Davom": "▶ Продолжить", "Keyingi →": "Далее →", "O'tkazib yuborish": "Пропустить",
  " · ⚡ 2× ball": " · ⚡ 2× очков", " · Ballsiz": " · Без очков", "⏳ Savolni o'qing…": "⏳ Читаем вопрос…",
  "⌨️ Javobingizni telefoningizga yozing": "⌨️ Напишите ответ на телефоне",
  "☁️ Bitta so'z yoki qisqa ibora yozing": "☁️ Напишите одно слово или короткую фразу",
  "💬 Fikringizni telefoningizga yozing": "💬 Напишите своё мнение на телефоне",
  "💡 G'oyangizni telefoningizga yozing — keyin eng yaxshilariga ovoz beramiz": "💡 Напишите идею на телефоне — потом проголосуем за лучшие",
  "🎚 Telefoningizda sonni tanlang: {min} — {max} {unit}": "🎚 Выберите число на телефоне: {min} — {max} {unit}",
  "📍 Telefoningizda rasmdagi to'g'ri joyni bosing": "📍 Нажмите на телефоне нужное место на картинке",
  "🔢 Telefoningizda to'g'ri tartibda bosing": "🔢 Нажимайте на телефоне в правильном порядке",
  "☑️ Bir nechta to'g'ri javob bo'lishi mumkin": "☑️ Верных ответов может быть несколько",
  // question type names
  "Viktorina": "Викторина", "To'g'ri / Noto'g'ri": "Верно / Неверно", "Bir nechta javob": "Несколько ответов",
  "Javobni yozish": "Ввод ответа", "Tartiblash": "Порядок", "So'rovnoma": "Опрос", "Slayd": "Слайд",
  "So'zlar buluti": "Облако слов", "Ochiq javob": "Открытый ответ", "Shkala": "Шкала", "Rasmda belgilash": "Точка на картинке",
  "Aqliy hujum": "Мозговой штурм",
  // brainstorm voting
  "🗳 Ovoz berish: eng yoqqan 3 ta g'oyani telefonda tanlang": "🗳 Голосование: выберите на телефоне 3 лучшие идеи",
  "Natijalar →": "Результаты →", "ovoz berdi": "проголосовали",
  // results, leaderboard, podium
  "Hech kim yozmadi": "Никто не написал", "✔ To'g'ri javob: {v}": "✔ Верный ответ: {v}", "O'rtacha: {v}": "Среднее: {v}",
  "✔ To'g'ri javob: ": "✔ Верный ответ: ", "✔ To'g'ri javoblar: ": "✔ Верные ответы: ", "O'yinchilar yozgan javoblar:": "Ответы игроков:",
  "✔ To'g'ri tartib:": "✔ Верный порядок:", "Yakuniy natijalar →": "Итоги →", "Reyting →": "Рейтинг →",
  "Reyting": "Рейтинг", "Keyingi savol →": "Следующий вопрос →",
  "{p}-o'rin · {n} kishi": "{p}-е место · {n} чел.", "🏆 G'olib: {name}": "🏆 Победитель: {name}",
  "💬 O'yinchilar bahosi: ⭐ {s} ({n} ta) · {l}% nimadir o'rgandi": "💬 Оценка игроков: ⭐ {s} ({n}) · {l}% узнали что-то новое",
  "💬 O'yinchilar telefonida o'yinni baholashmoqda…": "💬 Игроки оценивают игру на телефонах…",
  "📊 Batafsil hisobot": "📊 Подробный отчёт", "Qayta o'ynash": "Сыграть ещё раз",
  "Ovoz (M)": "Звук (M)", "To'liq ekran (F)": "Полный экран (F)",
},
en: {
  "O'yin o'tkazuvchi va test tuzuvchilar uchun": "For game hosts and quiz makers",
  "Kirish": "Sign in", "Ro'yxatdan o'tish": "Sign up",
  "Foydalanuvchi nomi": "Username", "Parol": "Password", "Parolni takrorlang": "Repeat password",
  "Parolni unutdingizmi?": "Forgot your password?",
  "Ro'yxatdan o'tganda berilgan <b>tiklash kodi</b> bilan yangi parol qo'ying:": "Set a new password with the <b>recovery code</b> you got when signing up:",
  "Login": "Username", "Tiklash kodi: XXXX-XXXX-XXXX-XXXX": "Recovery code: XXXX-XXXX-XXXX-XXXX",
  "Yangi parol (kamida 6 belgi)": "New password (6+ characters)", "Yangi parolni takrorlang": "Repeat new password",
  "Parolni tiklash": "Reset password", "Kod ham yo'qolganmi?": "Lost the code too?",
  "← O'yinga kirish (o'yinchilar uchun)": "← Join a game (for players)",
  "Nom va parolni kiriting": "Enter a name and password", "Parollar bir xil emas": "Passwords don't match",
  "Server bilan aloqa yo'q": "Can't reach the server", "Xatolik yuz berdi": "Something went wrong",
  "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urinib ko'ring.": "Too many attempts. Try again in a few minutes.",
  "Nom 3–20 ta lotin harfi, raqam yoki _ . - dan iborat bo'lsin": "Name: 3–20 Latin letters, digits or _ . -",
  "Parol kamida 6 ta belgidan iborat bo'lsin": "Password must be at least 6 characters",
  "Bu nom band, boshqasini tanlang": "This name is taken, choose another", "Login yoki parol noto'g'ri": "Wrong username or password",
  "🌙 Tungi rejim": "🌙 Dark mode", "☀️ Kunduzgi rejim": "☀️ Light mode",
  "Bosh sahifa": "Home", "Viktorinalarim": "My quizzes", "Sinflar": "Classes", "Guruhlar": "Groups",
  "Kashf etish": "Discover", "Hisobotlar": "Reports", "Yaratish": "Create",
  "🎮 O'yinga qo'shilish sahifasi": "🎮 Join page for players", "📂 Viktorina import qilish": "📂 Import a quiz",
  "💾 Zaxira nusxani yuklab olish": "💾 Download a backup", "♻️ Zaxiradan tiklash": "♻️ Restore from backup",
  "🔑 Parolni o'zgartirish": "🔑 Change password", "🔐 Yangi tiklash kodi": "🔐 New recovery code", "🚪 Chiqish": "🚪 Sign out",
  "🌐 Til": "🌐 Language",
  "QR kodni skanerlang yoki oching:": "Scan the QR code or open:",
  "(kompyuter bilan bir xil Wi-Fi tarmog'ida)": "(on the same Wi-Fi as this computer)",
  "O'yin PIN kodi": "Game PIN",
  "Savollarni aralashtirish": "Shuffle questions", "Javoblarni aralashtirish": "Shuffle answers",
  "Savolni telefonda ko'rsatish": "Show question on phones", "🎲 Tasodifiy ismlar": "🎲 Random nicknames",
  "Yakka o'yin": "Solo", "2 jamoa": "2 teams", "3 jamoa": "3 teams", "4 jamoa": "4 teams",
  "🎯 Aniqlik rejimi": "🎯 Accuracy mode", "😀 Reaksiyalar": "😀 Reactions",
  "O'qish vaqti yo'q": "No reading time", "O'qish: 3 s": "Reading: 3 s", "O'qish: 5 s": "Reading: 5 s", "O'qish: 10 s": "Reading: 10 s",
  "Barcha savollar": "All questions", "Tasodifiy 5 ta": "Random 5", "Tasodifiy 10 ta": "Random 10", "Tasodifiy 15 ta": "Random 15",
  "Tasodifiy 20 ta": "Random 20", "Tasodifiy 30 ta": "Random 30",
  "⏩ Avtomatik davom etish": "⏩ Auto-advance", "🔈 Ovozli o'qish": "🔈 Read aloud", "🏁 Poyga ko'rinishi": "🏁 Race view",
  "Har kim kira oladi": "Anyone can join", "🔒 Qulflash": "🔒 Lock game",
  "Tezlik hisobga olinmaydi: har bir to'g'ri javob bir xil ball oladi": "Speed doesn't count: every right answer scores the same",
  "O'yinchilar telefondan emoji yuboradi, ular katta ekranda uchib chiqadi (savol vaqtida o'chadi)": "Players send emoji from their phones; they float up on the big screen (off during questions)",
  "Avval faqat savol ko'rsatiladi, javoblar va vaqt bir necha soniyadan keyin ochiladi": "The question shows first; answers and the timer open a few seconds later",
  "Viktorinadagi savollardan tasodifiy N tasi o'ynaladi": "Play N random questions from the quiz",
  "Savol va javoblarni kompyuter ovoz chiqarib o'qiydi": "The computer reads the question and answers aloud",
  "Har savoldan keyingi reyting poyga yo'lagi ko'rinishida: o'yinchilar ballariga qarab oldinga siljiydi": "Leaderboard as a race track: players drive ahead by their score",
  "Faqat ro'yxatdagi o'quvchilar kira oladi": "Only students on the class list can join",
  "Boshlash →": "Start →", "Bekor qilish": "Cancel",
  "⌨️ <kbd>Probel</kbd>/<kbd>Enter</kbd> — keyingi · <kbd>P</kbd> — pauza · <kbd>M</kbd> — ovoz · <kbd>F</kbd> — to'liq ekran": "⌨️ <kbd>Space</kbd>/<kbd>Enter</kbd> — next · <kbd>P</kbd> — pause · <kbd>M</kbd> — sound · <kbd>F</kbd> — full screen",
  "🔒 O'yin qulflangan — yangi o'yinchilar kira olmaydi": "🔒 Game locked — new players can't join",
  "{n} ta o'yinchi": "{n} players", "O'yinchilarni kutmoqdamiz…": "Waiting for players…",
  " · 👻 {n} ta arvoh — o'tgan o'yin natijalarini yengib ko'ring!": " · 👻 {n} ghosts — beat last game's scores!",
  "🎓 {name}: {a}/{t} keldi": "🎓 {name}: {a}/{t} here", " · Hali kelmaganlar: {list}": " · Not here yet: {list}", " · Hamma keldi! ✔": " · Everyone's here! ✔",
  "Chiqarish": "Remove",
  "javob": "answers", "PAUZA": "PAUSED", "Davom ettirish uchun bosing": "Click to continue",
  "⏸ Pauza": "⏸ Pause", "▶ Davom": "▶ Resume", "Keyingi →": "Next →", "O'tkazib yuborish": "Skip",
  " · ⚡ 2× ball": " · ⚡ 2× points", " · Ballsiz": " · No points", "⏳ Savolni o'qing…": "⏳ Read the question…",
  "⌨️ Javobingizni telefoningizga yozing": "⌨️ Type your answer on your phone",
  "☁️ Bitta so'z yoki qisqa ibora yozing": "☁️ Type one word or a short phrase",
  "💬 Fikringizni telefoningizga yozing": "💬 Type your thoughts on your phone",
  "💡 G'oyangizni telefoningizga yozing — keyin eng yaxshilariga ovoz beramiz": "💡 Type your idea on your phone — then we vote for the best",
  "🎚 Telefoningizda sonni tanlang: {min} — {max} {unit}": "🎚 Pick a number on your phone: {min} — {max} {unit}",
  "📍 Telefoningizda rasmdagi to'g'ri joyni bosing": "📍 Tap the right spot on the picture on your phone",
  "🔢 Telefoningizda to'g'ri tartibda bosing": "🔢 Tap them in the right order on your phone",
  "☑️ Bir nechta to'g'ri javob bo'lishi mumkin": "☑️ There may be more than one right answer",
  "Viktorina": "Quiz", "To'g'ri / Noto'g'ri": "True / False", "Bir nechta javob": "Multiple answers",
  "Javobni yozish": "Type answer", "Tartiblash": "Puzzle", "So'rovnoma": "Poll", "Slayd": "Slide",
  "So'zlar buluti": "Word cloud", "Ochiq javob": "Open-ended", "Shkala": "Slider", "Rasmda belgilash": "Pin answer",
  "Aqliy hujum": "Brainstorm",
  "🗳 Ovoz berish: eng yoqqan 3 ta g'oyani telefonda tanlang": "🗳 Voting: pick your 3 favourite ideas on your phone",
  "Natijalar →": "Results →", "ovoz berdi": "voted",
  "Hech kim yozmadi": "Nobody wrote anything", "O'rtacha: {v}": "Average: {v}",
  "✔ To'g'ri javob: ": "✔ Correct answer: ", "✔ To'g'ri javoblar: ": "✔ Correct answers: ", "O'yinchilar yozgan javoblar:": "What players typed:",
  "✔ To'g'ri tartib:": "✔ Correct order:", "Yakuniy natijalar →": "Final results →", "Reyting →": "Leaderboard →",
  "Reyting": "Leaderboard", "Keyingi savol →": "Next question →",
  "{p}-o'rin · {n} kishi": "#{p} · {n} players", "🏆 G'olib: {name}": "🏆 Winner: {name}",
  "💬 O'yinchilar bahosi: ⭐ {s} ({n} ta) · {l}% nimadir o'rgandi": "💬 Player rating: ⭐ {s} ({n}) · {l}% learned something",
  "💬 O'yinchilar telefonida o'yinni baholashmoqda…": "💬 Players are rating the game on their phones…",
  "📊 Batafsil hisobot": "📊 Full report", "Qayta o'ynash": "Play again",
  "Ovoz (M)": "Sound (M)", "To'liq ekran (F)": "Full screen (F)",
},
};

// texts with numbers or names inside: [Uzbek pattern, {ru, en}] — $1, $2 … are the captured parts
const HPAT = [];
function H(s, vars) {
  let out = HLANG !== 'uz' && HDICT[HLANG] && HDICT[HLANG][s] !== undefined ? HDICT[HLANG][s] : null;
  if (out === null) {
    out = s;
    // the parts captured by a pattern are looked up too ("Saqlanmadi: <an Uzbek error>")
    if (HLANG !== 'uz') for (const [re, tr] of HPAT) {
      const m = s.match(re);
      if (m && tr[HLANG]) { out = tr[HLANG].replace(/\$(\d)/g, (x, n) => m[n] !== undefined ? H(m[n]) : x); break; }
    }
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);
  return out;
}

/* Automatic translation of everything the page draws: text pieces, placeholders and tooltips.
   A text is translated only when it matches a dictionary entry exactly, so quiz titles,
   names and answers that people typed are left alone. */
const HSKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'KBD']);
window.__hmiss = new Set();  // texts that still have no translation (for finding gaps)
function hTranslateText(node) {
  const raw = node.nodeValue, key = raw.trim().replace(/\s+/g, ' ');  // line breaks in the HTML don't matter
  if (!key || key.length > 600 || !/[A-Za-z]/.test(key)) return;
  const tr = H(key);
  if (tr !== key) node.nodeValue = (/^\s/.test(raw) ? ' ' : '') + tr + (/\s$/.test(raw) ? ' ' : '');
  else if (/[a-z]{3}/.test(key) && !/[а-яё]/i.test(key)) window.__hmiss.add(key);  // Cyrillic = already translated
}
function hTranslateTree(root) {
  if (HLANG === 'uz' || !root) return;
  if (root.nodeType === 3) { if (!HSKIP.has(root.parentNode?.nodeName) && !root.parentNode?.closest?.('[data-noh]')) hTranslateText(root); return; }
  if (root.nodeType !== 1 || HSKIP.has(root.nodeName) || root.closest('[data-noh]')) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => HSKIP.has(n.parentNode.nodeName) || n.parentNode.closest('[data-noh]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(hTranslateText);
  [root, ...root.querySelectorAll('[placeholder],[title]')].forEach(el => {
    for (const a of ['placeholder', 'title']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const t = H(v.trim()); if (t !== v.trim()) el.setAttribute(a, t); }
    }
  });
}
function hStartAuto() {
  if (HLANG === 'uz') return;
  hTranslateTree(document.body);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') hTranslateTree(m.target);
      else m.addedNodes.forEach(hTranslateTree);
    }
  }).observe(document.body, {childList: true, subtree: true, characterData: true});
}
// alert / confirm / prompt messages go through the dictionary as well
if (HLANG !== 'uz') {
  const tx = s => typeof s === 'string' ? s.split('\n').map(l => H(l.trim()) === l.trim() ? l : l.replace(l.trim(), H(l.trim()))).join('\n') : s;
  const _a = window.alert.bind(window), _c = window.confirm.bind(window), _p = window.prompt.bind(window);
  window.alert = m => _a(tx(m)); window.confirm = m => _c(tx(m)); window.prompt = (m, d) => _p(tx(m), d);
}
function applyHostI18n(root = document) {
  root.querySelectorAll('[data-h]').forEach(el => {
    if (el.dataset.uz === undefined) el.dataset.uz = el.innerHTML.trim();
    el.innerHTML = H(el.dataset.uz);
  });
  root.querySelectorAll('[data-hp]').forEach(el => {
    if (el.dataset.uzp === undefined) el.dataset.uzp = el.placeholder;
    el.placeholder = H(el.dataset.uzp);
  });
  root.querySelectorAll('[data-ht]').forEach(el => {
    if (el.dataset.uzt === undefined) el.dataset.uzt = el.title;
    el.title = H(el.dataset.uzt);
  });
  document.documentElement.lang = HLANG;
  document.querySelectorAll('.hlang').forEach(s => s.value = HLANG);
}
function setHostLang(l) {
  if (!HOST_LANGS[l] || l === HLANG) return;
  if (typeof dirty !== 'undefined' && dirty && !confirm("Saqlanmagan o'zgarishlar bor. Tilni almashtirish uchun sahifa qayta yuklanadi. Davom etilsinmi?")) {
    document.querySelectorAll('.hlang').forEach(s => s.value = HLANG); return;
  }
  try { localStorage.setItem('bilimdon_hlang', JSON.stringify(l)); } catch (e) {}
  if (typeof dirty !== 'undefined') dirty = false;
  location.reload();  // every screen is drawn again in the new language (a running game reconnects)
}
/* ---------- dashboard, library, editor, classes, groups, reports and dialogs ----------
   [Uzbek, Russian, English] */
[
  // home
  ["Bugun qanday viktorina o'tkazamiz?", "Какую викторину проведём сегодня?", "Which quiz shall we play today?"],
  ["+ Yangi viktorina", "+ Новая викторина", "+ New quiz"], ["▶ Tezkor o'yin", "▶ Быстрая игра", "▶ Quick game"],
  ["viktorina", "викторин", "quizzes"], ["savol", "вопросов", "questions"], ["o'yin o'tkazildi", "игр проведено", "games played"], ["ishtirokchi", "участников", "players"],
  ["Viktorina yaratish", "Создать викторину", "Create a quiz"], ["7 xil savol turi, rasmlar, slaydlar", "Разные типы вопросов, картинки, слайды", "Many question types, pictures, slides"],
  ["Import qilish", "Импорт", "Import"], ["Excel, CSV yoki .json fayldan", "Из Excel, CSV или .json", "From Excel, CSV or .json"],
  ["Savollar va o'yinchilar bo'yicha", "По вопросам и игрокам", "By question and player"],
  ["O'yinga qo'shilish", "Войти в игру", "Join a game"], ["O'yinchilar sahifasini ochish", "Открыть страницу игроков", "Open the players' page"],
  ["So'nggi viktorinalar", "Последние викторины", "Recent quizzes"], ["Hammasini ko'rish →", "Смотреть все →", "See all →"],
  ["So'nggi o'yinlar", "Последние игры", "Recent games"], ["Barcha hisobotlar →", "Все отчёты →", "All reports →"],
  ["Hali o'yin o'tkazilmagan. Viktorinani tanlab ▶ O'ynash tugmasini bosing.", "Игр ещё не было. Выберите викторину и нажмите ▶ Играть.", "No games yet. Pick a quiz and press ▶ Play."],
  // library and quiz cards
  ["📚 Viktorinalarim", "📚 Мои викторины", "📚 My quizzes"], ["📚 Hammasi", "📚 Все", "📚 All"],
  ["▶ O'ynash", "▶ Играть", "▶ Play"], ["📝 Vazifa", "📝 Задание", "📝 Assign"], ["📝 Vazifa sifatida berish", "📝 Дать как задание", "📝 Assign as homework"],
  ["Vazifa sifatida berish", "Дать как задание", "Assign as homework"], ["Tahrirlash", "Редактировать", "Edit"], ["Boshqa amallar", "Другие действия", "More actions"],
  ["🤝 Hammualliflar", "🤝 Соавторы", "🤝 Co-authors"], ["📖 Mashq havolasi", "📖 Ссылка для тренировки", "📖 Practice link"],
  ["yoqilgan", "включена", "on"], ["📤 Boshqa hostga nusxa yuborish", "📤 Отправить копию другому ведущему", "📤 Send a copy to another host"],
  ["📁 Papkaga ko'chirish", "📁 Переместить в папку", "📁 Move to folder"], ["📊 Statistika", "📊 Статистика", "📊 Statistics"],
  ["🖨 Qog'oz test (chop etish)", "🖨 Бумажный тест (печать)", "🖨 Paper test (print)"], ["⧉ Nusxa olish", "⧉ Копировать", "⧉ Duplicate"],
  ["⧉ O'zimga nusxa olish", "⧉ Копия себе", "⧉ Copy to my library"], ["🗑 O'chirish", "🗑 Удалить", "🗑 Delete"],
  ["🚪 Hammualliflikdan chiqish", "🚪 Выйти из соавторов", "🚪 Leave as co-author"],
  ["Hali viktorina yo'q.", "Викторин пока нет.", "No quizzes yet."], ["+ Birinchi viktorinani yarating", "+ Создайте первую викторину", "+ Create your first quiz"],
  ["Viktorinani qidirish…", "Поиск викторины…", "Search quizzes…"],
  // classes
  ["🎓 Sinflar", "🎓 Классы", "🎓 Classes"], ["+ Yangi sinf ro'yxati", "+ Новый список класса", "+ New class list"],
  ["O'quvchilar ro'yxatini bir marta kiriting. Keyin o'yin lobbisida yoki vazifa berishda shu sinfni tanlasangiz, faqat ro'yxatdagi o'quvchilar kira oladi, hisobotda esa qatnashmaganlar ko'rinadi.",
   "Введите список учеников один раз. Если потом выбрать этот класс в лобби или при выдаче задания, войти смогут только ученики из списка, а в отчёте будет видно, кто не участвовал.",
   "Enter the student list once. When you pick this class in the lobby or for an assignment, only listed students can join, and reports show who was absent."],
  ["📈 Reyting", "📈 Рейтинг", "📈 Ranking"], ["✏️ Tahrirlash", "✏️ Изменить", "✏️ Edit"],
  ["🎓 Sinf ro'yxatini tahrirlash", "🎓 Изменить список класса", "🎓 Edit class list"], ["🎓 Yangi sinf ro'yxati", "🎓 Новый список класса", "🎓 New class list"],
  ["Sinf nomi", "Название класса", "Class name"], ["O'quvchilar — har birini yangi qatorga (ism, 16 belgigacha)", "Ученики — каждый с новой строки (имя, до 16 символов)", "Students — one per line (name, up to 16 characters)"],
  ["O'quvchilar kirishda ismni aynan shunday yozishi kerak (katta-kichik harf farq qilmaydi).", "При входе ученики должны написать имя именно так (регистр не важен).", "Students must type their name exactly like this when joining (case doesn't matter)."],
  ["Saqlash", "Сохранить", "Save"], ["Yopish", "Закрыть", "Close"], ["Bekor qilish", "Отмена", "Cancel"],
  ["O'quvchi", "Ученик", "Student"], ["Qatnashdi", "Участвовал", "Played"], ["Jami ball", "Всего очков", "Total points"], ["To'g'ri", "Верно", "Correct"],
  ["Bu sinf bilan hali o'yin yoki vazifa o'tkazilmagan. Lobbida yoki vazifa berishda shu sinfni tanlang.", "С этим классом ещё не было игр и заданий. Выберите класс в лобби или при выдаче задания.", "No games or assignments with this class yet. Pick the class in the lobby or when assigning."],
  ["📥 CSV", "📥 CSV", "📥 CSV"],
  // groups and discover
  ["👥 Guruhlar", "👥 Группы", "👥 Groups"], ["+ Yangi guruh", "+ Новая группа", "+ New group"],
  ["Masalan, maktabingiz o'qituvchilari: guruhga qo'shilganlar bir-birining viktorinalarini ko'radi, o'ynaydi va nusxa oladi. Viktorinani guruhga ulashish uchun muharrirda ⚙ sozlamalardan guruhni tanlang.",
   "Например, учителя вашей школы: участники группы видят викторины друг друга, играют в них и копируют. Чтобы поделиться викториной с группой, выберите группу в настройках ⚙ редактора.",
   "For example, the teachers of your school: group members see, play and copy each other's quizzes. To share a quiz with a group, pick the group in the editor's ⚙ settings."],
  ["Siz hali hech qaysi guruhda emassiz. \"+ Yangi guruh\" bilan yarating yoki hamkasbingiz sizni o'z guruhiga qo'shsin.", "Вы пока не состоите ни в одной группе. Создайте её кнопкой «+ Новая группа» или попросите коллегу добавить вас.", "You're not in any group yet. Create one with \"+ New group\" or ask a colleague to add you."],
  ["🌍 Kashf etish", "🌍 Обзор", "🌍 Discover"],
  ["Boshqa hostlar ommaviy qilgan viktorinalar. O'ynang yoki o'z kutubxonangizga nusxa oling. O'z viktorinangizni bu yerga qo'shish uchun muharrirda ⚙ sozlamalardan \"Ommaviy\" ni yoqing.",
   "Викторины, которые другие ведущие сделали общедоступными. Играйте или копируйте себе. Чтобы добавить свою, включите «Общедоступная» в настройках ⚙ редактора.",
   "Quizzes other hosts made public. Play them or copy them to your library. To add yours, turn on \"Public\" in the editor's ⚙ settings."],
  ["Hali ommaviy viktorinalar yo'q. Birinchi bo'lib o'zingiznikini ulashing!", "Общедоступных викторин пока нет. Поделитесь своей первым!", "No public quizzes yet. Be the first to share yours!"],
  // reports
  ["📊 Hisobotlar", "📊 Отчёты", "📊 Reports"], ["🎮 Jonli o'yinlar", "🎮 Живые игры", "🎮 Live games"], ["📝 Vazifalar", "📝 Задания", "📝 Assignments"],
  ["Batafsil hisobotni ko'rish uchun nomini bosing.", "Нажмите на название, чтобы открыть подробный отчёт.", "Click a title to open the full report."],
  ["Hali tugallangan o'yinlar yo'q.", "Завершённых игр пока нет.", "No finished games yet."],
  ["Hali vazifa berilmagan. Viktorina kartasidagi 📝 tugmasi bilan vazifa bering.", "Заданий пока нет. Выдайте задание кнопкой 📝 на карточке викторины.", "No assignments yet. Use the 📝 button on a quiz card."],
  ["← Hisobotlar", "← Отчёты", "← Reports"], ["🏅 Sertifikatlar", "🏅 Сертификаты", "🏅 Certificates"], ["📊 Excel (.xlsx)", "📊 Excel (.xlsx)", "📊 Excel (.xlsx)"],
  ["💬 O'yinchilar fikri", "💬 Мнение игроков", "💬 Player feedback"], ["❓ Savollar bo'yicha", "❓ По вопросам", "❓ By question"], ["👥 O'yinchilar bo'yicha", "👥 По игрокам", "👥 By player"],
  ["O'rin", "Место", "Place"], ["O'yinchi", "Игрок", "Player"], ["Ball", "Очки", "Points"], ["To'g'ri javoblar", "Верные ответы", "Correct answers"],
  ["Savol", "Вопрос", "Question"], ["Turi", "Тип", "Type"], ["Javob berdi", "Ответили", "Answered"], ["baholanmaydi", "без оценки", "not scored"],
  ["o'yinchi", "игроков", "players"], ["to'g'ri javoblar", "верных ответов", "correct answers"], ["g'olib", "победитель", "winner"],
  ["⏳ tugatmagan", "⏳ не закончил", "⏳ not finished"],
  // editor
  ["⚙ Viktorina sozlamalari", "⚙ Настройки викторины", "⚙ Quiz settings"], ["Viktorina sozlamalari", "Настройки викторины", "Quiz settings"],
  ["📊 Excel'dan", "📊 Из Excel", "📊 From Excel"], ["Savollarni Excel yoki CSV fayldan qo'shish", "Добавить вопросы из Excel или CSV", "Add questions from Excel or CSV"],
  ["⬇ Eksport", "⬇ Экспорт", "⬇ Export"], ["👁 Sinab ko'rish", "👁 Попробовать", "👁 Try it"], ["Sinab ko'rish", "Попробовать", "Try it"],
  ["Viktorinani o'quvchi sifatida sinab ko'rish (saqlamasdan)", "Пройти викторину как ученик (без сохранения)", "Try the quiz as a student (without saving)"],
  ["Chiqish", "Выйти", "Exit"], ["💾 Saqlash", "💾 Сохранить", "💾 Save"], ["+ Savol qo'shish", "+ Добавить вопрос", "+ Add question"],
  ["Savolni shu yerga yozing", "Напишите вопрос здесь", "Type your question here"], ["Slayd sarlavhasi", "Заголовок слайда", "Slide title"],
  ["Rasm yoki YouTube video qo'shish (ixtiyoriy)", "Добавить картинку или видео YouTube (по желанию)", "Add a picture or YouTube video (optional)"],
  ["Rasmni shu yerga sudrab tashlang yoki Ctrl+V bilan qo'ying", "Перетащите картинку сюда или вставьте Ctrl+V", "Drag a picture here or paste with Ctrl+V"],
  ["📁 Kompyuterdan rasm yuklash", "📁 Загрузить картинку с компьютера", "📁 Upload a picture"],
  ["yoki rasm havolasi: https://...", "или ссылка на картинку: https://...", "or a picture link: https://..."],
  ["YouTube havolasi: https://youtu.be/... (?t=30 — 30-soniyadan)", "Ссылка YouTube: https://youtu.be/... (?t=30 — с 30-й секунды)", "YouTube link: https://youtu.be/... (?t=30 — from 30 s)"],
  ["🎵 Audio qo'shish (mp3, ogg, wav, m4a — 10 MB gacha)", "🎵 Добавить аудио (mp3, ogg, wav, m4a — до 10 МБ)", "🎵 Add audio (mp3, ogg, wav, m4a — up to 10 MB)"],
  ["Savol turi", "Тип вопроса", "Question type"], ["⏱ Vaqt chegarasi", "⏱ Время", "⏱ Time limit"], ["⭐ Ball", "⭐ Очки", "⭐ Points"],
  ["Oddiy ball", "Обычные очки", "Normal points"], ["⚡ Ikki baravar ball", "⚡ Двойные очки", "⚡ Double points"], ["Ballsiz", "Без очков", "No points"],
  ["Tez javob bergan ko'proq ball oladi (1000 gacha).", "Кто отвечает быстрее, получает больше очков (до 1000).", "Faster answers score more (up to 1000)."],
  ["💡 Izoh (ixtiyoriy)", "💡 Пояснение (по желанию)", "💡 Explanation (optional)"],
  ["Nega bu javob to'g'ri? Javobdan keyin ko'rsatiladi", "Почему этот ответ верный? Показывается после ответа", "Why is this answer right? Shown after answering"],
  ["Natijalar ekranida, o'yinchi telefonida va o'yin oxiridagi tahlilda chiqadi.", "Показывается на экране результатов, на телефоне игрока и в разборе в конце игры.", "Shown on the results screen, on players' phones and in the end-of-game review."],
  ["⧉ Nusxa", "⧉ Копия", "⧉ Duplicate"],
  ["To'g'ri javobni ✔ bilan belgilang.", "Отметьте верный ответ ✔.", "Mark the right answer with ✔."],
  ["Barcha to'g'ri javoblarni ✔ bilan belgilang. O'yinchi hammasini topsa ball oladi.", "Отметьте ✔ все верные ответы. Игрок получает очки, если найдёт все.", "Mark every right answer with ✔. A player scores by finding them all."],
  ["So'rovnomada to'g'ri javob yo'q — natijalar faqat diagrammada ko'rsatiladi.", "В опросе нет верного ответа — результаты показываются только на диаграмме.", "Polls have no right answer — results are only shown on the chart."],
  ["+ Javob qo'shish", "+ Добавить ответ", "+ Add answer"], ["+ Yana bir to'g'ri variant", "+ Ещё один верный вариант", "+ Another accepted answer"],
  ["+ Element qo'shish", "+ Добавить элемент", "+ Add item"], ["To'g'ri javob", "Верный ответ", "Correct answer"], ["Boshqa qabul qilinadigan javob", "Другой допустимый ответ", "Another accepted answer"],
  ["O'yinchi javobni o'zi yozadi. Katta-kichik harf va ortiqcha bo'shliqlar hisobga olinmaydi.", "Игрок пишет ответ сам. Регистр и лишние пробелы не учитываются.", "Players type the answer. Case and extra spaces are ignored."],
  ["Elementlarni TO'G'RI tartibda yozing — o'yinchilarga aralashtirib ko'rsatiladi.", "Запишите элементы в ПРАВИЛЬНОМ порядке — игрокам они покажутся перемешанными.", "Write the items in the RIGHT order — players see them shuffled."],
  ["Slayd — javobsiz ma'lumot sahifasi. O'yinda \"Keyingi\" bosilguncha ekranda turadi.", "Слайд — страница с информацией без ответов. В игре остаётся на экране, пока не нажать «Далее».", "A slide is an info page with no answers. It stays on screen until you press \"Next\"."],
  ["Slayd matni: tushuntirish, qoida, qiziqarli fakt…", "Текст слайда: объяснение, правило, интересный факт…", "Slide text: an explanation, a rule, a fun fact…"],
  ["O'yinchilar bitta so'z yoki qisqa ibora yozadi (20 belgigacha). Ko'p yozilgan so'zlar ekranda kattaroq chiqadi. To'g'ri javob yo'q, ball berilmaydi.",
   "Игроки пишут одно слово или короткую фразу (до 20 символов). Частые слова на экране крупнее. Верного ответа нет, очков нет.",
   "Players type one word or a short phrase (up to 20 characters). Common words show bigger. No right answer, no points."],
  ["O'yinchilar erkin javob yozadi (250 belgigacha). Javoblar katta ekranda kartochkalarda ko'rsatiladi. To'g'ri javob yo'q, ball berilmaydi.",
   "Игроки пишут свободный ответ (до 250 символов). Ответы показываются карточками на большом экране. Верного ответа нет, очков нет.",
   "Players write a free answer (up to 250 characters). Answers show as cards on the big screen. No right answer, no points."],
  ["1-bosqich: o'yinchilar o'z g'oyasini yozadi (80 belgigacha). 2-bosqich (25 soniya): hamma boshqalarning g'oyalaridan eng yoqqan 3 tasiga ovoz beradi. Natijada g'oyalar ovozlar soni bo'yicha chiqadi. Ball berilmaydi.",
   "Этап 1: игроки пишут свою идею (до 80 символов). Этап 2 (25 секунд): каждый голосует за 3 лучшие чужие идеи. В итоге идеи выстраиваются по числу голосов. Очков нет.",
   "Round 1: players write an idea (up to 80 characters). Round 2 (25 seconds): everyone votes for their 3 favourite ideas of others. Ideas are ranked by votes. No points."],
  ["Eng kichik", "Минимум", "Minimum"], ["Eng katta", "Максимум", "Maximum"], ["Qadam", "Шаг", "Step"], ["✔ To'g'ri javob", "✔ Верный ответ", "✔ Correct answer"],
  ["Ruxsat etilgan farq (±)", "Допустимое отклонение (±)", "Allowed difference (±)"], ["Birlik (ixtiyoriy)", "Единица (по желанию)", "Unit (optional)"], ["yil, %, km…", "год, %, км…", "year, %, km…"],
  ["O'yinchi slayderni surib son tanlaydi. To'g'ri javobdan \"ruxsat etilgan farq\" ichida bo'lsa — to'g'ri hisoblanadi (masalan 1991 ±2 → 1989–1993).",
   "Игрок выбирает число ползунком. Если оно в пределах «допустимого отклонения» от верного — ответ засчитывается (например 1991 ±2 → 1989–1993).",
   "Players pick a number with a slider. Within the \"allowed difference\" of the answer counts as right (e.g. 1991 ±2 → 1989–1993)."],
  ["Avval yuqoridan rasm qo'shing (xarita, sxema, chizma…), keyin to'g'ri joyni belgilaysiz.", "Сначала добавьте картинку сверху (карта, схема, чертёж…), затем отметьте верное место.", "First add a picture above (map, diagram, drawing…), then mark the right spot."],
  ["Rasmdagi TO'G'RI joyni bosing — yashil doira to'g'ri hudud. O'yinchi shu doira ichini bossa, javob to'g'ri.", "Нажмите ВЕРНОЕ место на картинке — зелёный круг это верная область. Если игрок нажмёт внутри круга, ответ верный.", "Click the RIGHT spot on the picture — the green circle is the right area. Players who tap inside it are right."],
  ["⚠️ Savol matni yozilmagan", "⚠️ Не написан текст вопроса", "⚠️ The question has no text"],
  // question types (picker and descriptions)
  ["Savol turini tanlang", "Выберите тип вопроса", "Choose a question type"],
  ["🔘 Viktorina", "🔘 Викторина", "🔘 Quiz"], ["⚖️ To'g'ri / Noto'g'ri", "⚖️ Верно / Неверно", "⚖️ True / False"], ["☑️ Bir nechta javob", "☑️ Несколько ответов", "☑️ Multiple answers"],
  ["⌨️ Javobni yozish", "⌨️ Ввод ответа", "⌨️ Type answer"], ["🔢 Tartiblash", "🔢 Порядок", "🔢 Puzzle"], ["📊 So'rovnoma", "📊 Опрос", "📊 Poll"], ["🖼 Slayd", "🖼 Слайд", "🖼 Slide"],
  ["☁️ So'zlar buluti", "☁️ Облако слов", "☁️ Word cloud"], ["💬 Ochiq javob", "💬 Открытый ответ", "💬 Open-ended"], ["🎚 Shkala", "🎚 Шкала", "🎚 Slider"],
  ["📍 Rasmda belgilash", "📍 Точка на картинке", "📍 Pin answer"], ["💡 Aqliy hujum", "💡 Мозговой штурм", "💡 Brainstorm"],
  ["Bitta to'g'ri javob", "Один верный ответ", "One right answer"], ["Ikki variantli savol", "Вопрос с двумя вариантами", "Two-option question"],
  ["Bir nechta to'g'ri javob", "Несколько верных ответов", "Several right answers"], ["O'yinchi javobni o'zi yozadi", "Игрок пишет ответ сам", "Players type the answer"],
  ["To'g'ri tartibga keltirish", "Расставить в правильном порядке", "Put in the right order"], ["Fikr so'rash, ball yo'q", "Узнать мнение, без очков", "Ask opinions, no points"],
  ["Ma'lumot ko'rsatish, javobsiz", "Показать информацию, без ответов", "Show information, no answers"], ["Hamma bitta so'z yozadi, ball yo'q", "Все пишут одно слово, без очков", "Everyone types a word, no points"],
  ["Erkin fikr yoziladi, ball yo'q", "Свободный ответ, без очков", "Free answer, no points"], ["Sonni tanlash: yil, foiz, miqdor", "Выбор числа: год, процент, количество", "Pick a number: year, percent, amount"],
  ["Rasmdagi to'g'ri joyni bosish", "Нажать верное место на картинке", "Tap the right spot on a picture"], ["G'oya yoziladi, keyin eng yaxshisiga ovoz beriladi", "Пишут идеи, потом голосуют за лучшие", "Write ideas, then vote for the best"],
  ["📊 Ko'p savolni birdaniga qo'shish", "📊 Добавить много вопросов сразу", "📊 Add many questions at once"],
  ["Savollarni Excel jadvalida yozib, shu yerga yuklang.", "Запишите вопросы в таблицу Excel и загрузите сюда.", "Write questions in an Excel sheet and upload it here."],
  ["📊 Excel/CSV'dan import", "📊 Импорт из Excel/CSV", "📊 Import from Excel/CSV"], ["📥 Shablonni yuklab olish", "📥 Скачать шаблон", "📥 Download template"],
  ["📚 Boshqa viktorinadan", "📚 Из другой викторины", "📚 From another quiz"], ["📋 Matndan (nusxa-qo'y)", "📋 Из текста (вставить)", "📋 From text (paste)"],
  ["📚 Savollar banki", "📚 Банк вопросов", "📚 Question bank"], ["Boshqa viktorinadan savollarni tanlab, shu viktorinaga qo'shing.", "Выберите вопросы из другой викторины и добавьте их в эту.", "Pick questions from another quiz and add them to this one."],
  ["Qo'shish", "Добавить", "Add"], ["+ Qo'shish", "+ Добавить", "+ Add"],
  // quiz settings
  ["Nomi", "Название", "Title"], ["Tavsif", "Описание", "Description"], ["Muqova rasmi havolasi", "Ссылка на обложку", "Cover picture link"], ["Muqova yo'q", "Без обложки", "No cover"],
  ["📁 Yuklash", "📁 Загрузить", "📁 Upload"], ["🌍 Ommaviy — boshqa hostlar \"Kashf etish\" bo'limida ko'ra oladi", "🌍 Общедоступная — другие ведущие увидят её в «Обзоре»", "🌍 Public — other hosts can see it in \"Discover\""],
  ["👥 Guruhga ulashish", "👥 Поделиться с группой", "👥 Share with a group"], ["— ulashilmaydi —", "— не делиться —", "— not shared —"], ["Tayyor", "Готово", "Done"],
  // text import
  ["📋 Matndan savollar qo'shish", "📋 Добавить вопросы из текста", "📋 Add questions from text"],
  ["Word, Telegram yoki kitobdagi testni shu yerga qo'ying. Savollar orasida bo'sh qator qoldiring. To'g'ri javobni", "Вставьте сюда тест из Word, Telegram или книги. Между вопросами оставляйте пустую строку. Верный ответ отметьте", "Paste a test from Word, Telegram or a book. Leave an empty line between questions. Mark the right answer with"],
  ["yoki", "или", "or"],
  ["bilan belgilang (yoki \"Javob: B\" qatorini yozing). Bir nechta to'g'ri javob bo'lsa — \"bir nechta javob\" savoli bo'ladi. \"Izoh: …\" qatori izoh sifatida qo'shiladi.",
   "(или строкой «Ответ: B»). Если верных ответов несколько — получится вопрос «несколько ответов». Строка «Пояснение: …» станет пояснением.",
   "(or a line \"Answer: B\"). Several right answers make a \"multiple answers\" question. A line \"Explanation: …\" becomes the explanation."],
  ["Namuna", "Пример", "Sample"],
  // dialogs
  ["Kim bajaradi", "Кто выполняет", "Who does it"], ["Muddat", "Срок", "Deadline"], ["Vazifa yaratish", "Создать задание", "Create assignment"],
  ["Havolani yoqish", "Включить ссылку", "Turn the link on"],
  ["kartochkalar", "карточки", "flashcards"], ["(savol — javob) va", "(вопрос — ответ) и", "(question — answer) and"], ["\"O'zingni sina\"", "«Проверь себя»", "\"Test yourself\""],
  ["testi, vaqt cheklovisiz. Natijalar saqlanmaydi, bu — mashq.", "— тест без ограничения времени. Результаты не сохраняются, это тренировка.", "— a test with no time limit. Results aren't saved; it's practice."],
  ["⚠️ Havolani olgan har kim to'g'ri javoblarni ko'ra oladi. Shuning uchun nazorat testlari uchun yoqmang.", "⚠️ Любой, у кого есть ссылка, увидит верные ответы. Не включайте её для контрольных.", "⚠️ Anyone with the link can see the right answers. Don't turn it on for real tests."],
  ["Hali hammuallif yo'q.", "Соавторов пока нет.", "No co-authors yet."], ["Hammuallifning login nomini", "Логин соавтора", "Co-author's username"],
  ["Olib tashlash", "Убрать", "Remove"],
  ["🖨 Qog'oz test", "🖨 Бумажный тест", "🖨 Paper test"], ["🔑 Oxirida javoblar kaliti (alohida sahifa)", "🔑 Ключ ответов в конце (отдельная страница)", "🔑 Answer key at the end (separate page)"],
  ["🔀 Savollar va javoblarni aralashtirish", "🔀 Перемешать вопросы и ответы", "🔀 Shuffle questions and answers"], ["🖼 Rasmlarni ham chiqarish", "🖼 Печатать картинки", "🖼 Include pictures"],
  ["Nechta variant (har biri o'z kaliti bilan)", "Сколько вариантов (у каждого свой ключ)", "How many versions (each with its own key)"], ["🖨 Tayyorlash", "🖨 Подготовить", "🖨 Prepare"],
  ["Bu viktorina hali o'ynalmagan. O'yin yoki vazifadan keyin bu yerda natijalar to'planadi.", "В эту викторину ещё не играли. После игр и заданий здесь соберётся статистика.", "This quiz hasn't been played yet. Results collect here after games and assignments."],
  ["🔐 Tiklash kodingiz", "🔐 Ваш код восстановления", "🔐 Your recovery code"],
  ["Parolni unutsangiz, shu kod bilan yangi parol qo'yasiz. Kod", "Если забудете пароль, этим кодом зададите новый. Код показывается", "If you forget your password, this code sets a new one. The code is shown"],
  ["faqat hozir", "только сейчас", "only now"],
  ["ko'rsatiladi — yozib oling yoki rasmga oling va xavfsiz joyda saqlang. Har bir kod bir marta ishlaydi.", "— запишите или сфотографируйте его и храните в надёжном месте. Каждый код срабатывает один раз.", "— write it down or take a photo and keep it safe. Each code works once."],
  ["📋 Nusxa olish", "📋 Копировать", "📋 Copy"], ["Saqlab oldim", "Я сохранил", "I saved it"],
  ["Server egasi tiklaydi: server oynasini yoping (Ctrl+C) va", "Восстановит владелец сервера: закройте окно сервера (Ctrl+C) и в папке", "The server owner can reset it: close the server window (Ctrl+C) and in the"],
  ["papkasida shu buyruqni bering:", "выполните команду:", "folder run:"],
  ["U vaqtinchalik parol chiqaradi. Kirgach, profil menyusidan yangi parol qo'ying.", "Она выдаст временный пароль. После входа задайте новый в меню профиля.", "It prints a temporary password. After signing in, set a new one in the profile menu."],
  ["🔑 Parolni o'zgartirish", "🔑 Сменить пароль", "🔑 Change password"], ["Hozirgi parol", "Текущий пароль", "Current password"],
  ["Yangi parol (kamida 6 belgi)", "Новый пароль (не менее 6 символов)", "New password (6+ characters)"],
].forEach(([uz, ru, en]) => { HDICT.ru[uz] = ru; HDICT.en[uz] = en; });

// texts with a number or a name inside
HPAT.push(
  [/^(\d+(?:\.\d+)?) soniya$/, {ru: '$1 сек', en: '$1 sec'}], [/^(\d+(?:\.\d+)?) daqiqa$/, {ru: '$1 мин', en: '$1 min'}],
  [/^(\d+) soat$/, {ru: '$1 ч', en: '$1 h'}], [/^(\d+) kun$/, {ru: '$1 дн.', en: '$1 days'}], [/^1 kun$/, {ru: '1 день', en: '1 day'}],
  [/^(\d+) hafta$/, {ru: '$1 нед.', en: '$1 week(s)'}], [/^(\d+) savol$/, {ru: '$1 вопр.', en: '$1 questions'}],
  [/^(\d+) o'quvchi$/, {ru: 'учеников: $1', en: '$1 students'}], [/^(\d+) ta variant$/, {ru: 'вариантов: $1', en: '$1 version(s)'}],
  [/^Savol (\d+) \/ (\d+)\. Chapdagi savollarni sudrab tartibini o'zgartirish mumkin\.$/, {ru: 'Вопрос $1 из $2. Порядок можно менять, перетаскивая вопросы слева.', en: 'Question $1 of $2. Drag the questions on the left to reorder them.'}],
  [/^Salom, (.+)! 👋$/, {ru: 'Привет, $1! 👋', en: 'Hi, $1! 👋'}],
  [/^📈 (.+) — reyting$/, {ru: '📈 $1 — рейтинг', en: '📈 $1 — ranking'}], [/^📊 (.+) — statistika$/, {ru: '📊 $1 — статистика', en: '📊 $1 — statistics'}],
  [/^"(.+)" bo'yicha o'quvchilar mustaqil tayyorlanishi uchun havola:$/, {ru: 'Ссылка для самостоятельной подготовки учеников по «$1»:', en: 'A link for students to practise "$1" on their own:'}],
  [/^"(.+)" — internetsiz dars yoki nazorat ishi uchun chop etiladigan variant\.$/, {ru: '«$1» — печатный вариант для урока без интернета или контрольной.', en: '"$1" — a printable version for a lesson without internet or a test.'}],
  [/^"(.+)" — o'yinchilar o'z telefonida, o'z vaqtida, o'z tezligida o'ynaydi\. Natijalar "Hisobotlar → Vazifalar" bo'limida chiqadi\.$/,
   {ru: '«$1» — ученики проходят на своём телефоне, когда удобно и в своём темпе. Результаты — в разделе «Отчёты → Задания».', en: '"$1" — players play on their own phones, at their own time and pace. Results appear in "Reports → Assignments".'}],
  [/^"(.+)"ni boshqa o'qituvchilar ham tahrirlay oladi\. Viktorina sizda qoladi: faqat siz o'chira olasiz, papka va ulashish sozlamalari ham sizniki\. Ikki kishi bir vaqtda saqlasa, ikkinchisiga ogohlantirish chiqadi\.$/,
   {ru: '«$1» смогут редактировать и другие учителя. Викторина остаётся вашей: удалить её можете только вы, папка и доступ тоже ваши. Если двое сохранят одновременно, второй получит предупреждение.',
    en: 'Other teachers can edit "$1" too. The quiz stays yours: only you can delete it, and folder and sharing stay your choice. If two people save at once, the second gets a warning.'}],
  [/^🤝 (.+) bilan hammualliflik$/, {ru: '🤝 соавтор с $1', en: '🤝 co-authoring with $1'}],
  [/^(\d+) marta o'ynaldi$/, {ru: 'сыграно раз: $1', en: 'played $1 times'}],
  // alert / confirm / prompt lines with a name or number inside
  [/^"(.+)" hammualliflikdan chiqasizmi\? Viktorina (.+)da qoladi, sizning ro'yxatingizdan yo'qoladi\.$/, {ru: 'Выйти из соавторов «$1»? Викторина останется у $2 и исчезнет из вашего списка.', en: 'Leave "$1" as co-author? The quiz stays with $2 and leaves your list.'}],
  [/^(\d+) ta savol qo'shildi\.$/, {ru: 'Добавлено вопросов: $1.', en: '$1 questions added.'}],
  [/^O'tkazib yuborilgan qatorlar \(javoblar yetarli emas\): (.+)$/, {ru: 'Пропущенные строки (мало ответов): $1', en: 'Skipped rows (not enough answers): $1'}],
  [/^O'tkazib yuborilgan qatorlar: (.+)$/, {ru: 'Пропущенные строки: $1', en: 'Skipped rows: $1'}],
  [/^Import xatosi: (.*)$/, {ru: 'Ошибка импорта: $1', en: 'Import error: $1'}], [/^Saqlanmadi: (.*)$/, {ru: 'Не сохранено: $1', en: 'Not saved: $1'}],
  [/^Rasm yuklanmadi: (.*)$/, {ru: 'Картинка не загрузилась: $1', en: 'Picture upload failed: $1'}], [/^Audio yuklanmadi: (.*)$/, {ru: 'Аудио не загрузилось: $1', en: 'Audio upload failed: $1'}],
  [/^Nusxa olinmadi: (.*)$/, {ru: 'Не удалось скопировать: $1', en: 'Copy failed: $1'}],
  [/^"(.+)" nusxasini qaysi hostga yuboramiz\?$/, {ru: 'Какому ведущему отправить копию «$1»?', en: 'Which host should get a copy of "$1"?'}],
  [/^✔ Nusxa (.+) kutubxonasiga yuborildi\.$/, {ru: '✔ Копия отправлена в библиотеку $1.', en: '✔ A copy was sent to $1\'s library.'}],
  [/^"(.+)" qaysi papkaga\?$/, {ru: 'В какую папку переместить «$1»?', en: 'Which folder for "$1"?'}], [/^Mavjud papkalar: (.+)$/, {ru: 'Есть папки: $1', en: 'Existing folders: $1'}],
  [/^"(.+)" o'chirilsinmi\? Buni qaytarib bo'lmaydi\.$/, {ru: 'Удалить «$1»? Это нельзя отменить.', en: 'Delete "$1"? This can\'t be undone.'}],
  [/^(\d+)-savol o'chirilsinmi\?$/, {ru: 'Удалить вопрос $1?', en: 'Delete question $1?'}], [/^(\d+)-savol: (.+)$/, {ru: 'Вопрос $1: $2', en: 'Question $1: $2'}],
  [/^⚠️ (.+) bu viktorinani siz ochganingizdan keyin o'zgartirdi\.$/, {ru: '⚠️ $1 изменил(а) эту викторину после того, как вы её открыли.', en: '⚠️ $1 changed this quiz after you opened it.'}],
  [/^(.+) o'yindan chiqarilsinmi\?$/, {ru: 'Удалить $1 из игры?', en: 'Remove $1 from the game?'}], [/^(.+) shu ism bilan qayta kira olmasinmi\?$/, {ru: 'Запретить $1 входить снова под этим именем?', en: 'Block $1 from joining again with this name?'}],
  [/^"(.+)" ro'yxati o'chirilsinmi\?$/, {ru: 'Удалить список «$1»?', en: 'Delete the list "$1"?'}],
  [/^(\d+) ta viktorina va (\d+) ta sinf ro'yxati kutubxonangizga QO'SHILADI\.$/, {ru: 'В вашу библиотеку БУДУТ ДОБАВЛЕНЫ викторин: $1 и списков классов: $2.', en: '$1 quizzes and $2 class lists will be ADDED to your library.'}],
  [/^✔ Tiklandi: (\d+) ta viktorina, (\d+) ta sinf ro'yxati$/, {ru: '✔ Восстановлено: викторин $1, списков классов $2', en: '✔ Restored: $1 quizzes, $2 class lists'}],
  [/^\((\d+) tasi o'tkazib yuborildi\)$/, {ru: '(пропущено: $1)', en: '($1 skipped)'}],
  // reports list and report headers
  [/^(\S+ \S+) · (\d+) o'yinchi · (\d+)% to'g'ri(.*)$/, {ru: '$1 · игроков: $2 · верно $3%$4', en: '$1 · $2 players · $3% correct$4'}],
  [/^(\S+ \S+) · (\d+) o'yinchi(.*)$/, {ru: '$1 · игроков: $2$3', en: '$1 · $2 players$3'}],
  [/^· muddat: (\S+ \S+) · (\d+) qatnashchi, (\d+) tugatdi$/, {ru: '· срок: $1 · участников: $2, закончили: $3', en: '· due: $1 · $2 players, $3 finished'}],
  [/^egasi: (.+)$/, {ru: 'владелец: $1', en: 'owner: $1'}], [/^rekord: (\d+)$/, {ru: 'рекорд: $1', en: 'record: $1'}],
  [/^👥 Barcha qatnashchilar \((\d+)\)$/, {ru: '👥 Все участники ($1)', en: '👥 All players ($1)'}],
  [/^Qatnashmaganlar \((\d+)\):$/, {ru: 'Не участвовали ($1):', en: 'Absent ($1):'}],
  [/^🎓 (.+): (\d+) \/ (\d+) o'quvchi qatnashdi$/, {ru: '🎓 $1: участвовали $2 из $3', en: '🎓 $1: $2 of $3 students took part'}],
  [/^Shu sinf ro'yxati bilan o'tkazilgan (\d+) ta o'yin va vazifa bo'yicha jami natija\.$/, {ru: 'Итог по $1 играм и заданиям с этим списком класса.', en: 'Totals across $1 games and assignments with this class list.'}],
  [/^Vazifa · PIN (\d+) · berilgan: (.+) · muddat: (.+?)( \(tugagan\))? · (\d+)\/(\d+) tugatdi$/, {ru: 'Задание · PIN $1 · выдано: $2 · срок: $3 · закончили $5/$6', en: 'Assignment · PIN $1 · given: $2 · due: $3 · $5/$6 finished'}],
);
[
  ["Yangi tiklash kodi olish uchun hozirgi parolingizni kiriting.", "Чтобы получить новый код восстановления, введите текущий пароль.", "Enter your current password to get a new recovery code."],
  ["(Eski kod ishlamay qoladi.)", "(Старый код перестанет работать.)", "(The old code will stop working.)"], ["Parol noto'g'ri", "Неверный пароль", "Wrong password"],
  ["✔ Parol o'zgartirildi. Boshqa qurilmalardagi kirishlar bekor qilindi.", "✔ Пароль изменён. Входы на других устройствах отменены.", "✔ Password changed. Other devices were signed out."],
  ["Ko'pi bilan 100 ta savol bo'lishi mumkin", "Не больше 100 вопросов", "At most 100 questions"], ["Ko'pi bilan 100 ta savol", "Не больше 100 вопросов", "At most 100 questions"],
  ["Faylda savol topilmadi. Shablonni yuklab olib, o'shandagidek to'ldiring.", "В файле нет вопросов. Скачайте шаблон и заполните как в нём.", "No questions in the file. Download the template and fill it in the same way."],
  ["Tekshirib chiqing va 💾 Saqlang.", "Проверьте и нажмите 💾 Сохранить.", "Check them and press 💾 Save."], ["Audio 10 MB dan oshmasin", "Аудио не больше 10 МБ", "Audio must be under 10 MB"],
  ["Uning login nomini yozing:", "Введите его логин:", "Type their username:"], ["Bunday login topilmadi", "Такой логин не найден", "No such username"],
  ["O'zingizga yubora olmaysiz", "Нельзя отправить самому себе", "You can't send it to yourself"], ["Uning kutubxonasi to'la", "Его библиотека заполнена", "Their library is full"], ["Yuborilmadi", "Не отправлено", "Not sent"],
  ["Yangi nom yozsangiz — yangi papka ochiladi. Bo'sh qoldirsangiz — papkadan chiqariladi.", "Новое имя создаст новую папку. Пусто — убрать из папки.", "A new name makes a new folder. Leave empty to remove it from its folder."],
  ["Brauzer yangi oynani to'sib qo'ydi — qalqib chiquvchi oynalarga ruxsat bering.", "Браузер заблокировал новое окно — разрешите всплывающие окна.", "The browser blocked the new window — allow pop-ups."],
  ["Saqlanmagan o'zgarishlar bor. Chiqib ketilsinmi?", "Есть несохранённые изменения. Выйти?", "You have unsaved changes. Leave anyway?"],
  ["Kamida bitta savol bo'lishi kerak", "Нужен хотя бы один вопрос", "There must be at least one question"],
  ["Sinab ko'rish uchun baholanadigan savol yo'q (so'rovnoma va ochiq savollar mashqda chiqmaydi).", "Нет оцениваемых вопросов для пробы (опросы и открытые вопросы в тренировке не показываются).", "No scored questions to try (polls and open questions aren't used in practice)."],
  ["Viktorinada xato bor — tekshirib qayta urinib ko'ring.", "В викторине есть ошибка — проверьте и попробуйте снова.", "The quiz has an error — check it and try again."],
  ["OK — sizning variantingiz saqlanadi (uning o'zgarishlari yo'qoladi).", "OK — сохранится ваш вариант (его изменения пропадут).", "OK — your version is saved (their changes are lost)."],
  ["Bekor qilish — saqlamasdan qolasiz; nusxa olib, keyin solishtirishingiz mumkin.", "Отмена — ничего не сохраняется; можно сделать копию и сравнить.", "Cancel — nothing is saved; you can make a copy and compare."],
  ["Bu o'yinning viktorinasi kutubxonada topilmadi (o'chirilgan bo'lishi mumkin).", "Викторина этой игры не найдена в библиотеке (возможно, удалена).", "This game's quiz isn't in the library (it may have been deleted)."],
  ["OK — qayta kirishni taqiqlash", "OK — запретить вход", "OK — block from rejoining"], ["Bekor qilish — faqat chiqarish (qayta kirishi mumkin)", "Отмена — только удалить (сможет войти снова)", "Cancel — just remove (they may rejoin)"],
  ["Bu o'yinda o'yinchilar yo'q.", "В этой игре нет игроков.", "This game has no players."],
  ["Vazifa yopilsinmi? Shundan keyin hech kim javob bera olmaydi.", "Закрыть задание? После этого никто не сможет отвечать.", "Close the assignment? Nobody can answer after that."],
  ["Vazifa va uning natijalari o'chirilsinmi? Buni qaytarib bo'lmaydi.", "Удалить задание и его результаты? Это нельзя отменить.", "Delete the assignment and its results? This can't be undone."],
  ["Bu fayl Bilimdon zaxira nusxasi emas", "Это не резервная копия Bilimdon", "This file isn't a Bilimdon backup"], ["Zaxiradan tiklansinmi?", "Восстановить из копии?", "Restore from backup?"],
  ["Mavjud ma'lumotlar o'chirilmaydi.", "Существующие данные не удаляются.", "Existing data isn't deleted."], ["Tiklanmadi: fayl noto'g'ri", "Не восстановлено: неверный файл", "Not restored: wrong file"],
  ["Guruh nomi (masalan: 12-maktab matematika o'qituvchilari):", "Название группы (например: учителя математики школы №12):", "Group name (e.g. School 12 maths teachers):"],
  ["Ko'pi bilan 20 ta guruh yaratish mumkin", "Можно создать не больше 20 групп", "You can create at most 20 groups"], ["Guruh yaratilmadi", "Группа не создана", "Group not created"],
  ["U allaqachon guruhda", "Он уже в группе", "Already in the group"], ["Guruh to'la (50 kishi)", "Группа заполнена (50 человек)", "The group is full (50 people)"], ["Qo'shilmadi", "Не добавлено", "Not added"],
  ["Guruhdan chiqasizmi? Sizning viktorinalaringiz guruhda ko'rinmay qoladi.", "Выйти из группы? Ваши викторины перестанут быть видны в группе.", "Leave the group? Your quizzes will no longer show in it."],
  ["Bu a'zo guruhdan chiqarilsinmi?", "Удалить этого участника из группы?", "Remove this member from the group?"],
  ["Guruh o'chirilsinmi? Viktorinalar o'chmaydi, faqat guruhdan ulashish bekor bo'ladi.", "Удалить группу? Викторины останутся, отменится только доступ через группу.", "Delete the group? Quizzes stay; only group sharing ends."],
  ["O'yin yaratilmadi", "Игра не создана", "The game wasn't created"], ["Boshqa viktorina yo'q", "Других викторин нет", "No other quizzes"],
  ["Kamida bitta savolni belgilang", "Отметьте хотя бы один вопрос", "Tick at least one question"], ["Bu natija o'chirilsinmi?", "Удалить этот результат?", "Delete this result?"],
  ["✔ Kutubxonada", "✔ В библиотеке", "✔ In library"],
  ["viktorinada xato bor", "в викторине ошибка", "the quiz has an error"], ["qayta kiring", "войдите снова", "sign in again"],
  ["viktorina topilmadi (egasi o'chirgan yoki sizni hammualliflikdan chiqargan)", "викторина не найдена (владелец удалил её или убрал вас из соавторов)", "quiz not found (the owner deleted it or removed you as co-author)"],
  ["Savol matni yozilmagan", "Не написан текст вопроса", "The question has no text"],
  ["📘 Qo'llanma", "📘 Руководство", "📘 Guide"], ["Maxfiylik siyosati", "Конфиденциальность", "Privacy"], ["Foydalanish shartlari", "Условия использования", "Terms of use"],
  // picture search
  ["🔍 Internetdan rasm qidirish (bepul rasmlar)", "🔍 Найти картинку в интернете (бесплатные)", "🔍 Search the web for a picture (free)"],
  ["🔍 Rasm qidirish", "🔍 Поиск картинок", "🔍 Picture search"], ["Masalan: quyosh tizimi, olma, xarita", "Например: солнечная система, яблоко, карта", "e.g. solar system, apple, map"],
  ["Qidirish", "Найти", "Search"], ["Yana ko'rsatish", "Показать ещё", "Show more"],
  ["Rasmlar", "Картинки с", "Pictures from"], ["'dan — bepul, darsda ishlatish mumkin. Tanlangan rasm saytingizga saqlanadi.", " — бесплатные, можно использовать на уроке. Выбранная картинка сохраняется на вашем сайте.", " — free to use in class. The chosen picture is saved on your site."],
  ["Rasm xizmatiga ulanib bo'lmadi — internetni tekshiring.", "Не удалось связаться с сервисом картинок — проверьте интернет.", "Couldn't reach the picture service — check the internet."],
  ["Rasm qidirish yoqilmagan.", "Поиск картинок не включён.", "Picture search is off."],
  ["Hech narsa topilmadi. Boshqa so'z bilan (yoki inglizcha) urinib ko'ring.", "Ничего не найдено. Попробуйте другое слово (или по-английски).", "Nothing found. Try another word (or English)."],
  ["Rasm saqlanmadi, boshqasini tanlang.", "Картинка не сохранилась, выберите другую.", "The picture wasn't saved, pick another."],
  // AI question generation
  ["✨ AI bilan yaratish", "✨ Создать с ИИ", "✨ Create with AI"], ["✨ AI bilan savol yaratish", "✨ Создание вопросов с ИИ", "✨ Create questions with AI"],
  ["Mavzu", "Тема", "Topic"], ["Masalan: Amir Temur davri; kasrlarni qo'shish; fotosintez", "Например: эпоха Амира Темура; сложение дробей; фотосинтез", "e.g. the age of Amir Temur; adding fractions; photosynthesis"],
  ["Nechta savol", "Сколько вопросов", "How many"], ["Sinf / daraja", "Класс / уровень", "Grade / level"], ["masalan: 7-sinf", "например: 7 класс", "e.g. grade 7"], ["Til", "Язык", "Language"],
  ["✨ Yaratish", "✨ Создать", "✨ Create"],
  ["Savollarni Claude (Anthropic) yozadi. Qo'shishdan oldin tekshirib chiqing — AI ham xato qilishi mumkin. Mavzu matni Anthropic'ga yuboriladi, o'quvchilar ma'lumoti yuborilmaydi.",
   "Вопросы пишет Claude (Anthropic). Проверьте их перед добавлением — ИИ тоже ошибается. В Anthropic отправляется только тема, данные учеников не отправляются.",
   "Questions are written by Claude (Anthropic). Check them before adding — AI can make mistakes. Only the topic is sent to Anthropic, never student data."],
  ["Mavzuni yozing", "Напишите тему", "Type a topic"], ["Kamida bitta savol turini belgilang", "Отметьте хотя бы один тип вопроса", "Tick at least one question type"],
  ["⏳ AI savollar yozmoqda… (odatda 20–60 soniya)", "⏳ ИИ пишет вопросы… (обычно 20–60 секунд)", "⏳ AI is writing questions… (usually 20–60 seconds)"],
  ["AI hozir band yoki chegaraga yetildi — bir ozdan keyin urinib ko'ring.", "ИИ сейчас занят или достигнут лимит — попробуйте чуть позже.", "The AI is busy or a limit was reached — try again shortly."],
  ["Juda ko'p so'rov — bir necha daqiqadan keyin urinib ko'ring.", "Слишком много запросов — попробуйте через несколько минут.", "Too many requests — try again in a few minutes."],
  ["Serverdagi API kaliti noto'g'ri yoki ruxsati yo'q.", "Ключ API на сервере неверный или без доступа.", "The server's API key is wrong or lacks access."],
  ["AI xizmatiga ulanib bo'lmadi — internetni tekshiring.", "Не удалось связаться с ИИ — проверьте интернет.", "Couldn't reach the AI service — check the internet."],
  ["AI yoqilmagan.", "ИИ не включён.", "AI is off."], ["Savollar yaratilmadi — mavzuni boshqacha yozib ko'ring.", "Вопросы не созданы — сформулируйте тему иначе.", "No questions were made — try wording the topic differently."],
  ["Savol chiqmadi — mavzuni aniqroq yozib ko'ring.", "Вопросов не получилось — уточните тему.", "No questions came out — make the topic more specific."],
  ["Belgilanganlarni qo'shish", "Добавить отмеченные", "Add the ticked ones"], ["✔ To'g'ri", "✔ Верно", "✔ True"], ["✔ Noto'g'ri", "✔ Неверно", "✔ False"],
  // reports list, groups, certificates, statistics
  ["Batafsil →", "Подробнее →", "Details →"], ["faol", "активно", "active"], ["tugagan", "завершено", "ended"], ["⏹ Yopish", "⏹ Закрыть", "⏹ Close"],
  ["👻 Arvohlarga qarshi", "👻 Против призраков", "👻 Against ghosts"], ["Shu o'yin natijalariga qarshi qayta o'ynash", "Сыграть снова против результатов этой игры", "Play again against this game's results"],
  ["Guruh viktorinalari", "Викторины группы", "Group quizzes"], ["🔗 Ulashish", "🔗 Поделиться", "🔗 Share"], ["🗑 Guruhni o'chirish", "🗑 Удалить группу", "🗑 Delete group"],
  ["🚪 Guruhdan chiqish", "🚪 Выйти из группы", "🚪 Leave group"], ["A'zolar", "Участники", "Members"], ["A'zo qo'shish (login)", "Добавить участника (логин)", "Add a member (username)"],
  ["Guruhda hali viktorina yo'q. Viktorinangizni muharrirda ⚙ sozlamalar → \"Guruhga ulashish\" orqali qo'shing.", "В группе пока нет викторин. Добавьте свою в редакторе: ⚙ настройки → «Поделиться с группой».", "No quizzes in the group yet. Add yours in the editor: ⚙ settings → \"Share with a group\"."],
  ["Har bir o'quvchi uchun alohida A4 sahifa tayyorlanadi — chop eting yoki PDF qilib saqlang.", "Для каждого ученика готовится отдельная страница A4 — распечатайте или сохраните в PDF.", "A separate A4 page is made for each student — print it or save as PDF."],
  ["Kimlar uchun", "Для кого", "For whom"], ["🥇🥈🥉 G'oliblar (1–3 o'rin)", "🥇🥈🥉 Призёры (1–3 место)", "🥇🥈🥉 Winners (places 1–3)"], ["Imzo (o'qituvchi ismi)", "Подпись (имя учителя)", "Signature (teacher's name)"],
  ["marta o'ynaldi", "раз сыграно", "times played"], ["qatnashchi", "участников", "players"], ["o'rtacha natija", "средний результат", "average score"], ["rekord", "рекорд", "record"],
  ["🧩 Eng qiyin savollar birinchi", "🧩 Сначала самые трудные вопросы", "🧩 Hardest questions first"], ["O'ynaldi", "Сыграно", "Played"],
  ["💡 Natijasi 40% dan past savollarni darsda qayta tushuntirish yoki savol matnini aniqroq qilish foydali.", "💡 Вопросы с результатом ниже 40% стоит разобрать на уроке или сформулировать яснее.", "💡 Questions below 40% are worth explaining again in class or rewording."],
  ["✔ Ro'yxatdagi hamma qatnashdi", "✔ Участвовали все из списка", "✔ Everyone on the list took part"],
  ["Saqlanmagan o'zgarishlar bor. Tilni almashtirish uchun sahifa qayta yuklanadi. Davom etilsinmi?", "Есть несохранённые изменения. Для смены языка страница перезагрузится. Продолжить?", "You have unsaved changes. Changing the language reloads the page. Continue?"],
].forEach(([uz, ru, en]) => { HDICT.ru[uz] = ru; HDICT.en[uz] = en; });
const hostLangSelect = () => `<select class="hlang" onchange="setHostLang(this.value)">${Object.entries(HOST_LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>`;
