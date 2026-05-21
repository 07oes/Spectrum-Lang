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
const mainBtn = document.getElementById('main-btn');

// Проверяем, открыто ли приложение внутри Telegram
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    
    // Показываем карточку
    userCard.style.display = 'flex';
    
    // Формируем приветствие
    greeting.textContent = `Hello, ${user.first_name}!`;
    
    // Формируем информацию
    let info = `ID: ${user.id}`;
    if (user.username) {
        info += `<br>@${user.username}`;
    }
    // Если есть премиум, добавляем звездочку
    if (user.is_premium) {
        info += `<br>⭐ Premium User`;
    }
    userInfo.innerHTML = info;

    // Устанавливаем инициал в аватарку
    userAvatar.textContent = user.first_name.charAt(0).toUpperCase();
    
    // Если Telegram передал фото (это бывает не всегда, зависит от настроек), 
    // можно установить его фоном. 
    if (user.photo_url) {
        userAvatar.style.backgroundImage = `url('${user.photo_url}')`;
        userAvatar.style.backgroundSize = 'cover';
        userAvatar.textContent = ''; // Убираем букву
    }

} else {
    // Если открыли просто в браузере (не в Telegram)
    userCard.style.display = 'flex';
    greeting.textContent = "Hello, Guest!";
    userInfo.textContent = "Please open this link inside Telegram as a Mini App.";
}

// Обработчик кнопки
mainBtn.addEventListener('click', () => {
    // В Mini Apps часто используют MainButton из самого интерфейса Telegram (кнопка внизу экрана).
    // Но мы оставили вашу красивую кнопку в центре.
    // Для примера - покажем alert от Telegram
    tg.showAlert("You clicked the continue button! Welcome to the app.");
    
    // Если нужно закрыть приложение:
    // tg.close();
});

// Настройка цветов приложения под тему Telegram пользователя (если у него темная/светлая)
// Вы можете использовать tg.themeParams для изменения цветов, но пока оставим ваш темный дизайн.