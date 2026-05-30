// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;

// Говорим Telegram, что наше приложение готово и можно его показывать
tg.ready();

// Разворачиваем приложение на всю высоту (если оно открылось не на весь экран)
tg.expand(); 

// Получаем элементы интерфейса
const userCard = document.getElementById('user-card');
const greeting = document.getElementById('greeting');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const mainAvatar = document.getElementById('main-avatar');
const mainBtn = document.getElementById('main-btn');

// Элементы модального окна
const createModal = document.getElementById('create-library-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const libraryInput = document.getElementById('library-name-input');
const colorSwatches = document.querySelectorAll('.color-swatch');

// Логика для выбора эмодзи (кастомная панель)
const emojiDisplay = document.getElementById('emoji-display');
const selectedEmoji = document.getElementById('selected-emoji');
const emojiPlus = document.getElementById('emoji-plus');
const emojiPickerModal = document.getElementById('emoji-picker-modal');
const closeEmojiPickerBtn = document.getElementById('close-emoji-picker');
const emojiGrid = document.getElementById('emoji-grid');
let currentSelectedEmoji = '';

const popularEmojis = [
    '😀', '🤣', '🥰', '🧠', '❤️', '⚡️', '💥', '🔥'
];

// Инициализация сетки эмодзи
if (emojiGrid) {
    popularEmojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'emoji-grid-item';
        item.innerHTML = `<img src="https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple" alt="${emoji}" />`;
        item.addEventListener('click', () => {
            currentSelectedEmoji = emoji;
            selectedEmoji.innerHTML = `<img src="https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple" alt="${emoji}" style="width: 40px; height: 40px; pointer-events: none;" />`;
            emojiPickerModal.style.display = 'none';
            if (emojiPlus) emojiPlus.style.display = 'none';
        });
        emojiGrid.appendChild(item);
    });
}

if (emojiDisplay) emojiDisplay.addEventListener('click', () => emojiPickerModal.style.display = 'flex');
if (closeEmojiPickerBtn) closeEmojiPickerBtn.addEventListener('click', () => emojiPickerModal.style.display = 'none');

// Структура данных для хранения библиотек
let librariesData = {};
let currentLibraryId = null;

// Генератор ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- Обертки для Telegram CloudStorage с поддержкой Promises ---
const cloud = {
    setItem: (key, value) => new Promise(res => tg.CloudStorage.setItem(key, value, (err, ok) => res(!err && ok))),
    getItem: (key) => new Promise(res => tg.CloudStorage.getItem(key, (err, val) => res(err ? null : val))),
    removeItem: (key) => new Promise(res => tg.CloudStorage.removeItem(key, (err, ok) => res(!err && ok)))
};

// Сохранение списка ID всех библиотек
async function saveLibraryIndex() {
    const ids = Object.keys(librariesData);
    await cloud.setItem('spectrum_index', JSON.stringify(ids));
}

// Умное сохранение библиотеки с фрагментацией (Chunking)
async function saveLibraryToCloud(id) {
    const lib = librariesData[id];
    if (!lib) return;
    
    const meta = { name: lib.name, emoji: lib.emoji, color: lib.color };
    await cloud.setItem(`meta_${id}`, JSON.stringify(meta));
    
    const wordsStr = JSON.stringify(lib.words || []);
    const chunkSize = 3500; // Безопасный размер куска (лимит Telegram 4096 байт)
    const chunksCount = Math.ceil(wordsStr.length / chunkSize);
    
    await cloud.setItem(`chunks_${id}`, chunksCount.toString());
    
    for (let i = 0; i < chunksCount; i++) {
        const chunk = wordsStr.substring(i * chunkSize, (i + 1) * chunkSize);
        await cloud.setItem(`words_${id}_${i}`, chunk);
    }
}

// Загрузка всех данных из облака при старте
async function loadAllFromCloud() {
    const indexStr = await cloud.getItem('spectrum_index');
    if (!indexStr) return; 
    
    try {
        const ids = JSON.parse(indexStr);
        for (const id of ids) {
            const metaStr = await cloud.getItem(`meta_${id}`);
            if (!metaStr) continue;
            const meta = JSON.parse(metaStr);
            
            const chunksStr = await cloud.getItem(`chunks_${id}`);
            const chunksCount = parseInt(chunksStr || '0');
            
            let wordsStr = '';
            for (let i = 0; i < chunksCount; i++) {
                const chunk = await cloud.getItem(`words_${id}_${i}`);
                if (chunk) wordsStr += chunk;
            }
            
            let words = [];
            if (wordsStr) words = JSON.parse(wordsStr);
            
            librariesData[id] = { ...meta, words };
            createLibraryCard(id, meta.name, meta.emoji, meta.color);
        }
    } catch (e) {
        console.error("Cloud load error:", e);
    }
}

