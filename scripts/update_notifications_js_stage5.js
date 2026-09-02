const fs = require('fs');

let notifJs = fs.readFileSync('js/notifications.js', 'utf8');

// 1. Add Telegram Alert handlers for Stage 5 in TelegramService.sendAlert
const telegramAlertAnchor = "        } else if (type === 'DAILY_SUMMARY' && status.dailySummaryEnabled) {";

const stage5TelegramAlerts = `        } else if (type === 'REORDER_RECOMMENDED' || type === 'SMART_STOCK') {
            const p = payload.product || {};
            const smart = payload.smart || {};
            const unit = p.unit || 'unit';
            alertMessage = \`STOCK ALERT\\n\\n\${p.productName || 'Product'}\\n\\n\${smart.currentQuantity || p.currentQuantity || 0} \${unit} remaining\\n\\nEstimated:\\n\${smart.daysRemainingText || 'Low days remaining'}\\n\\nRecommended reorder:\\n\${smart.recommendedReorder || payload.recommendedReorder || 0} \${unit}\`;
        } else if (type === 'MARKET_PRICE_CHANGED') {
            const comm = payload.commodity || {};
            const unit = comm.unit || 'kg';
            const oldP = payload.prevPrice !== undefined ? payload.prevPrice : comm.prevPrice;
            const newP = payload.price !== undefined ? payload.price : comm.price;
            const changeP = payload.changePercent !== undefined ? payload.changePercent : comm.changePercent;
            const sym = changeP > 0 ? '+' : '';
            alertMessage = \`MARKET PRICE CHANGED\\n\\n\${comm.name || payload.commodityName || 'Commodity'}\\n\\n₹\${oldP} → ₹\${newP} / \${unit}\\n\\nChange:\\n\${sym}\${changeP}%\`;
`;

if (!notifJs.includes("type === 'REORDER_RECOMMENDED'")) {
    notifJs = notifJs.replace(telegramAlertAnchor, stage5TelegramAlerts + telegramAlertAnchor);
}

// 2. Add icon mappings for Stage 5 notification types in NotificationService
const iconAnchor = "        if (t === 'PAYMENT') return 'circle-dollar-sign';";
const stage5Icons = `        if (t === 'MARKET_PRICE' || t === 'MARKET_PRICE_CHANGED') return 'scale';
        if (t === 'REORDER_RECOMMENDED' || t === 'SMART_STOCK') return 'sparkles';
`;

if (!notifJs.includes("t === 'MARKET_PRICE_CHANGED'")) {
    notifJs = notifJs.replace(iconAnchor, stage5Icons + iconAnchor);
}

fs.writeFileSync('js/notifications.js', notifJs, 'utf8');
console.log('Successfully updated js/notifications.js');
