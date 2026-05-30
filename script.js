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

// Логика для выбора эмодзи
const emojiInput = document.getElementById('emoji-input');
const selectedEmoji = document.getElementById('selected-emoji');
if (emojiInput) {
    emojiInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
            const chars = Array.from(val); // Позволяет корректно считывать эмодзи (суб-символы)
            selectedEmoji.textContent = chars[0];
            e.target.value = chars[0]; // Оставляем только первый символ
        } else {
            selectedEmoji.textContent = '';
        }
    });
}

// Структура данных для хранения библиотек
let librariesData = {};
let currentLibraryId = null;

// Генератор ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
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
    // Открываем модальное окно
    createModal.style.display = 'flex';
    libraryInput.value = ''; // Очищаем поле ввода
    
    if (emojiInput && selectedEmoji) {
        emojiInput.value = '';
        selectedEmoji.textContent = '😀';
    }

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

// Обработчик кнопки сохранения новой библиотеки
saveBtn.addEventListener('click', () => {
    const newLibraryName = libraryInput.value.trim();
    const emojiVal = emojiInput ? emojiInput.value.trim() : '';
    const libraryEmoji = emojiVal ? Array.from(emojiVal)[0] : '';
    
    if (newLibraryName) {
        console.log("Создана новая библиотека:", newLibraryName);
        
        const libId = generateId();
        librariesData[libId] = {
            name: newLibraryName,
            emoji: libraryEmoji,
            color: selectedFolderColorClass,
            words: []
        };
        
        // Создаем элемент карточки
        const card = document.createElement('div');
        card.className = `library-card ${selectedFolderColorClass}`;
        card.dataset.id = libId;
        
        const title = document.createElement('h3');
        title.className = 'library-title';
        title.textContent = libraryEmoji ? `${libraryEmoji} ${newLibraryName}` : newLibraryName;
        
        card.appendChild(title);
        card.addEventListener('click', () => openLibrary(libId)); // Открываем при клике
        
        librariesList.appendChild(card); // Добавляем на страницу
        
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
const wordsListContainer = document.getElementById('words-list');
const studyBtn = document.getElementById('study-btn');
const wordInput = document.getElementById('word-input');
const translationInput = document.getElementById('translation-input');
const addWordBtn = document.getElementById('add-word-btn');
const addWordForm = document.getElementById('add-word-form');

function openLibrary(id) {
    currentLibraryId = id;
    const lib = librariesData[id];
    
    libraryTitleDisplay.textContent = lib.emoji ? `${lib.emoji} ${lib.name}` : lib.name;
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
    }
}

// Слушатели ввода для смены цвета кнопки на лету
wordInput.addEventListener('input', validateWordInputs);
translationInput.addEventListener('input', validateWordInputs);

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
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
            librariesData[currentLibraryId].words.splice(index, 1);
            renderWordsList();
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

const flashcard = document.getElementById('flashcard');
const cardWord = document.getElementById('card-word');
const cardTranslation = document.getElementById('card-translation');
const studyProgress = document.getElementById('study-progress');

function updateStudyCard() {
    const w = studyWords[currentStudyIndex];
    cardWord.textContent = w.term;
    cardTranslation.textContent = w.trans;
    studyProgress.textContent = `${currentStudyIndex + 1}/${studyWords.length}`;
    
    if (isCardFlipped) {
        flashcard.classList.remove('flipped');
        isCardFlipped = false;
    }
}

studyBtn.addEventListener('click', () => {
    if (!currentLibraryId) return;
    studyWords = librariesData[currentLibraryId].words;
    if (studyWords.length === 0) return;
    
    currentStudyIndex = 0;
    isCardFlipped = false;
    flashcard.classList.remove('flipped');
    
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