let selectedFolderColorClass = 'folder-color-white';

// Обработчик выбора цвета папки
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedFolderColorClass = swatch.getAttribute('data-color-class');
    });
});

// Элемент списка библиотек
const librariesList = document.getElementById('libraries-list');

// Проверяем, открыто ли приложение внутри Telegram
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    
    // Показываем карточку
    userCard.style.display = 'flex';
    
    // Формируем приветствие
    greeting.textContent = `Hello, ${user.first_name}!`;
    
    // Очищаем информацию под именем
    userInfo.innerHTML = '';

    // Устанавливаем инициал в аватарку
    const initial = user.first_name.charAt(0).toUpperCase();
    userAvatar.textContent = initial;
    if (mainAvatar) mainAvatar.textContent = initial;
    
    // Если Telegram передал фото (это бывает не всегда, зависит от настроек), 
    // можно установить его фоном. 
    if (user.photo_url) {
        userAvatar.style.backgroundImage = `url('${user.photo_url}')`;
        userAvatar.style.backgroundSize = 'cover';
        userAvatar.textContent = ''; // Убираем букву
        
        if (mainAvatar) {
            mainAvatar.style.backgroundImage = `url('${user.photo_url}')`;
            mainAvatar.textContent = '';
        }
    }

    // Индикация загрузки из облака
    userInfo.textContent = "Syncing with Telegram Cloud...";
    mainBtn.style.display = 'none'; // Скрываем кнопку до завершения загрузки

    loadAllFromCloud().then(() => {
        const count = Object.keys(librariesData).length;
        userInfo.textContent = `Loaded ${count}/24 sets.`;
        mainBtn.style.display = 'block'; // Показываем кнопку
    });

} else {
    // Если открыли просто в браузере (не в Telegram)
    userCard.style.display = 'flex';
    greeting.textContent = "Hello, Guest!";
    userInfo.textContent = "Please open this link inside Telegram as a Mini App.";
} 

// Обработчик кнопки
mainBtn.addEventListener('click', () => {
    // Скрываем начальный экран
    userCard.style.display = 'none';
    
    // Показываем главную страницу
    document.getElementById('main-page').style.display = 'block';
    
    // Прячем свечение начального экрана
    document.querySelector('.glow-container').style.display = 'none';
});

// Обработчик кнопки плюс
document.getElementById('add-btn').addEventListener('click', () => {
    // Проверка лимита в 24 библиотеки
    if (Object.keys(librariesData).length >= 24) {
        tg.showAlert("Limit reached: You can create up to 24 libraries.");
        return;
    }

    // Открываем модальное окно
    createModal.style.display = 'flex';
    libraryInput.value = ''; // Очищаем поле ввода
    
    currentSelectedEmoji = '';
    if (selectedEmoji) {
        selectedEmoji.innerHTML = `<img src="https://emojicdn.elk.sh/%F0%9F%98%80?style=apple" alt="😀" style="width: 40px; height: 40px; pointer-events: none; filter: grayscale(100%) opacity(0.6);" />`;
    }
    if (emojiPlus) emojiPlus.style.display = ''; // Возвращаем плюсик

    // Сбрасываем выбранный цвет на дефолтный (первый кружок) при открытии
    colorSwatches.forEach(s => s.classList.remove('selected'));
    colorSwatches[0].classList.add('selected');
    selectedFolderColorClass = 'folder-color-white';
    
    // Небольшая задержка перед фокусом, чтобы анимация (если добавим) успела пройти
    setTimeout(() => libraryInput.focus(), 50); 
});

// Обработчик кнопки отмены
cancelBtn.addEventListener('click', () => {
    createModal.style.display = 'none';
});

// Вынесено в отдельную функцию, чтобы переиспользовать при загрузке из облака
function createLibraryCard(id, name, emoji, color) {
    const card = document.createElement('div');
    card.className = `library-card ${color}`;
    card.dataset.id = id;
    
    const title = document.createElement('h3');
    title.className = 'library-title';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.justifyContent = 'center';
    title.style.gap = '8px';
    
    if (emoji) {
        title.innerHTML = `<img src="https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple" alt="${emoji}" style="width: 22px; height: 22px; flex-shrink: 0;" /> <span>${name}</span>`;
    } else {
        title.textContent = name;
    }
    
    card.appendChild(title);
    card.addEventListener('click', () => openLibrary(id));
    librariesList.appendChild(card);
}

