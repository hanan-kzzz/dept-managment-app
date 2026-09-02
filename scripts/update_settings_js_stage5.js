const fs = require('fs');

let settingsJs = fs.readFileSync('js/settings.js', 'utf8');

// Add Stage 5 initialization to initRedesignedSettings
const initTarget = '    // 9. Render Lucide icons';
const stage5Init = `    // STAGE 5: Setup Market Price & Smart Stock Settings Modal
    setupMarketSettingsModal();

    // 9. Render Lucide icons`;

if (!settingsJs.includes('setupMarketSettingsModal()')) {
    settingsJs = settingsJs.replace(initTarget, stage5Init);
}

// Add setupMarketSettingsModal function
const stage5Function = `
/* STAGE 5: MARKET PRICE & SMART STOCK SETTINGS */
function setupMarketSettingsModal() {
    const rowTrigger = document.getElementById('row-market-settings');
    const modal = document.getElementById('modal-market-settings');
    const closeBtn = document.getElementById('modal-market-settings-close');
    const cancelBtn = document.getElementById('btn-market-settings-cancel');
    const form = document.getElementById('form-market-settings');

    const locValSpan = document.getElementById('val-market-loc');
    const locSelect = document.getElementById('setting-market-location');
    const freqSelect = document.getElementById('setting-market-refresh-freq');
    const alertsToggle = document.getElementById('setting-price-alerts-toggle');
    const thresholdSelect = document.getElementById('setting-price-alert-threshold');
    const safetyDaysInput = document.getElementById('setting-safety-buffer-days');
    const leadDaysInput = document.getElementById('setting-supplier-lead-days');

    // Populate initial values
    const settings = Storage.getSettings();
    if (locValSpan) locValSpan.textContent = settings.marketDefaultLocation || 'Kerala';
    if (locSelect) locSelect.value = settings.marketDefaultLocation || 'Kerala';
    if (freqSelect) freqSelect.value = settings.marketRefreshFrequency || 'manual';
    if (alertsToggle) alertsToggle.checked = settings.notifPriceAlerts !== false;
    if (thresholdSelect) thresholdSelect.value = String(settings.priceAlertThreshold || 5);
    if (safetyDaysInput) safetyDaysInput.value = settings.defaultSafetyStockDays || 3;
    if (leadDaysInput) leadDaysInput.value = settings.defaultSupplierLeadTime || 3;

    const openModal = () => {
        if (modal) modal.classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
    };

    if (rowTrigger) rowTrigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newLoc = locSelect ? locSelect.value : 'Kerala';
            const newFreq = freqSelect ? freqSelect.value : 'manual';
            const newAlerts = alertsToggle ? alertsToggle.checked : true;
            const newThreshold = thresholdSelect ? parseInt(thresholdSelect.value, 10) : 5;
            const newSafety = safetyDaysInput ? (parseInt(safetyDaysInput.value, 10) || 3) : 3;
            const newLead = leadDaysInput ? (parseInt(leadDaysInput.value, 10) || 3) : 3;

            Storage.saveSettings({
                marketDefaultLocation: newLoc,
                marketRefreshFrequency: newFreq,
                notifPriceAlerts: newAlerts,
                priceAlertThreshold: newThreshold,
                defaultSafetyStockDays: newSafety,
                defaultSupplierLeadTime: newLead
            });

            if (locValSpan) locValSpan.textContent = newLoc;
            closeModal();
            Utils.showToast("Market price and stock parameters saved", "success");
        });
    }
}
`;

if (!settingsJs.includes('function setupMarketSettingsModal')) {
    settingsJs += stage5Function;
}

fs.writeFileSync('js/settings.js', settingsJs, 'utf8');
console.log('Successfully updated js/settings.js');
