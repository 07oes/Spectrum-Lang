// Функция, которая вызывается после успешной авторизации через официальный виджет Telegram
function onTelegramAuth(user) {
    // В реальном приложении здесь данные отправляются на сервер для проверки подлинности хеша
    console.log("Данные пользователя от Telegram:", user);
    
    alert(
        'Успешный вход!\n\n' + 
        'Имя: ' + user.first_name + ' ' + (user.last_name || '') + '\n' +
        'Username: @' + (user.username || 'нет') + '\n' +
        'ID: ' + user.id
    );
}
