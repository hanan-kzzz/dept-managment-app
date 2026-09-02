const fs = require('fs');

let utilsJs = fs.readFileSync('js/utils.js', 'utf8');

const targetFabAction = `                        <a href="dues.html?openRecordPayment=true" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--danger-tint); color: var(--danger);">
                                <i data-lucide="circle-dollar-sign"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Record Payment</div>
                            </div>
                        </a>`;

const newFabAction = `                        <a href="dues.html?openRecordPayment=true" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--danger-tint); color: var(--danger);">
                                <i data-lucide="circle-dollar-sign"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Record Payment</div>
                            </div>
                        </a>
                        <a href="market-prices.html" class="action-grid-card">
                            <div class="action-grid-icon-wrap" style="background-color: var(--accent-tint); color: var(--accent);">
                                <i data-lucide="scale"></i>
                            </div>
                            <div>
                                <div class="action-grid-title">Market Prices</div>
                            </div>
                        </a>`;

if (utilsJs.includes(targetFabAction) && !utilsJs.includes('href="market-prices.html"')) {
    utilsJs = utilsJs.replace(targetFabAction, newFabAction);
    fs.writeFileSync('js/utils.js', utilsJs, 'utf8');
    console.log('Successfully updated js/utils.js with Market Prices quick action');
} else {
    console.log('utils.js already updated or pattern not found');
}
