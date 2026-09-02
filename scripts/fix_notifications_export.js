const fs = require('fs');

let notifJs = fs.readFileSync('js/notifications.js', 'utf8');

const exportBlock = `if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotificationService,
        TelegramService,
        WhatsAppService,
        NotificationQueue
    };
}`;

if (!notifJs.includes("module.exports = {")) {
    notifJs += '\n' + exportBlock + '\n';
    fs.writeFileSync('js/notifications.js', notifJs, 'utf8');
    console.log('Added module.exports to js/notifications.js');
}