// Обработчик кнопки сохранения новой библиотеки
saveBtn.addEventListener('click', () => {
    const newLibraryName = libraryInput.value.trim();
    const libraryEmoji = currentSelectedEmoji;
    
    if (newLibraryName) {
        console.log("Создана новая библиотека:", newLibraryName);
        
        const libId = generateId();
        librariesData[libId] = {
            name: newLibraryName,
            emoji: libraryEmoji,
            color: selectedFolderColorClass,
            words: []
        };
        
        createLibraryCard(libId, newLibraryName, libraryEmoji, selectedFolderColorClass);
        
        // Асинхронно сохраняем изменения в Telegram Cloud
        saveLibraryIndex();
        saveLibraryToCloud(libId);
        
        createModal.style.display = 'none';
    } else {
        // Если поле пустое, можно слегка "потрясти" инпут или просто вернуть фокус
        libraryInput.focus();
    }
});

// --- Логика просмотра библиотеки и добавления слов ---
const mainPage = document.getElementById('main-page');
const libraryPage = document.getElementById('library-page');
const studyPage = document.getElementById('study-page');
const libraryTitleDisplay = document.getElementById('library-title-display');
const studyTitleDisplay = document.getElementById('study-title-display');
const wordsListContainer = document.getElementById('words-list');
const studyBtn = document.getElementById('study-btn');
const wordInput = document.getElementById('word-input');
const translationInput = document.getElementById('translation-input');
const addWordBtn = document.getElementById('add-word-btn');
const addWordForm = document.getElementById('add-word-form');

function openLibrary(id) {
    currentLibraryId = id;
    const lib = librariesData[id];
    
    if (lib.emoji) {
        libraryTitleDisplay.innerHTML = `<img src="https://emojicdn.elk.sh/${encodeURIComponent(lib.emoji)}?style=apple" alt="${lib.emoji}" style="width: 28px; height: 28px; margin-right: 8px;" />${lib.name}`;
        libraryTitleDisplay.style.display = 'flex';
        libraryTitleDisplay.style.alignItems = 'center';
        libraryTitleDisplay.style.justifyContent = 'center';
    } else {
        libraryTitleDisplay.textContent = lib.name;
        libraryTitleDisplay.style.display = '';
    }
    mainPage.style.display = 'none';
    libraryPage.style.display = 'block';
    
    // Очищаем поля и обновляем цвет кнопки при входе
    wordInput.value = '';
    translationInput.value = '';
    validateWordInputs();

    renderWordsList();
}

document.getElementById('back-to-main-btn').addEventListener('click', () => {
    libraryPage.style.display = 'none';
    mainPage.style.display = 'block';
    currentLibraryId = null;
});

// Проверка полей на заполненность (меняем цвет кнопки)
function validateWordInputs() {
    const term = wordInput.value.trim();
    const trans = translationInput.value.trim();
    
    if (term && trans) {
        addWordBtn.classList.remove('btn-disabled-red');
        addWordBtn.classList.add('btn-ready-green');
    } else {
        addWordBtn.classList.remove('btn-ready-green');
        addWordBtn.classList.add('btn-disabled-red');
    }
}

// Основная функция добавления слова
function tryAddWord() {
    if (!currentLibraryId) return;
    
    const term = wordInput.value.trim();
    const trans = translationInput.value.trim();
    
    if (term && trans) {
        librariesData[currentLibraryId].words.push({ term, trans });
        wordInput.value = '';
        translationInput.value = '';
        wordInput.focus();
        renderWordsList();
        validateWordInputs(); // Сбрасываем кнопку обратно на красную
        
        saveLibraryToCloud(currentLibraryId); // Сохраняем в облако
    }
}

// Слушатели ввода для смены цвета кнопки на лету
wordInput.addEventListener('input', validateWordInputs);
translationInput.addEventListener('input', validateWordInputs);

// Обработчик нажатия Enter в поле ввода слова
wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (wordInput.value.trim() && translationInput.value.trim()) {
            tryAddWord(); // Если оба поля заполнены, добавляем слово
        } else {
            translationInput.focus(); // Иначе переносим фокус
        }
    }
});

