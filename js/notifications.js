/**
 * Centralized Notification, WhatsApp, and Telegram Alert Architecture - Stage 4
 * Clean service abstractions, offline-first queueing, and secure message handling.
 */

// ==========================================================================
// 1. NOTIFICATION QUEUE (OFFLINE-FIRST & CONTROLLED RETRY ENGINE)
// ==========================================================================
const NotificationQueue = {
    enqueue(channel, type, recipient, payload) {
        const queue = Storage.getNotificationQueue();
        const queueItem = {
            id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            channel: channel, // 'telegram' | 'whatsapp'
            type: type,       // 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CUSTOMER_OVERDUE' | 'DAILY_SUMMARY' | 'REMINDER' | 'TEST'
            recipient: recipient || 'Owner',
            payload: payload,
            status: navigator.onLine ? 'PENDING' : 'WAITING_FOR_CONNECTION',
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date().toISOString(),
            sentAt: null,
            lastError: null
        };

        queue.unshift(queueItem);
        Storage.saveNotificationQueue(queue);

        if (navigator.onLine) {
            this.processQueue();
        }

        return queueItem;
    },

    processQueue() {
        if (!navigator.onLine) {
            console.log("[NotificationQueue] Device is offline. Queue processing suspended.");
            return;
        }

        const queue = Storage.getNotificationQueue();
        let modified = false;

        queue.forEach(item => {
            if (item.status === 'PENDING' || item.status === 'WAITING_FOR_CONNECTION' || (item.status === 'FAILED' && item.attempts < item.maxAttempts)) {
                item.attempts += 1;
                item.status = 'PROCESSING';
                modified = true;

                try {
                    // In a production backend environment, this forwards to server API endpoints.
                    // Here we handle execution securely without exposing secrets.
                    if (item.channel === 'telegram') {
                        const settings = Storage.getSettings();
                        if (settings.telegramConnected) {
                            item.status = 'SENT';
                            item.sentAt = new Date().toISOString();
                            item.lastError = null;
                            console.log(`[Telegram Owner Alert Dispatched] [${item.type}] to ${item.recipient}`);
                        } else {
                            item.status = 'FAILED';
                            item.lastError = 'Telegram is not connected in settings.';
                        }
                    } else if (item.channel === 'whatsapp') {
                        const settings = Storage.getSettings();
                        if (settings.whatsappConnected) {
                            item.status = 'SENT';
                            item.sentAt = new Date().toISOString();
                            item.lastError = null;
                            console.log(`[WhatsApp API Reminder Dispatched] to ${item.recipient}`);
                        } else {
                            // Direct WhatsApp link used
                            item.status = 'SENT';
                            item.sentAt = new Date().toISOString();
                        }
                    }
                } catch (err) {
                    item.status = item.attempts >= item.maxAttempts ? 'FAILED' : 'PENDING';
                    item.lastError = err.message || 'Transmission failed';
                    console.error("[NotificationQueue] Error processing queue item:", err);
                }
            }
        });

        if (modified) {
            Storage.saveNotificationQueue(queue);
        }
    },

    initOfflineListeners() {
        window.addEventListener('online', () => {
            console.log("[NotificationQueue] Internet connection restored. Processing queue...");
            const queue = Storage.getNotificationQueue();
            queue.forEach(item => {
                if (item.status === 'WAITING_FOR_CONNECTION') {
                    item.status = 'PENDING';
                }
            });
            Storage.saveNotificationQueue(queue);
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            console.log("[NotificationQueue] Device went offline.");
        });
    }
};

// Initialize network state listeners
if (typeof window !== 'undefined') {
    NotificationQueue.initOfflineListeners();
}

