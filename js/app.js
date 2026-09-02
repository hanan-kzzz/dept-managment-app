/**
 * Dashboard UI Business Logic - App.js (Mobile Finance-App Inspired Redesign)
 */

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'home') return;

    Utils.initAppLayout('home');
    initDashboard();
    setupEventListeners();
});

// Helper for Initials
function getInitials(name) {
    if (!name) return 'WS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'WS';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Relative time formatting for activity logs (e.g. 05:35 PM, Yesterday, Aug 29)
function formatActivityTime(date) {
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const dateStr = date.toDateString();
    
    if (dateStr === todayStr) {
        return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (dateStr === yesterdayStr) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
}

// --- RENDER DASHBOARD METRICS ---
function initDashboard() {
    // 1. Greeting Section Welcomer
    const greetingPrefix = document.getElementById('dashboard-greeting-prefix');
    const greetingStr = document.getElementById('dashboard-greeting-str');
    const avatarContainer = document.getElementById('welcome-avatar-container');
    
    if (greetingStr) {
        const hour = new Date().getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        
        // Fetch owner name from local auth storage or settings
        const auth = Storage.getAuth();
        const settings = Storage.getSettings();
        const ownerName = (auth && auth.user && auth.user.name && auth.user.name.trim() && auth.user.name.trim() !== 'Owner Name') 
            ? auth.user.name.trim() 
            : (settings.ownerName || 'Hanan');
        
        if (greetingPrefix) {
            greetingPrefix.textContent = `${greeting},`;
        }
        greetingStr.textContent = ownerName;
        
        if (avatarContainer) {
            avatarContainer.textContent = getInitials(ownerName);
        }
    }

    // 2. Load Core Data & Overview Line Chart (Default 'today' range)
    updateDashboardForRange('today');

    // Bind time-range toggles
    const rangeButtons = document.querySelectorAll('.compact-range-btn');
    rangeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            rangeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = btn.dataset.range;
            updateDashboardForRange(range);
        });
    });

    // 3. Needs Attention Panel Logic (Grouped rows)
    renderNeedsAttentionPanel();

    // 4. Recent Activity List (Limit to 3 items)
    const sales = Storage.getSales();
    const customers = Storage.getCustomers();
    renderRecentActivity(sales, customers);
}