// Обработчик нажатия Enter в поле перевода
translationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (wordInput.value.trim() && translationInput.value.trim()) {
            tryAddWord(); // Если оба поля заполнены, добавляем слово
        } else {
            wordInput.focus(); // Иначе переносим фокус обратно на слово
        }
    }
});

// Обработчик формы (клик на плюс и кнопка "Готово" на мобильной клавиатуре)
addWordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    tryAddWord();
});

function renderWordsList() {
    wordsListContainer.innerHTML = '';
    const words = librariesData[currentLibraryId].words;
    
    studyBtn.style.display = words.length > 0 ? 'block' : 'none';
    
    words.forEach((w, index) => {
        const item = document.createElement('div');
        item.className = 'word-item';
        
        const left = document.createElement('div');
        left.className = 'word-item-left';
        
        const termEl = document.createElement('div');
        termEl.className = 'word-term';
        termEl.textContent = w.term;
        
        const transEl = document.createElement('div');
        transEl.className = 'word-trans';
        transEl.textContent = w.trans;
        
        left.appendChild(termEl);
        left.appendChild(transEl);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'word-delete-btn';
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        delBtn.addEventListener('click', () => {
            librariesData[currentLibraryId].words.splice(index, 1);
            renderWordsList();
            saveLibraryToCloud(currentLibraryId); // Сохраняем удаление в облако
        });
        
        item.appendChild(left);
        item.appendChild(delBtn);
        wordsListContainer.appendChild(item);
    });
}

// --- Логика изучения (Study Mode) ---
let currentStudyIndex = 0;
let isCardFlipped = false;
let studyWords = [];
let studyUpdateTimeout;

const flashcard = document.getElementById('flashcard');
const cardWord = document.getElementById('card-word');
const cardTranslation = document.getElementById('card-translation');
const studyProgress = document.getElementById('study-progress');

function updateStudyCard() {
    const w = studyWords[currentStudyIndex];
    studyProgress.textContent = `${currentStudyIndex + 1}/${studyWords.length}`;
    
    clearTimeout(studyUpdateTimeout); // Сбрасываем таймер, если пользователь быстро нажимает Next

    if (isCardFlipped) {
        flashcard.classList.remove('flipped');
        isCardFlipped = false;
        
        // Небольшая задержка перед сменой текста, чтобы карточка успела начать переворачиваться (повернуться ребром)
        studyUpdateTimeout = setTimeout(() => {
            cardWord.textContent = w.term;
            cardTranslation.textContent = w.trans;
        }, 150);
    } else {
        cardWord.textContent = w.term;
        cardTranslation.textContent = w.trans;
    }
}

studyBtn.addEventListener('click', () => {
    if (!currentLibraryId) return;
    studyWords = librariesData[currentLibraryId].words;
    if (studyWords.length === 0) return;
    
    currentStudyIndex = 0;
    isCardFlipped = false;
    flashcard.classList.remove('flipped');
    
    const lib = librariesData[currentLibraryId];
    if (lib.emoji) {
        studyTitleDisplay.innerHTML = `<img src="https://emojicdn.elk.sh/${encodeURIComponent(lib.emoji)}?style=apple" alt="${lib.emoji}" style="width: 28px; height: 28px; margin-right: 8px;" />${lib.name}`;
        studyTitleDisplay.style.display = 'flex';
        studyTitleDisplay.style.alignItems = 'center';
        studyTitleDisplay.style.justifyContent = 'center';
    } else {
        studyTitleDisplay.textContent = lib.name;
        studyTitleDisplay.style.display = '';
    }
    
    updateStudyCard();
    libraryPage.style.display = 'none';
    studyPage.style.display = 'block';
});

document.getElementById('back-to-lib-btn').addEventListener('click', () => {
    studyPage.style.display = 'none';
    libraryPage.style.display = 'block';
});

flashcard.addEventListener('click', () => {
    isCardFlipped = !isCardFlipped;
    flashcard.classList.toggle('flipped');
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (currentStudyIndex < studyWords.length - 1) {
        currentStudyIndex++;
        updateStudyCard();
    } else {
        studyPage.style.display = 'none';
        libraryPage.style.display = 'block'; // Возвращаемся, когда карточки кончились
    }
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentStudyIndex > 0) {
        currentStudyIndex--;
        updateStudyCard();
    }
});
// Настройка цветов приложения под тему Telegram пользователя (если у него темная/светлая)
// Вы можете использовать tg.themeParams для изменения цветов, но пока оставим ваш темный дизайн.