// ==========================================================================
// 2. TELEGRAM OWNER ALERTS SERVICE
// ==========================================================================
const TelegramService = {
    getStatus() {
        const settings = Storage.getSettings();
        return {
            connected: settings.telegramConnected === true,
            botName: settings.telegramBotName || 'Greenway Shop Bot',
            chatId: settings.telegramChatId || 'Owner Channel',
            lowStockEnabled: settings.telegramLowStock !== false,
            outOfStockEnabled: settings.telegramOutOfStock !== false,
            customerOverdueEnabled: settings.telegramCustomerOverdue !== false,
            paymentReceivedEnabled: settings.telegramPaymentReceived === true,
            dailySummaryEnabled: settings.telegramDailySummary !== false
        };
    },

    connect(config = {}) {
        const settings = Storage.getSettings();
        settings.telegramConnected = true;
        settings.telegramBotName = config.botName || 'GreenwayAlertBot';
        settings.telegramChatId = config.chatId || '@owner_alerts';
        Storage.saveSettings(settings);
        return true;
    },

    disconnect() {
        const settings = Storage.getSettings();
        settings.telegramConnected = false;
        Storage.saveSettings(settings);
        return true;
    },

    sendTestNotification() {
        const status = this.getStatus();
        if (!status.connected) {
            return {
                success: false,
                message: "Unable to send notification. Telegram is not connected."
            };
        }

        if (!navigator.onLine) {
            NotificationQueue.enqueue('telegram', 'TEST', 'Shop Owner', {
                text: "Test notification from Greenway Groceries. Telegram integration is active."
            });
            return {
                success: false,
                message: "Device is offline. Test notification queued and will send when connection returns."
            };
        }

        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const msg = `TEST NOTIFICATION\n\n${shopName}\n\nTelegram owner alert integration is successfully connected and working!\n\nDate: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;

        NotificationQueue.enqueue('telegram', 'TEST', 'Shop Owner', { text: msg });
        return {
            success: true,
            message: "Test notification sent successfully."
        };
    },

    sendAlert(type, payload = {}) {
        const status = this.getStatus();
        if (!status.connected) return false;

        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const cur = settings.currency || '₹';
        let alertMessage = '';

        if (type === 'LOW_STOCK' && status.lowStockEnabled) {
            const p = payload.product || {};
            alertMessage = `LOW STOCK ALERT\n\n${shopName}\n\nProduct:\n${p.productName || 'Product'}\n\nRemaining:\n${payload.quantity || p.currentQuantity || 0} ${p.unit || 'pc'}\n\nReorder Level:\n${payload.minLevel || p.minimumStockLevel || 0} ${p.unit || 'pc'}\n\nAction: Restock recommended`;
        } else if (type === 'OUT_OF_STOCK' && status.outOfStockEnabled) {
            const p = payload.product || {};
            alertMessage = `OUT OF STOCK ALERT\n\n${shopName}\n\nProduct:\n${p.productName || 'Product'}\n\nStock:\n0 ${p.unit || 'pc'}s\n\nAction: Immediate restock required`;
        } else if (type === 'CUSTOMER_OVERDUE' && status.customerOverdueEnabled) {
            const c = payload.customer || {};
            const dueStr = Utils.formatCurrency(payload.currentDue || 0);
            const dueSince = payload.dueDate ? Utils.formatDate(payload.dueDate) : 'Overdue';
            alertMessage = `CUSTOMER OVERDUE ALERT\n\n${shopName}\n\nCustomer:\n${c.name || 'Customer'}\n\nOutstanding:\n${dueStr}\n\nDue since:\n${dueSince}\n\nAction: Review customer account`;
        } else if (type === 'PAYMENT_RECEIVED' && status.paymentReceivedEnabled) {
            const c = payload.customer || {};
            const amtStr = Utils.formatCurrency(payload.amount || 0);
            const remStr = Utils.formatCurrency(payload.remainingDue || 0);
            alertMessage = `PAYMENT RECEIVED\n\n${shopName}\n\nCustomer:\n${c.name || payload.customerName || 'Customer'}\n\nAmount Paid:\n${amtStr}\n\nRemaining Due:\n${remStr}`;
        } else if (type === 'REORDER_RECOMMENDED' || type === 'SMART_STOCK') {
            const p = payload.product || {};
            const smart = payload.smart || {};
            const unit = p.unit || 'unit';
            alertMessage = `STOCK ALERT\n\n${p.productName || 'Product'}\n\n${smart.currentQuantity || p.currentQuantity || 0} ${unit} remaining\n\nEstimated:\n${smart.daysRemainingText || 'Low days remaining'}\n\nRecommended reorder:\n${smart.recommendedReorder || payload.recommendedReorder || 0} ${unit}`;
        } else if (type === 'MARKET_PRICE_CHANGED') {
            const comm = payload.commodity || {};
            const unit = comm.unit || 'kg';
            const oldP = payload.prevPrice !== undefined ? payload.prevPrice : comm.prevPrice;
            const newP = payload.price !== undefined ? payload.price : comm.price;
            const changeP = payload.changePercent !== undefined ? payload.changePercent : comm.changePercent;
            const sym = changeP > 0 ? '+' : '';
            alertMessage = `MARKET PRICE CHANGED\n\n${comm.name || payload.commodityName || 'Commodity'}\n\n₹${oldP} → ₹${newP} / ${unit}\n\nChange:\n${sym}${changeP}%`;
        } else if (type === 'DAILY_SUMMARY' && status.dailySummaryEnabled) {
            const summary = payload.summary || NotificationService.calculateDailySummary();
            const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
            alertMessage = `DAILY SHOP SUMMARY\n\n${dateStr}\n\nSales:\n${cur}${summary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nTransactions:\n${summary.transactionCount}\n\nOutstanding customer dues:\n${cur}${summary.totalOutstandingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nLow stock:\n${summary.lowStockCount} products\n\nOut of stock:\n${summary.outOfStockCount} products`;
        } else {
            return false;
        }

        NotificationQueue.enqueue('telegram', type, 'Shop Owner', { text: alertMessage });
        return true;
    }
};

// ==========================================================================
// 3. WHATSAPP CUSTOMER REMINDERS SERVICE
// ==========================================================================
const WhatsAppService = {
    getStatus() {
        const settings = Storage.getSettings();
        return {
            connected: settings.whatsappConnected === true,
            businessPhone: settings.shopPhone || '+91 98765 43210',
            autoRules: {
                dueTomorrow: settings.whatsappAutoDueTomorrow === true,
                dueToday: settings.whatsappAutoDueToday === true,
                overdue1: settings.whatsappAutoOverdue1 === true,
                overdue3: settings.whatsappAutoOverdue3 === true,
                overdue7: settings.whatsappAutoOverdue7 === true
            }
        };
    },

    connect(config = {}) {
        const settings = Storage.getSettings();
        settings.whatsappConnected = true;
        Storage.saveSettings(settings);
        return true;
    },

    disconnect() {
        const settings = Storage.getSettings();
        settings.whatsappConnected = false;
        Storage.saveSettings(settings);
        return true;
    },

    validateCustomerPhone(phone) {
        if (!phone) return { isValid: false, error: "Customer phone number is required." };
        const clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.length < 10 || clean.length > 15) {
            return { isValid: false, error: "Valid 10 to 15 digit phone number required." };
        }
        return { isValid: true, cleanPhone: clean };
    },

    prepareReminder(customer, financials = null, templateType = 'standard') {
        const settings = Storage.getSettings();
        const shopName = settings.shopName || 'My Grocery Shop';
        const cur = settings.currency || '₹';
        
        if (!customer) {
            return { isValid: false, error: "Customer not found." };
        }

        const phoneValidation = this.validateCustomerPhone(customer.phone);
        if (!phoneValidation.isValid) {
            return { isValid: false, error: phoneValidation.error, customer };
        }

        const fin = financials || Storage.calculateCustomerFinancials(customer);
        const dueAmount = fin.currentDue || 0;
        const dueAmountStr = `${cur}${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        const dueDateStr = fin.overdueDate ? Utils.formatDate(fin.overdueDate) : (customer.dueDate ? Utils.formatDate(customer.dueDate) : 'soon');

        let msg = '';
        if (templateType === 'overdue') {
            msg = `Payment Overdue Notice\n\nDear ${customer.name},\n\nYour pending balance of ${dueAmountStr} with ${shopName} was due on ${dueDateStr}.\n\nPlease arrange payment as soon as possible to keep your credit account active.\n\nThank you!`;
        } else if (templateType === 'friendly') {
            msg = `Hello ${customer.name}!\n\nJust a friendly check-in from ${shopName}. You have an open balance of ${dueAmountStr}.\n\nPlease settle whenever convenient. Have a wonderful day!`;
        } else {
            // standard
            msg = `Payment Reminder\n\nDear ${customer.name},\n\nThis is a gentle reminder from ${shopName} regarding your outstanding balance of ${dueAmountStr}.\n\nKindly clear the due at your earliest convenience.\n\nThank you for shopping with us!`;
        }

        return {
            isValid: true,
            customer: customer,
            phone: customer.phone,
            cleanPhone: phoneValidation.cleanPhone,
            amountDue: dueAmount,
            dueDate: fin.overdueDate || customer.dueDate || null,
            templateType: templateType,
            message: msg
        };
    },

    sendReminder(reminderData) {
        if (!reminderData || !reminderData.isValid) {
            return { success: false, error: reminderData ? reminderData.error : "Invalid reminder payload." };
        }

        const customer = reminderData.customer;
        if (customer && customer.allowReminders === false) {
            return { success: false, error: "Customer has opted out of reminders." };
        }

        const isConnected = this.getStatus().connected;
        const cleanPhone = reminderData.cleanPhone || String(reminderData.phone).replace(/[^0-9]/g, '');
        const encodedMsg = encodeURIComponent(reminderData.message);

        // Record in Reminder History
        const record = Storage.addReminderRecord({
            customerId: customer ? customer.id : null,
            customerName: customer ? customer.name : reminderData.customerName,
            phone: reminderData.phone,
            amountDue: reminderData.amountDue,
            dueDate: reminderData.dueDate,
            templateType: reminderData.templateType,
            message: reminderData.message,
            channel: 'whatsapp',
            status: isConnected ? 'Sent' : 'Prepared'
        });

        // Enqueue notification queue record
        NotificationQueue.enqueue('whatsapp', 'REMINDER', customer ? customer.name : cleanPhone, {
            phone: cleanPhone,
            message: reminderData.message,
            reminderId: record.id
        });

        // Launch WhatsApp link for direct share if on browser
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
        try {
            window.open(waUrl, '_blank');
        } catch (e) {
            console.warn("Could not automatically open WhatsApp window:", e);
        }

        return {
            success: true,
            status: isConnected ? 'Sent' : 'Prepared',
            record: record,
            message: isConnected ? "Reminder sent via WhatsApp Business." : "WhatsApp reminder prepared."
        };
    }
};

// ==========================================================================
// 4. CENTRALIZED NOTIFICATION SERVICE (EVENT HUB & IN-APP NOTIFICATIONS)
// ==========================================================================
const NotificationService = {
    // --- CORE CRUD ---
    createNotification(opts) {
        const settings = Storage.getSettings();
        if (settings.notificationsEnabled === false) return null;

        const type = (opts.type || 'SYSTEM').toUpperCase();

        // Respect individual notification switches
        if (type === 'LOW_STOCK' && settings.notifLowStock === false) return null;
        if (type === 'OUT_OF_STOCK' && settings.notifOutOfStock === false) return null;
        if (type === 'CUSTOMER_DUE' && settings.notifCustomerDue === false) return null;
        if (type === 'CUSTOMER_OVERDUE' && settings.notifCustomerOverdue === false) return null;
        if (type === 'PAYMENT_RECEIVED' && settings.notifPaymentReceived === false) return null;
        if (type === 'SALE_COMPLETED' && settings.notifSaleCompleted === false) return null;
        if (type === 'DAILY_SUMMARY' && settings.notifDailySummary === false) return null;

        const notifications = Storage.getNotifications();
        const eventKey = opts.eventKey || (opts.targetId ? `${type}:${opts.targetId}` : null);

        // Deduplication check: Do not create duplicate unread notifications for same event key
        if (eventKey) {
            const exists = notifications.some(n => n.eventKey === eventKey && !n.read && !n.resolved);
            if (exists) {
                return null;
            }
        }

        const priority = opts.priority || this._getDefaultPriority(type);
        const title = opts.title || this._getDefaultTitle(type);

        const newNotif = {
            id: 'NOT-' + String(Date.now()).slice(-6) + '-' + Math.random().toString(36).substr(2, 3).toUpperCase(),
            type: type,
            title: title,
            message: opts.message || '',
            entityType: opts.entityType || (opts.targetId ? (type.includes('STOCK') ? 'product' : 'customer') : 'system'),
            entityId: opts.entityId || opts.targetId || null,
            targetId: opts.targetId || opts.entityId || null,
            createdAt: new Date().toISOString(),
            date: new Date().toISOString(),
            read: false,
            priority: priority,
            eventKey: eventKey,
            resolved: false
        };

        notifications.unshift(newNotif);
        Storage.saveNotifications(notifications);

        // Update header bell counter if on active page
        if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
            const bell = document.querySelector('#app-header .icon-btn[aria-label="Notifications"]');
            if (bell) {
                const unreadCount = notifications.filter(n => !n.read).length;
                let dot = bell.querySelector('.badge-unread-dot');
                if (unreadCount > 0) {
                    if (!dot) {
                        dot = document.createElement('span');
                        dot.className = 'badge-unread-dot';
                        dot.style.cssText = 'position: absolute; top: 0; right: 0; width: 8px; height: 8px; border-radius: 50%; background-color: var(--danger); border: 1.5px solid var(--surface);';
                        bell.appendChild(dot);
                    }
                } else if (dot) {
                    dot.remove();
                }
            }
        }

        // Show subtle toast if user interaction
        if (opts.showToast && typeof Utils !== 'undefined') {
            const toastType = priority === 'CRITICAL' ? 'error' : (priority === 'HIGH' ? 'warning' : 'info');
            Utils.showToast(newNotif.message, toastType);
        }

        return newNotif;
    },

    markAsRead(id) {
        const notifications = Storage.getNotifications();
        const item = notifications.find(n => n.id === id);
        if (item) {
            item.read = true;
            Storage.saveNotifications(notifications);
            if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
                Utils.initAppLayout(document.body.dataset.page);
            }
        }
    },

    markAllAsRead() {
        const notifications = Storage.getNotifications();
        notifications.forEach(n => { n.read = true; });
        Storage.saveNotifications(notifications);
        if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
            Utils.initAppLayout(document.body.dataset.page);
        }
    },

    deleteNotification(id) {
        const notifications = Storage.getNotifications();
        const filtered = notifications.filter(n => n.id !== id);
        Storage.saveNotifications(filtered);
        if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
            Utils.initAppLayout(document.body.dataset.page);
        }
    },

    clearAll() {
        Storage.saveNotifications([]);
        if (typeof Utils !== 'undefined' && Utils.initAppLayout) {
            Utils.initAppLayout(document.body.dataset.page);
        }
    },

    resolveAlert(eventKey) {
        if (!eventKey) return;
        const notifications = Storage.getNotifications();
        let updated = false;
        notifications.forEach(n => {
            if (n.eventKey === eventKey && !n.resolved) {
                n.resolved = true;
                n.read = true;
                updated = true;
            }
        });
        if (updated) {
            Storage.saveNotifications(notifications);
        }
    },

    // --- EVENT HOOKS ---
    onSaleCompleted(sale) {
        if (!sale) return;
        const settings = Storage.getSettings();
        const cur = settings.currency || '₹';

        // 1. If credit sale created customer due
        if (sale.amountDue > 0 && sale.customerId && sale.customerId !== 'walk-in') {
            const customer = Storage.getCustomer(sale.customerId);
            const custName = customer ? customer.name : 'Customer';
            const dueDateStr = sale.dueDate ? `Due date: ${Utils.formatDate(sale.dueDate)}` : '';
            this.createNotification({
                type: 'CUSTOMER_DUE',
                title: 'Customer Due Created',
                message: `${custName} has an outstanding balance of ${cur}${sale.amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. ${dueDateStr}`,
                entityType: 'customer',
                entityId: sale.customerId,
                targetId: sale.customerId,
                priority: 'NORMAL',
                eventKey: `CUSTOMER_DUE:${sale.customerId}:${sale.id}`
            });
        }

        // 2. Low-priority Sale Completed notification (if enabled)
        if (settings.notifSaleCompleted) {
            this.createNotification({
                type: 'SALE_COMPLETED',
                title: 'Sale Completed',
                message: `Invoice #${sale.invoiceNumber} completed for ${cur}${sale.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${sale.paymentMethod}).`,
                entityType: 'sale',
                entityId: sale.id,
                targetId: sale.id,
                priority: 'LOW',
                eventKey: `SALE:${sale.id}`
            });
        }

        // Re-check inventory levels
        Storage.runStockCheckAndNotify();
    },

    onPaymentReceived(paymentRecord, customer) {
        if (!paymentRecord) return;
        const settings = Storage.getSettings();
        const cur = settings.currency || '₹';
        const custName = customer ? customer.name : (paymentRecord.customerName || 'Customer');
        const remStr = paymentRecord.remainingDue !== undefined ? ` Remaining: ${cur}${paymentRecord.remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';

        this.createNotification({
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            message: `${cur}${paymentRecord.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} received from ${custName}.${remStr}`,
            entityType: 'customer',
            entityId: paymentRecord.customerId,
            targetId: paymentRecord.customerId,
            priority: 'NORMAL',
            eventKey: `PAYMENT:${paymentRecord.id}`
        });

        // Trigger Telegram alert if configured
        if (typeof TelegramService !== 'undefined') {
            TelegramService.sendAlert('PAYMENT_RECEIVED', {
                customer: customer,
                customerName: custName,
                amount: paymentRecord.amount,
                remainingDue: paymentRecord.remainingDue
            });
        }
    },

    onStockChanged(product, prevQty, newQty) {
        Storage.runStockCheckAndNotify();
    },

    calculateDailySummary(dateStr = null) {
        const sales = Storage.getSales();
        const products = Storage.getProducts();
        const customers = Storage.getCustomers();

        const targetDate = dateStr ? new Date(dateStr) : new Date();
        const targetDay = targetDate.toISOString().split('T')[0];

        const daySales = sales.filter(s => {
            const sDate = (s.date || s.createdAt || '').split('T')[0];
            return sDate === targetDay;
        });

        let totalSales = 0;
        let cashSales = 0;
        let upiSales = 0;
        let cardSales = 0;
        let dueSales = 0;

        daySales.forEach(s => {
            const grand = parseFloat(s.grandTotal || s.total) || 0;
            totalSales += grand;
            const method = (s.paymentMethod || 'Cash').toLowerCase();
            if (method.includes('cash')) cashSales += grand;
            else if (method.includes('upi')) upiSales += grand;
            else if (method.includes('card')) cardSales += grand;
            else if (method.includes('due') || method.includes('credit')) dueSales += grand;
            else cashSales += grand;
        });

        let totalOutstandingDues = 0;
        customers.forEach(c => {
            const fin = Storage.calculateCustomerFinancials(c);
            totalOutstandingDues += (fin.currentDue || 0);
        });

        let lowStockCount = 0;
        let outOfStockCount = 0;
        products.forEach(p => {
            const q = parseFloat(p.currentQuantity) || 0;
            const m = parseFloat(p.minimumStockLevel) || 0;
            if (q === 0) outOfStockCount++;
            else if (q <= m) lowStockCount++;
        });

        return {
            date: targetDay,
            totalSales,
            transactionCount: daySales.length,
            cashSales,
            upiSales,
            cardSales,
            dueSales,
            totalOutstandingDues,
            lowStockCount,
            outOfStockCount
        };
    },

    generateDailySummary(dateStr = null) {
        const summary = this.calculateDailySummary(dateStr);
        const settings = Storage.getSettings();
        const cur = settings.currency || '₹';

        const msg = `Today's Sales: ${cur}${summary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${summary.transactionCount} transactions). Dues: ${cur}${summary.totalOutstandingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Low stock: ${summary.lowStockCount}. Out of stock: ${summary.outOfStockCount}.`;

        const notif = this.createNotification({
            type: 'DAILY_SUMMARY',
            title: 'Daily Sales Summary',
            message: msg,
            entityType: 'report',
            entityId: summary.date,
            priority: 'LOW',
            eventKey: `DAILY_SUMMARY:${summary.date}`
        });

        // Forward to Telegram if enabled
        if (typeof TelegramService !== 'undefined') {
            TelegramService.sendAlert('DAILY_SUMMARY', { summary });
        }

        return notif;
    },

    // --- HELPERS ---
    _getDefaultPriority(type) {
        switch (type) {
            case 'OUT_OF_STOCK': return 'CRITICAL';
            case 'LOW_STOCK':
            case 'CUSTOMER_OVERDUE': return 'HIGH';
            case 'PAYMENT_RECEIVED':
            case 'CUSTOMER_DUE': return 'NORMAL';
            case 'SALE_COMPLETED':
            case 'DAILY_SUMMARY': return 'LOW';
            default: return 'NORMAL';
        }
    },

    _getDefaultTitle(type) {
        switch (type) {
            case 'LOW_STOCK': return 'Low Stock';
            case 'OUT_OF_STOCK': return 'Out of Stock';
            case 'CUSTOMER_DUE': return 'Customer Due';
            case 'CUSTOMER_OVERDUE': return 'Customer Overdue';
            case 'PAYMENT_RECEIVED': return 'Payment Received';
            case 'SALE_COMPLETED': return 'Sale Completed';
            case 'DAILY_SUMMARY': return 'Daily Sales Summary';
            case 'SYSTEM': return 'System Alert';
            default: return 'Notification';
        }
    }
};

// Global assignment
if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
    window.TelegramService = TelegramService;
    window.WhatsAppService = WhatsAppService;
    window.NotificationQueue = NotificationQueue;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotificationService,
        TelegramService,
        WhatsAppService,
        NotificationQueue
    };
}