// Aggregates sales statistics and renders line chart
function updateDashboardForRange(range) {
    const sales = Storage.getSales();
    const now = new Date();
    
    let labels = [];
    let values = [];
    let totalSales = 0;
    let transactionCount = 0;
    let averageSale = 0;
    
    if (range === 'today') {
        // Today: hourly slices
        labels = ['8 AM', '11 AM', '2 PM', '5 PM', '8 PM', '11 PM'];
        values = [0, 0, 0, 0, 0, 0];
        
        const todayStr = now.toDateString();
        const todaySales = sales.filter(s => new Date(s.date || s.createdAt).toDateString() === todayStr);
        
        todaySales.forEach(s => {
            const date = new Date(s.date || s.createdAt);
            const hour = date.getHours();
            const sTotal = parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0;
            totalSales += sTotal;
            transactionCount++;
            
            if (hour < 9) values[0] += sTotal;
            else if (hour < 12) values[1] += sTotal;
            else if (hour < 15) values[2] += sTotal;
            else if (hour < 18) values[3] += sTotal;
            else if (hour < 21) values[4] += sTotal;
            else values[5] += sTotal;
        });
        
    } else if (range === '7days') {
        // Last 7 days ending today
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            dates.push(d);
            labels.push(dayNames[d.getDay()]);
            values.push(0);
        }
        
        sales.forEach(s => {
            const sDate = new Date(s.date || s.createdAt);
            const sDateStr = sDate.toDateString();
            const sTotal = parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0;
            
            dates.forEach((d, idx) => {
                if (sDateStr === d.toDateString()) {
                    values[idx] += sTotal;
                    totalSales += sTotal;
                    transactionCount++;
                }
            });
        });
        
    } else if (range === '30days') {
        // Last 30 days ending today
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            dates.push(d);
            values.push(0);
            
            // Axis labels
            if (i === 29 || i === 20 || i === 10 || i === 0) {
                labels.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
            } else {
                labels.push('');
            }
        }
        
        sales.forEach(s => {
            const sDate = new Date(s.date || s.createdAt);
            const sDateStr = sDate.toDateString();
            const sTotal = parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0;
            
            dates.forEach((d, idx) => {
                if (sDateStr === d.toDateString()) {
                    values[idx] += sTotal;
                    totalSales += sTotal;
                    transactionCount++;
                }
            });
        });
    }

    averageSale = transactionCount > 0 ? (totalSales / transactionCount) : 0;

    // Primary highlighted value
    const heroValueEl = document.getElementById('val-today-sales');
    if (heroValueEl) {
        heroValueEl.textContent = Utils.formatCurrency(totalSales);
    }
    
    // Trend capsule badge
    const growthRateEl = document.getElementById('sales-growth-rate');
    const trendBadgeWrap = document.getElementById('trend-badge-wrap');
    const trendIcon = document.getElementById('trend-icon');
    
    if (growthRateEl) {
        const growthStr = getGrowthComparison();
        growthRateEl.textContent = growthStr;
        const isNeg = growthStr.startsWith('↓') || growthStr.startsWith('-');
        if (trendBadgeWrap) {
            if (isNeg) {
                trendBadgeWrap.className = 'trend-capsule-badge negative';
                if (trendIcon) trendIcon.setAttribute('data-lucide', 'trending-down');
            } else {
                trendBadgeWrap.className = 'trend-capsule-badge positive';
                if (trendIcon) trendIcon.setAttribute('data-lucide', 'trending-up');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // Summary capsule metrics
    const summaryTotal = document.getElementById('summary-total-sales');
    if (summaryTotal) summaryTotal.textContent = Utils.formatCurrency(totalSales);
    
    const summaryTx = document.getElementById('summary-tx-count');
    if (summaryTx) summaryTx.textContent = transactionCount;
    
    const summaryAvg = document.getElementById('summary-avg-sale');
    if (summaryAvg) summaryAvg.textContent = Utils.formatCurrency(averageSale);

    // Draw the minimal trend line chart
    drawLineChart('sales-line-chart', values, labels);
    setupChartTooltip(range, values, labels);
}

// Calculates relative sales growth comparison compared to yesterday
function getGrowthComparison() {
    const sales = Storage.getSales();
    const now = new Date();
    
    const todayStr = now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    const todaySum = sales.filter(s => new Date(s.date || s.createdAt).toDateString() === todayStr).reduce((sum, s) => sum + (parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0), 0);
    const yesterdaySum = sales.filter(s => new Date(s.date || s.createdAt).toDateString() === yesterdayStr).reduce((sum, s) => sum + (parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0), 0);
    
    if (yesterdaySum === 0) {
        if (todaySum === 0) return `+0.0% vs yesterday`;
        return `+100% vs yesterday`;
    }
    
    const pct = ((todaySum - yesterdaySum) / yesterdaySum) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% vs yesterday`;
}

// Draw minimal responsive line chart on canvas (50px height)
function drawLineChart(canvasId, values, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const width = canvas.parentElement.clientWidth || 300;
    const height = 50; // Compact height
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    const padding = { top: 6, right: 8, bottom: 14, left: 8 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.clearRect(0, 0, width, height);
    
    if (values.length === 0) return;
    
    const maxVal = Math.max(...values, 100) * 1.1;
    const minVal = 0;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Subtle middle gridline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight / 2);
    ctx.lineTo(width - padding.right, padding.top + chartHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Map values to coordinates
    const points = [];
    const stepX = chartWidth / (values.length - 1 || 1);
    
    values.forEach((v, idx) => {
        const x = padding.left + idx * stepX;
        const ratio = (v - minVal) / (maxVal - minVal || 1);
        const y = padding.top + chartHeight - ratio * chartHeight;
        points.push({ x, y, value: v, label: labels[idx] });
    });
    
    // Area Gradient Fill
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
    grad.addColorStop(1, 'rgba(0, 229, 255, 0.00)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartHeight);
    for (let i = 0; i < points.length; i++) {
        if (i === 0) {
            ctx.lineTo(points[i].x, points[i].y);
        } else {
            const cpX1 = points[i - 1].x + stepX / 2;
            const cpY1 = points[i - 1].y;
            const cpX2 = points[i].x - stepX / 2;
            const cpY2 = points[i].y;
            ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, points[i].x, points[i].y);
        }
    }
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();
    
    // Line Stroke Gradient
    const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
    strokeGrad.addColorStop(0, '#38BDF8');
    strokeGrad.addColorStop(1, '#34D399');
    
    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
        if (i === 0) {
            ctx.moveTo(points[i].x, points[i].y);
        } else {
            const cpX1 = points[i - 1].x + stepX / 2;
            const cpY1 = points[i - 1].y;
            const cpX2 = points[i].x - stepX / 2;
            const cpY2 = points[i].y;
            ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, points[i].x, points[i].y);
        }
    }
    ctx.stroke();
    
    // Draw Axis timestamps inside chart area
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '600 8.5px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    
    points.forEach((p, idx) => {
        if (p.label) {
            let shouldShow = false;
            if (values.length === 6) {
                // Today hourly: show 8 AM, 2 PM, 11 PM
                if (idx === 0 || idx === 2 || idx === 5) shouldShow = true;
            } else if (values.length === 7) {
                // 7 Days: show Mon, Thu, Sun
                const lowerLabel = p.label.toLowerCase();
                if (lowerLabel === 'mon' || lowerLabel === 'thu' || lowerLabel === 'sun') shouldShow = true;
            } else if (values.length === 30) {
                // 30 Days: show start, middle, end
                if (idx === 0 || idx === 15 || idx === 29) shouldShow = true;
            }
            
            if (shouldShow) {
                ctx.fillText(p.label, p.x, padding.top + chartHeight + 11);
            }
        }
    });
    
    canvas.points = points;
}

// Interactive tooltip coordinates tracking
function setupChartTooltip(range, values, labels) {
    const canvas = document.getElementById('sales-line-chart');
    const tooltip = document.getElementById('chart-tooltip');
    const tooltipDate = document.getElementById('tooltip-date');
    const tooltipVal = document.getElementById('tooltip-val');
    
    if (!canvas || !tooltip) return;
    
    const handleMove = (e) => {
        if (!canvas.points || canvas.points.length === 0) return;
        
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        
        let nearest = canvas.points[0];
        let minDist = Math.abs(x - nearest.x);
        
        canvas.points.forEach(p => {
            const dist = Math.abs(x - p.x);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        });
        
        if (nearest) {
            tooltip.style.left = Math.max(8, Math.min(rect.width - 90, nearest.x - 40)) + 'px';
            tooltip.style.top = (nearest.y - 36) + 'px';
            tooltip.style.display = 'flex';
            
            let dateLabel = nearest.label;
            if (range === 'today') dateLabel = `Today, ${nearest.label}`;
            
            tooltipDate.textContent = dateLabel || 'Sales';
            tooltipVal.textContent = Utils.formatCurrency(nearest.value);
            
            renderChartWithHighlight(range, values, labels, nearest);
        }
    };
    
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove);
    
    const hideTooltip = () => {
        tooltip.style.display = 'none';
        drawLineChart('sales-line-chart', values, labels);
    };
    
    canvas.addEventListener('mouseleave', hideTooltip);
    canvas.addEventListener('touchend', hideTooltip);
}

function renderChartWithHighlight(range, values, labels, point) {
    drawLineChart('sales-line-chart', values, labels);
    
    const canvas = document.getElementById('sales-line-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Draw vertical marker line
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(point.x, 6);
    ctx.lineTo(point.x, 52 - 14);
    ctx.stroke();
    
    // Draw highlighted anchor circle
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// Render Needs Attention Settings-Style Grouped Rows
function renderNeedsAttentionPanel() {
    const customers = Storage.getCustomers();
    const products = Storage.getProducts();
    
    const overdueCustomers = customers.filter(c => c.currentDue > 0);
    const overdueCount = overdueCustomers.length;
    const overdueSum = overdueCustomers.reduce((sum, c) => sum + c.currentDue, 0);
    
    const lowStockCount = products.filter(p => p.currentQuantity <= p.minimumStockLevel).length;

    const attentionList = document.getElementById('attention-list');
    if (!attentionList) return;

    let html = '';

    if (overdueCount > 0) {
        html += `
            <a href="dues.html" class="attention-row">
                <div class="attention-row-left">
                    <div class="attention-icon-box danger">
                        <i data-lucide="users"></i>
                    </div>
                    <div class="attention-row-info">
                        <span class="attention-row-title">Overdue Customers</span>
                        <span class="attention-row-subtitle">${overdueCount} customer${overdueCount > 1 ? 's' : ''} overdue &middot; ${Utils.formatCurrency(overdueSum)} outstanding</span>
                    </div>
                </div>
                <div class="attention-row-action">
                    View <i data-lucide="chevron-right"></i>
                </div>
            </a>
        `;
    }

    if (lowStockCount > 0) {
        html += `
            <a href="stock.html?filter=low_stock" class="attention-row">
                <div class="attention-row-left">
                    <div class="attention-icon-box warning">
                        <i data-lucide="package"></i>
                    </div>
                    <div class="attention-row-info">
                        <span class="attention-row-title">Low Stock</span>
                        <span class="attention-row-subtitle">${lowStockCount} product${lowStockCount > 1 ? 's' : ''} running low &middot; Restock recommended</span>
                    </div>
                </div>
                <div class="attention-row-action">
                    Restock <i data-lucide="chevron-right"></i>
                </div>
            </a>
        `;
    }

    // ALL GOOD (Positive, calm state when no alerts remain)
    if (overdueCount === 0 && lowStockCount === 0) {
        html = `
            <div class="attention-all-good">
                <div class="all-good-icon">
                    <i data-lucide="check-circle-2"></i>
                </div>
                <div class="attention-row-info">
                    <span class="attention-row-title">All Good</span>
                    <span class="attention-row-subtitle">No urgent actions required right now.</span>
                </div>
            </div>
        `;
    }

    attentionList.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- RENDER RECENT ACTIVITY FEED ---
function renderRecentActivity(sales, customers) {
    const listContainer = document.getElementById('dashboard-recent-activity');
    if (!listContainer) return;

    let activities = [];

    // Map Sales to activity feed
    sales.forEach(sale => {
        activities.push({
            type: 'sale',
            date: new Date(sale.date || sale.createdAt),
            name: sale.customerName || 'Walk-in Customer',
            amount: parseFloat(sale.grandTotal !== undefined ? sale.grandTotal : sale.total) || 0,
            method: sale.paymentMethod,
            badge: sale.dueAmount > 0 || sale.paymentMethod === 'Credit/Due' ? 'Credit Purchase' : 'Purchase',
            id: sale.id
        });
    });

    // Map manual due payments to activity feed
    customers.forEach(cust => {
        if (cust.transactions && Array.isArray(cust.transactions)) {
            cust.transactions.forEach(tx => {
                if (tx.type === 'Payment') {
                    activities.push({
                        type: 'payment',
                        date: new Date(tx.date),
                        name: cust.name,
                        amount: parseFloat(tx.amount) || 0,
                        method: tx.paymentMethod || 'Cash',
                        badge: 'Payment Received',
                        id: tx.id
                    });
                }
            });
        }
    });

    // Sort descending by date
    activities.sort((a, b) => b.date - a.date);

    // Get top 3 items
    const latest = activities.slice(0, 3);

    if (latest.length === 0) {
        listContainer.innerHTML = `
            <div class="recent-empty-state">
                <p class="recent-empty-text">No recent activity recorded today.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = latest.map(act => {
        const timeAgo = formatActivityTime(act.date);
        
        if (act.type === 'sale') {
            const isCredit = act.badge === 'Credit Purchase';
            const valueClass = isCredit ? 'credit-due' : '';
            const iconType = isCredit ? 'credit' : '';
            
            return `
                <div class="recent-row">
                    <div class="recent-row-left">
                        <div class="recent-row-icon ${iconType}">
                            <i data-lucide="${isCredit ? 'receipt-text' : 'shopping-bag'}"></i>
                        </div>
                        <div class="recent-row-info">
                            <span class="recent-row-name">${act.name}</span>
                            <span class="recent-row-meta">${act.badge} &middot; ${timeAgo}</span>
                        </div>
                    </div>
                    <span class="recent-row-value ${valueClass}">${Utils.formatCurrency(act.amount)}</span>
                </div>
            `;
        } else {
            return `
                <div class="recent-row">
                    <div class="recent-row-left">
                        <div class="recent-row-icon payment">
                            <i data-lucide="arrow-down-left"></i>
                        </div>
                        <div class="recent-row-info">
                            <span class="recent-row-name">${act.name}</span>
                            <span class="recent-row-meta">Payment Received &middot; ${timeAgo}</span>
                        </div>
                    </div>
                    <span class="recent-row-value payment-received">+${Utils.formatCurrency(act.amount)}</span>
                </div>
            `;
        }
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- SETUP EVENT HANDLERS ---
function setupEventListeners() {
    const custModal = document.getElementById('modal-quick-customer');
    const prodModal = document.getElementById('modal-quick-product');

    // Open actions
    const btnAddCust = document.getElementById('action-add-customer');
    if (btnAddCust) btnAddCust.addEventListener('click', () => openModal(custModal));

    const btnAddProd = document.getElementById('action-add-product');
    if (btnAddProd) btnAddProd.addEventListener('click', () => openModal(prodModal));

    // Close actions
    const closeCust = document.getElementById('modal-cust-close');
    if (closeCust) closeCust.addEventListener('click', () => closeModal(custModal));
    
    const cancelCust = document.getElementById('btn-cust-cancel');
    if (cancelCust) cancelCust.addEventListener('click', () => closeModal(custModal));
    
    const closeProd = document.getElementById('modal-prod-close');
    if (closeProd) closeProd.addEventListener('click', () => closeModal(prodModal));
    
    const cancelProd = document.getElementById('btn-prod-cancel');
    if (cancelProd) cancelProd.addEventListener('click', () => closeModal(prodModal));

    // Submit events
    const formCust = document.getElementById('form-quick-customer');
    if (formCust) formCust.addEventListener('submit', handleCustomerSubmit);
    
    const formProd = document.getElementById('form-quick-product');
    if (formProd) formProd.addEventListener('submit', handleProductSubmit);
}

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        Array.from(form.elements).forEach(el => el.classList.remove('is-invalid'));
    }
}

// Add Customer Handler
function handleCustomerSubmit(e) {
    e.preventDefault();
    const nameEl = document.getElementById('cust-name');
    const phoneEl = document.getElementById('cust-phone');
    const limitEl = document.getElementById('cust-limit');
    const dueEl = document.getElementById('cust-due');

    let isValid = true;

    if (!nameEl.value.trim()) {
        nameEl.classList.add('is-invalid');
        isValid = false;
    } else {
        nameEl.classList.remove('is-invalid');
    }

    if (!Utils.validatePhone(phoneEl.value)) {
        phoneEl.classList.add('is-invalid');
        isValid = false;
    } else {
        const existing = Storage.getCustomers().some(c => c.phone.trim() === phoneEl.value.trim());
        if (existing) {
            phoneEl.classList.add('is-invalid');
            phoneEl.nextElementSibling.textContent = "Phone number already exists.";
            isValid = false;
        } else {
            phoneEl.classList.remove('is-invalid');
        }
    }

    if (parseFloat(limitEl.value) < 0) {
        limitEl.classList.add('is-invalid');
        isValid = false;
    } else {
        limitEl.classList.remove('is-invalid');
    }

    if (parseFloat(dueEl.value) < 0) {
        dueEl.classList.add('is-invalid');
        isValid = false;
    } else {
        dueEl.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const newCust = {
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        address: document.getElementById('cust-address').value.trim(),
        openingDue: parseFloat(dueEl.value) || 0,
        creditLimit: parseFloat(limitEl.value) || 10000,
        notes: document.getElementById('cust-notes').value.trim()
    };

    Storage.saveCustomer(newCust);
    Utils.showToast("Customer added successfully", "success");
    closeModal(document.getElementById('modal-quick-customer'));
    initDashboard();
}

// Add Product Handler
function handleProductSubmit(e) {
    e.preventDefault();
    const nameEl = document.getElementById('prod-name');
    const pRateEl = document.getElementById('prod-purchase');
    const sRateEl = document.getElementById('prod-selling');
    const qtyEl = document.getElementById('prod-qty');
    const minEl = document.getElementById('prod-min');

    let isValid = true;

    if (!nameEl.value.trim()) {
        nameEl.classList.add('is-invalid');
        isValid = false;
    } else {
        nameEl.classList.remove('is-invalid');
    }

    if (parseFloat(pRateEl.value) < 0 || pRateEl.value === '') {
        pRateEl.classList.add('is-invalid');
        isValid = false;
    } else {
        pRateEl.classList.remove('is-invalid');
    }

    if (parseFloat(sRateEl.value) < 0 || sRateEl.value === '') {
        sRateEl.classList.add('is-invalid');
        isValid = false;
    } else {
        sRateEl.classList.remove('is-invalid');
    }

    if (parseFloat(qtyEl.value) < 0 || qtyEl.value === '') {
        qtyEl.classList.add('is-invalid');
        isValid = false;
    } else {
        qtyEl.classList.remove('is-invalid');
    }

    if (parseFloat(minEl.value) < 0 || minEl.value === '') {
        minEl.classList.add('is-invalid');
        isValid = false;
    } else {
        minEl.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const newProd = {
        productName: nameEl.value.trim(),
        category: document.getElementById('prod-category').value,
        unit: document.getElementById('prod-unit').value,
        purchaseRate: parseFloat(pRateEl.value),
        sellingRate: parseFloat(sRateEl.value),
        currentQuantity: parseFloat(qtyEl.value),
        minimumStockLevel: parseFloat(minEl.value),
        sku: document.getElementById('prod-sku').value.trim(),
        barcode: document.getElementById('prod-barcode').value.trim()
    };

    Storage.saveProduct(newProd);
    Storage.runStockCheckAndNotify();
    
    // Header bell updates
    Utils.initAppLayout('home');

    Utils.showToast("Product added successfully", "success");
    closeModal(document.getElementById('modal-quick-product'));
    initDashboard();
}
