/**
 * LocalStorage Database Layer
 * Abstracted functions for reading and writing data, making it ready to substitute with a backend database.
 */

const KEYS = {
    CUSTOMERS: 'grocery_customers',
    PRODUCTS: 'grocery_products',
    SALES: 'grocery_sales',
    PAYMENTS: 'grocery_payments',
    NOTIFICATIONS: 'grocery_notifications',
    NOTIFICATION_QUEUE: 'grocery_notification_queue',
    REMINDER_HISTORY: 'grocery_reminder_history',
    SETTINGS: 'grocery_settings',
    AUTH: 'grocery_auth',
    INVOICE_SEQ: 'grocery_invoice_sequence',
    PAYMENT_SEQ: 'grocery_payment_sequence',
    MARKET_CACHE: 'grocery_market_price_cache',
    MARKET_HISTORY: 'grocery_market_price_history'
};

const DEFAULT_SETTINGS = {
    shopName: 'My Grocery Shop',
    shopPhone: '+91 98765 43210',
    shopAddress: '123 Main Street, Market Area',
    shopEmail: 'contact@mygrocery.com',
    currency: '₹',
    defaultUnit: 'Piece',
    lowStockAlerts: true,
    dueReminders: true,
    notificationsEnabled: true,
    theme: 'light',
    // Stage 2 Bill / Invoice Settings
    shopLogo: '',
    taxRate: 0,
    taxEnabled: false,
    gstNumber: '',
    billFooter: 'Thank you for shopping with us!',
    invoicePrefix: 'INV-',
    defaultBillFormat: 'thermal-80',
    // Stage 3 Due & Payment Settings
    paymentPrefix: 'PAY-',
    defaultDueDays: 7,
    // Stage 4 Notification & Messaging Settings
    notifLowStock: true,
    notifOutOfStock: true,
    notifCustomerDue: true,
    notifCustomerOverdue: true,
    notifPaymentReceived: true,
    notifSaleCompleted: false,
    notifDailySummary: false,
    telegramConnected: false,
    telegramLowStock: true,
    telegramOutOfStock: true,
    telegramCustomerOverdue: true,
    telegramPaymentReceived: false,
    telegramDailySummary: true,
    whatsappConnected: false,
    whatsappAutoDueTomorrow: false,
    whatsappAutoDueToday: false,
    whatsappAutoOverdue1: false,
    whatsappAutoOverdue3: false,
    whatsappAutoOverdue7: false,
    // Stage 5 Market Price & Smart Stock Settings
    marketPriceSource: 'Government Data',
    marketDefaultLocation: 'Kerala',
    marketRefreshFrequency: 'manual',
    notifPriceAlerts: true,
    priceAlertThreshold: 5,
    defaultSafetyStockDays: 3,
    defaultSupplierLeadTime: 3
};

// Initial Mock Auth State
const DEFAULT_AUTH = {
    user: {
        id: 'user_01',
        name: 'Owner Name',
        role: 'Owner', // Owner, Manager, Staff
        email: 'owner@grocery.com'
    },
    isLoggedIn: true
};

const Storage = {
    // --- GENERIC GETTER/SETTER ---
    _get(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error reading ${key} from LocalStorage:`, e);
            return defaultValue;
        }
    },

    _set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Error saving ${key} to LocalStorage:`, e);
            return false;
        }
    },

    // --- SETTINGS ---
    getSettings() {
        const settings = localStorage.getItem(KEYS.SETTINGS);
        if (!settings) {
            this._set(KEYS.SETTINGS, DEFAULT_SETTINGS);
            return DEFAULT_SETTINGS;
        }
        return JSON.parse(settings);
    },

    saveSettings(settings) {
        return this._set(KEYS.SETTINGS, settings);
    },

    // --- AUTH (PLACEHOLDER) ---
    getAuth() {
        const auth = localStorage.getItem(KEYS.AUTH);
        if (!auth) {
            this._set(KEYS.AUTH, DEFAULT_AUTH);
            return DEFAULT_AUTH;
        }
        return JSON.parse(auth);
    },

    saveAuth(auth) {
        return this._set(KEYS.AUTH, auth);
    },

    // --- CUSTOMERS ---
    getCustomers() {
        return this._get(KEYS.CUSTOMERS, []);
    },

    saveCustomers(customers) {
        return this._set(KEYS.CUSTOMERS, customers);
    },

    getCustomer(id) {
        const customers = this.getCustomers();
        return customers.find(c => c.id === id) || null;
    },

    getCustomerByPhone(phone, excludeCustomerId = null) {
        if (!phone) return null;
        const cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (!cleanPhone) return null;
        const customers = this.getCustomers();
        return customers.find(c => {
            if (excludeCustomerId && c.id === excludeCustomerId) return false;
            const cPhoneClean = String(c.phone || '').replace(/[^0-9]/g, '');
            return cPhoneClean === cleanPhone;
        }) || null;
    },

    calculateCustomerFinancials(customerOrId) {
        const customer = typeof customerOrId === 'string' ? this.getCustomer(customerOrId) : customerOrId;
        if (!customer) {
            return {
                totalPurchases: 0,
                totalPaid: 0,
                currentDue: 0,
                lastPurchaseDate: null,
                lastTransactionDate: null,
                isOverdue: false,
                overdueDate: null,
                daysOverdue: 0,
                status: 'PAID'
            };
        }

        const sales = this.getSales().filter(s => s.customerId === customer.id);
        const payments = this.getPayments().filter(p => p.customerId === customer.id);

        // Sum of all sales
        const totalPurchases = sales.reduce((sum, s) => sum + (parseFloat(s.grandTotal !== undefined ? s.grandTotal : s.total) || 0), 0);

        // Sum of initial payments in sales + all recorded standalone payments
        const salesPaid = sales.reduce((sum, s) => sum + (parseFloat(s.amountPaid !== undefined ? s.amountPaid : s.paymentAmount) || 0), 0);
        const directPaymentsPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalPaid = salesPaid + directPaymentsPaid;

        // Total Due = (Opening Due + Sales Due) - Direct Payments (Source of truth, >= 0)
        const openingDue = parseFloat(customer.openingDue) || 0;
        const totalSalesDue = sales.reduce((sum, s) => sum + (parseFloat(s.amountDue !== undefined ? s.amountDue : s.dueAmount) || 0), 0);
        const rawDue = (openingDue + totalSalesDue) - directPaymentsPaid;
        const currentDue = Math.max(0, Math.round(rawDue * 100) / 100);

        // Last Purchase & Last Transaction dates
        let lastPurchaseDate = null;
        if (sales.length > 0) {
            const sortedSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
            lastPurchaseDate = sortedSales[0].date;
        }

        let lastTransactionDate = lastPurchaseDate;
        if (payments.length > 0) {
            const sortedPayments = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastPaymentDate = sortedPayments[0].date;
            if (!lastTransactionDate || new Date(lastPaymentDate) > new Date(lastTransactionDate)) {
                lastTransactionDate = lastPaymentDate;
            }
        }
        if (!lastTransactionDate && customer.createdDate) {
            lastTransactionDate = customer.createdDate;
        }

        // Overdue calculation:
        let isOverdue = false;
        let earliestOverdueDate = null;
        let daysOverdue = 0;
        const now = new Date();

        if (currentDue > 0) {
            // Check credit sales with dueDate
            const creditSales = sales.filter(s => (parseFloat(s.amountDue !== undefined ? s.amountDue : s.dueAmount) || 0) > 0);
            for (const s of creditSales) {
                const dDateStr = s.dueDate || s.date;
                if (dDateStr) {
                    const dDate = new Date(dDateStr);
                    dDate.setHours(23, 59, 59, 999);
                    if (now > dDate) {
                        isOverdue = true;
                        if (!earliestOverdueDate || new Date(dDateStr) < new Date(earliestOverdueDate)) {
                            earliestOverdueDate = dDateStr;
                        }
                    }
                }
            }

            // If openingDue > 0 and no specific credit sale due dates, check creation date + defaultDueDays
            if (!isOverdue && openingDue > 0 && creditSales.length === 0) {
                const settings = this.getSettings();
                const dueDays = settings.defaultDueDays || 7;
                const created = new Date(customer.createdDate || now);
                const dueTarget = new Date(created.getTime() + dueDays * 24 * 60 * 60 * 1000);
                if (now > dueTarget) {
                    isOverdue = true;
                    earliestOverdueDate = dueTarget.toISOString().split('T')[0];
                }
            }

            if (isOverdue && earliestOverdueDate) {
                const diffTime = Math.abs(now - new Date(earliestOverdueDate));
                daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
            }
        }

        let status = 'NO DUE';
        if (currentDue <= 0.001) {
            status = 'PAID';
        } else if (isOverdue) {
            status = 'OVERDUE';
        } else if (totalPaid > 0) {
            status = 'PARTIAL';
        } else {
            status = 'DUE';
        }

        return {
            totalPurchases,
            totalPaid,
            currentDue,
            lastPurchaseDate,
            lastTransactionDate,
            isOverdue,
            overdueDate: earliestOverdueDate,
            daysOverdue,
            status
        };
    },

    saveCustomer(customer) {
        const customers = this.getCustomers();
        customer.id = customer.id || 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        customer.createdDate = customer.createdDate || new Date().toISOString();
        customer.status = customer.status || 'Active';
        customer.openingDue = parseFloat(customer.openingDue) || 0;
        customer.currentDue = customer.currentDue !== undefined ? parseFloat(customer.currentDue) : customer.openingDue;
        customer.creditLimit = parseFloat(customer.creditLimit) || 10000;
        customer.transactions = customer.transactions || [];
        
        // If it's a new customer and opening due > 0, record opening due transaction
        if (customer.openingDue > 0 && customer.transactions.length === 0) {
            customer.transactions.push({
                id: 'tx_opening_' + Date.now(),
                date: customer.createdDate,
                type: 'Purchase', // recorded as a liability purchase
                amount: customer.openingDue,
                note: 'Opening Due balance',
                currentDue: customer.openingDue
            });
        }

        customers.push(customer);
        this.saveCustomers(customers);
        return customer;
    },

    updateCustomer(id, updatedData) {
        const customers = this.getCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) return false;

        customers[index] = { ...customers[index], ...updatedData };
        this.saveCustomers(customers);
        return customers[index];
    },

    deleteCustomer(id) {
        const customers = this.getCustomers();
        const filtered = customers.filter(c => c.id !== id);
        if (customers.length === filtered.length) return false;
        
        this.saveCustomers(filtered);
        return true;
    },

    // --- PRODUCTS / INVENTORY ---
    getProducts() {
        return this._get(KEYS.PRODUCTS, []);
    },

    saveProducts(products) {
        return this._set(KEYS.PRODUCTS, products);
    },

    getProduct(id) {
        const products = this.getProducts();
        return products.find(p => p.id === id) || null;
    },

    getProductByBarcode(barcode) {
        if (!barcode) return null;
        const clean = String(barcode).trim().toLowerCase();
        if (!clean) return null;
        const products = this.getProducts();
        return products.find(p => {
            const pBarcode = p.barcode ? String(p.barcode).trim().toLowerCase() : '';
            const pSku = p.sku ? String(p.sku).trim().toLowerCase() : '';
            return pBarcode === clean || (pSku && pSku === clean);
        }) || null;
    },

    saveProduct(product) {
        const products = this.getProducts();
        product.id = product.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        product.createdDate = product.createdDate || new Date().toISOString();
        product.updatedDate = new Date().toISOString();
        product.purchaseRate = parseFloat(product.purchaseRate) || 0;
        product.sellingRate = parseFloat(product.sellingRate) || 0;
        product.currentQuantity = parseFloat(product.currentQuantity) || 0;
        product.minimumStockLevel = parseFloat(product.minimumStockLevel) || 0;
        product.stockHistory = product.stockHistory || [];

        // Record initial stock entry
        if (product.currentQuantity > 0 && product.stockHistory.length === 0) {
            product.stockHistory.push({
                id: 'st_init_' + Date.now(),
                date: product.createdDate,
                type: 'Stock In',
                quantity: product.currentQuantity,
                note: 'Initial Stock setup',
                newQuantity: product.currentQuantity
            });
        }

        // Stage 5 Smart stock & Price history defaults
        product.purchaseBatches = product.purchaseBatches || [];
        product.priceHistory = product.priceHistory || [];
        product.leadTimeDays = parseFloat(product.leadTimeDays) || 3;
        product.safetyStockDays = parseFloat(product.safetyStockDays) || 3;
        product.targetStock = parseFloat(product.targetStock) || Math.max(product.minimumStockLevel * 3, 20);

        // Record initial purchase batch if not present
        if (product.currentQuantity > 0 && product.purchaseBatches.length === 0) {
            product.purchaseBatches.push({
                id: 'batch_init_' + Date.now(),
                date: product.createdDate,
                quantity: product.currentQuantity,
                purchasePrice: product.purchaseRate,
                supplier: product.supplier || 'Initial Stock',
                notes: 'Opening stock setup'
            });
        }

        // Record initial price history snapshot
        if (product.priceHistory.length === 0) {
            product.priceHistory.push({
                date: product.createdDate,
                purchasePrice: product.purchaseRate,
                sellingPrice: product.sellingRate,
                marketReference: product.marketReferencePrice || null
            });
        }

        products.push(product);
        this.saveProducts(products);
        return product;
    },

    updateProduct(id, updatedData) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return false;

        const currentProd = products[index];
        const newQuantity = updatedData.currentQuantity !== undefined ? parseFloat(updatedData.currentQuantity) : currentProd.currentQuantity;
        const qtyDiff = newQuantity - currentProd.currentQuantity;

        const productUpdates = {
            ...currentProd,
            ...updatedData,
            updatedDate: new Date().toISOString()
        };

        // If quantity changed, record in history
        if (qtyDiff !== 0) {
            productUpdates.stockHistory = productUpdates.stockHistory || [];
            productUpdates.stockHistory.push({
                id: 'st_adj_' + Date.now(),
                date: new Date().toISOString(),
                type: qtyDiff > 0 ? 'Stock In' : 'Stock Out',
                quantity: Math.abs(qtyDiff),
                note: updatedData.adjustmentNote || 'Stock Adjustment',
                newQuantity: newQuantity
            });
        }

        delete productUpdates.adjustmentNote; // cleanup temp prop

        products[index] = productUpdates;
        this.saveProducts(products);
        return products[index];
    },

    deleteProduct(id) {
        const products = this.getProducts();
        const filtered = products.filter(p => p.id !== id);
        if (products.length === filtered.length) return false;

        this.saveProducts(filtered);
        return true;
    },

    // --- INVOICE SEQUENCE ---
    getInvoiceSequence() {
        const seq = localStorage.getItem(KEYS.INVOICE_SEQ);
        if (!seq) {
            const initial = 1;
            localStorage.setItem(KEYS.INVOICE_SEQ, String(initial));
            return initial;
        }
        const parsed = parseInt(seq, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    },

    getNextInvoiceNumber() {
        const settings = this.getSettings();
        const prefix = settings.invoicePrefix || 'INV-';
        const currentSeq = this.getInvoiceSequence();
        const formatted = `${prefix}${String(currentSeq).padStart(6, '0')}`;
        // Increment and store sequence
        localStorage.setItem(KEYS.INVOICE_SEQ, String(currentSeq + 1));
        return formatted;
    },

    peekNextInvoiceNumber() {
        const settings = this.getSettings();
        const prefix = settings.invoicePrefix || 'INV-';
        const currentSeq = this.getInvoiceSequence();
        return `${prefix}${String(currentSeq).padStart(6, '0')}`;
    },

    // --- PAYMENT SEQUENCE ---
    getPaymentSequence() {
        const seq = localStorage.getItem(KEYS.PAYMENT_SEQ);
        if (!seq) {
            const initial = 1;
            localStorage.setItem(KEYS.PAYMENT_SEQ, String(initial));
            return initial;
        }
        const parsed = parseInt(seq, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    },

    getNextPaymentNumber() {
        const settings = this.getSettings();
        const prefix = settings.paymentPrefix || 'PAY-';
        const currentSeq = this.getPaymentSequence();
        const formatted = `${prefix}${String(currentSeq).padStart(6, '0')}`;
        localStorage.setItem(KEYS.PAYMENT_SEQ, String(currentSeq + 1));
        return formatted;
    },

    peekNextPaymentNumber() {
        const settings = this.getSettings();
        const prefix = settings.paymentPrefix || 'PAY-';
        const currentSeq = this.getPaymentSequence();
        return `${prefix}${String(currentSeq).padStart(6, '0')}`;
    },

    // --- PAYMENTS COLLECTION ---
    getPayments() {
        return this._get(KEYS.PAYMENTS, []);
    },

    savePayments(payments) {
        return this._set(KEYS.PAYMENTS, payments);
    },

    getPayment(id) {
        const payments = this.getPayments();
        return payments.find(p => p.id === id || p.paymentNumber === id) || null;
    },

    getPaymentsByCustomer(customerId) {
        const payments = this.getPayments();
        return payments.filter(p => p.customerId === customerId);
    },

    // --- SALES / TRANSACTIONS ---
    getSales() {
        let sales = this._get(KEYS.SALES, []);
        if (!sales || sales.length === 0) {
            this.loadDemoData();
            sales = this._get(KEYS.SALES, []);
        }
        return sales;
    },

    saveSales(sales) {
        return this._set(KEYS.SALES, sales);
    },

    getSale(id) {
        const sales = this.getSales();
        return sales.find(s => s.id === id || s.invoiceNumber === id) || null;
    },

    saveSale(sale) {
        const sales = this.getSales();
        const settings = this.getSettings();
        
        sale.id = sale.id || 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        if (!sale.invoiceNumber) {
            sale.invoiceNumber = this.getNextInvoiceNumber();
        }
        sale.date = sale.date || new Date().toISOString();
        sale.createdAt = sale.createdAt || sale.date;

        // Subtotal, Discount, Tax, GrandTotal
        sale.subtotal = parseFloat(sale.subtotal !== undefined ? sale.subtotal : (sale.total || 0)) || 0;
        sale.discount = parseFloat(sale.discount) || 0;
        sale.tax = parseFloat(sale.tax) || 0;
        sale.grandTotal = parseFloat(sale.grandTotal !== undefined ? sale.grandTotal : (sale.total !== undefined ? sale.total : (sale.subtotal - sale.discount + sale.tax))) || 0;
        sale.total = sale.grandTotal; // maintain total for backwards compatibility

        sale.paymentMethod = sale.paymentMethod || 'Cash';
        sale.amountPaid = parseFloat(sale.amountPaid !== undefined ? sale.amountPaid : (sale.paymentAmount || 0)) || 0;
        sale.paymentAmount = sale.amountPaid; // backwards compatibility
        sale.amountDue = parseFloat(sale.amountDue !== undefined ? sale.amountDue : (sale.dueAmount || 0)) || 0;
        sale.dueAmount = sale.amountDue; // backwards compatibility
        sale.change = parseFloat(sale.change) || 0;

        // Payment status: "paid" | "partial" | "due"
        if (sale.amountDue <= 0.001) {
            sale.paymentStatus = 'paid';
        } else if (sale.amountPaid > 0.001) {
            sale.paymentStatus = 'partial';
        } else {
            sale.paymentStatus = 'due';
        }

        // Calculate and set dueDate for credit / partial due sales
        if (sale.amountDue > 0.001) {
            if (!sale.dueDate) {
                const dueDays = settings.defaultDueDays || 7;
                const saleDateObj = new Date(sale.date || new Date());
                saleDateObj.setDate(saleDateObj.getDate() + dueDays);
                sale.dueDate = saleDateObj.toISOString().split('T')[0];
            }
        } else {
            sale.dueDate = null;
        }

        // Store immutable item snapshots
        if (sale.items && Array.isArray(sale.items)) {
            sale.items = sale.items.map(item => {
                const qty = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.rate !== undefined ? item.rate : (item.sellingRate || 0)) || 0;
                return {
                    productId: item.productId || '',
                    productName: item.productName || item.name || 'Product',
                    barcode: item.barcode || '',
                    sku: item.sku || '',
                    quantity: qty,
                    unit: item.unit || 'Piece',
                    rate: rate,
                    total: parseFloat(item.total !== undefined ? item.total : (qty * rate)) || 0
                };
            });
        } else {
            sale.items = [];
        }

        sales.push(sale);
        this.saveSales(sales);

        // Update customer credit/due balance if customer is attached
        if (sale.customerId && sale.customerId !== 'walk-in') {
            const customer = this.getCustomer(sale.customerId);
            if (customer) {
                const oldDue = parseFloat(customer.currentDue) || 0;
                const newDue = oldDue + sale.amountDue;
                const txDate = sale.date;

                customer.currentDue = newDue;
                customer.transactions = customer.transactions || [];
                
                // Add Sale Transaction to customer ledger
                const txType = sale.paymentStatus === 'paid' ? 'Purchase' : 'Credit Purchase';
                customer.transactions.push({
                    id: 'tx_sale_' + sale.id,
                    date: txDate,
                    dueDate: sale.dueDate || null,
                    type: txType,
                    amount: sale.grandTotal,
                    paidAmount: sale.amountPaid,
                    dueAmount: sale.amountDue,
                    invoiceNumber: sale.invoiceNumber,
                    saleId: sale.id,
                    note: `Invoice #${sale.invoiceNumber} (${sale.paymentMethod})`,
                    currentDue: newDue
                });

                this.updateCustomer(customer.id, {
                    currentDue: customer.currentDue,
                    transactions: customer.transactions
                });
            }
        }

        // Auto stock deduction strictly AFTER sale confirmation
        if (sale.items && sale.items.length > 0) {
            sale.items.forEach(item => {
                if (item.productId) {
                    const product = this.getProduct(item.productId);
                    if (product) {
                        const newQty = Math.max(0, (parseFloat(product.currentQuantity) || 0) - item.quantity);
                        this.updateProduct(product.id, {
                            currentQuantity: newQty,
                            adjustmentNote: `Sale #${sale.invoiceNumber}`
                        });
                    }
                }
            });
        }

        return sale;
    },

    // Record customer payment with unique sequence, receipts, and ledger integration
    recordCustomerPayment(customerId, amount, paymentMethod = 'Cash', notes = '', date = null) {
        const customer = this.getCustomer(customerId);
        if (!customer) return false;

        const paidAmount = parseFloat(amount) || 0;
        if (paidAmount <= 0) return false;

        const settings = this.getSettings();
        const paymentNumber = this.getNextPaymentNumber();
        const paymentDate = date ? new Date(date).toISOString() : new Date().toISOString();

        // 1. Create and save standalone payment record
        const paymentRecord = {
            id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            paymentNumber: paymentNumber,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            amount: paidAmount,
            paymentMethod: paymentMethod || 'Cash',
            notes: notes || '',
            date: paymentDate,
            createdAt: new Date().toISOString()
        };

        const payments = this.getPayments();
        payments.push(paymentRecord);
        this.savePayments(payments);

        // 2. Compute updated due balance based on ledger source of truth
        const oldDue = parseFloat(customer.currentDue) || 0;
        const newDue = Math.max(0, Math.round((oldDue - paidAmount) * 100) / 100);
        paymentRecord.remainingDue = newDue;

        // 3. Append to Customer Transactions Ledger
        customer.currentDue = newDue;
        customer.transactions = customer.transactions || [];
        customer.transactions.push({
            id: 'tx_' + paymentRecord.id,
            paymentId: paymentRecord.id,
            paymentNumber: paymentNumber,
            date: paymentDate,
            type: 'Payment',
            amount: paidAmount,
            paymentMethod: paymentMethod,
            note: notes ? `${notes} (${paymentNumber})` : `Payment #${paymentNumber} (${paymentMethod})`,
            currentDue: newDue
        });

        this.updateCustomer(customer.id, {
            currentDue: customer.currentDue,
            transactions: customer.transactions
        });

        // 4. Create in-app system notification
        const notifMsg = `Payment #${paymentNumber} of ${settings.currency}${paidAmount} received from ${customer.name}. Remaining due: ${settings.currency}${newDue}.`;
        const notifications = this.getNotifications();
        notifications.unshift({
            id: 'notif_pay_' + paymentRecord.id,
            type: 'payment',
            title: 'Payment Received',
            message: notifMsg,
            targetId: customer.id,
            read: false,
            date: new Date().toISOString()
        });
        this.saveNotifications(notifications);

        return paymentRecord;
    },

    // --- NOTIFICATIONS & RETENTION ---
    getNotifications() {
        const raw = this._get(KEYS.NOTIFICATIONS, []);
        return raw.map(n => ({
            id: n.id || 'notif_' + Date.now(),
            type: (n.type || 'SYSTEM').toUpperCase(),
            title: n.title || 'Notification',
            message: n.message || '',
            entityType: n.entityType || (n.targetId ? (String(n.type).toLowerCase().includes('stock') ? 'product' : 'customer') : 'system'),
            entityId: n.entityId || n.targetId || null,
            targetId: n.targetId || n.entityId || null,
            createdAt: n.createdAt || n.date || new Date().toISOString(),
            date: n.date || n.createdAt || new Date().toISOString(),
            read: !!n.read,
            priority: (n.priority || (String(n.type).toUpperCase().includes('OUT_OF_STOCK') ? 'CRITICAL' : (String(n.type).toUpperCase().includes('LOW_STOCK') || String(n.type).toUpperCase().includes('OVERDUE') ? 'HIGH' : 'NORMAL'))).toUpperCase(),
            eventKey: n.eventKey || (n.targetId ? `${String(n.type).toUpperCase()}:${n.targetId}` : null),
            resolved: !!n.resolved
        }));
    },

    saveNotifications(notifications) {
        let list = Array.isArray(notifications) ? [...notifications] : [];
        if (list.length > 150) {
            // Keep unread & critical/high first, prune older read low-priority
            const unreadOrHigh = list.filter(n => !n.read || n.priority === 'CRITICAL' || n.priority === 'HIGH');
            const others = list.filter(n => n.read && n.priority !== 'CRITICAL' && n.priority !== 'HIGH');
            list = [...unreadOrHigh, ...others].slice(0, 150);
        }
        return this._set(KEYS.NOTIFICATIONS, list);
    },

    // --- NOTIFICATION QUEUE (OFFLINE-FIRST & EXTERNAL ALERTS) ---
    getNotificationQueue() {
        return this._get(KEYS.NOTIFICATION_QUEUE, []);
    },

    saveNotificationQueue(queue) {
        return this._set(KEYS.NOTIFICATION_QUEUE, queue);
    },

    // --- REMINDER HISTORY (WHATSAPP & CUSTOMER REMINDERS) ---
    getReminderHistory() {
        return this._get(KEYS.REMINDER_HISTORY, []);
    },

    saveReminderHistory(history) {
        return this._set(KEYS.REMINDER_HISTORY, history);
    },

    getRemindersForCustomer(customerId) {
        if (!customerId) return [];
        const all = this.getReminderHistory();
        return all.filter(r => r.customerId === customerId);
    },

    addReminderRecord(record) {
        const history = this.getReminderHistory();
        const newRecord = {
            id: record.id || 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            customerId: record.customerId,
            customerName: record.customerName || '',
            phone: record.phone || '',
            amountDue: parseFloat(record.amountDue) || 0,
            dueDate: record.dueDate || null,
            templateType: record.templateType || 'standard',
            message: record.message || '',
            channel: record.channel || 'whatsapp',
            status: record.status || 'Sent', // Draft, Ready, Sent, Delivered, Failed
            createdAt: record.createdAt || new Date().toISOString(),
            sentAt: record.sentAt || new Date().toISOString(),
            error: record.error || null
        };
        history.unshift(newRecord);
        this.saveReminderHistory(history);
        return newRecord;
    },

    // --- DEMO DATA LOAD / REMOVE ---
    loadDemoData() {
        this.clearAllData();

        const demoCustomers = [
            {
                name: 'Arun Kumar',
                phone: '+91 98765 00001',
                address: 'Building A, Ground Floor',
                openingDue: 1500,
                currentDue: 1500,
                creditLimit: 5000,
                notes: 'Regular customer. Prefers evening delivery.',
                status: 'Active'
            },
            {
                name: 'Rahul Sharma',
                phone: '+91 98765 00002',
                address: 'Pocket-C, Flat 405',
                openingDue: 1190,
                currentDue: 1190,
                creditLimit: 3000,
                notes: 'Always pays via UPI.',
                status: 'Active'
            },
            {
                name: 'Akhil Pillai',
                phone: '+91 98765 00003',
                address: 'Near Old Church, Cross Road',
                openingDue: 0,
                currentDue: 0,
                creditLimit: 8000,
                notes: 'Bulk buyer. Owner of nearby tea shop.',
                status: 'Active'
            },
            {
                name: 'Priya Nair',
                phone: '+91 98765 00004',
                address: 'Flat 302, Green Valley',
                openingDue: 0,
                currentDue: 0,
                creditLimit: 5000,
                notes: 'Settled account.',
                status: 'Active'
            }
        ];

        const demoProducts = [
            {
                productName: 'Basmati Rice Premium',
                category: 'Grains & Rice',
                brand: 'India Gate',
                sku: 'BG-RICE-5K',
                barcode: '8901234567890',
                purchaseRate: 80,
                sellingRate: 110,
                currentQuantity: 25,
                minimumStockLevel: 10,
                unit: 'Kilogram',
                supplier: 'Kalyan Distributors',
                expiryDate: '2027-08-31'
            },
            {
                productName: 'Refined Cooking Oil',
                category: 'Oil & Ghee',
                brand: 'Fortune',
                sku: 'FORT-OIL-1L',
                barcode: '8901234567891',
                purchaseRate: 120,
                sellingRate: 145,
                currentQuantity: 4.5,
                minimumStockLevel: 5,
                unit: 'Liter',
                supplier: 'Fortune Agency',
                expiryDate: '2027-02-28'
            },
            {
                productName: 'Toned Fresh Milk',
                category: 'Dairy',
                brand: 'Amul',
                sku: 'AMUL-MILK-500M',
                barcode: '8901234567892',
                purchaseRate: 27,
                sellingRate: 30,
                currentQuantity: 0,
                minimumStockLevel: 8,
                unit: 'Packet',
                supplier: 'Amul Dairy Booth',
                expiryDate: '2026-09-02'
            },
            {
                productName: 'Refined White Sugar',
                category: 'Groceries',
                brand: 'Mawana',
                sku: 'MAW-SUG-1K',
                barcode: '8901234567893',
                purchaseRate: 36,
                sellingRate: 45,
                currentQuantity: 12,
                minimumStockLevel: 8,
                unit: 'Kilogram',
                supplier: 'Local Mandi',
                expiryDate: '2027-12-31'
            },
            {
                productName: 'Liquid Handwash Refill',
                category: 'Household',
                brand: 'Dettol',
                sku: 'DET-HW-175',
                barcode: '8901234567894',
                purchaseRate: 75,
                sellingRate: 99,
                currentQuantity: 15,
                minimumStockLevel: 4,
                unit: 'Piece',
                supplier: 'Reckitt Dist',
                expiryDate: '2028-05-15'
            },
            {
                productName: 'Chocolate Chip Cookies',
                category: 'Snacks & Biscuits',
                brand: 'Good Day',
                sku: 'GD-COOKIE-120',
                barcode: '8901234567895',
                purchaseRate: 15,
                sellingRate: 20,
                currentQuantity: 40,
                minimumStockLevel: 10,
                unit: 'Pack',
                supplier: 'Britannia Agency',
                expiryDate: '2027-01-15'
            },
            {
                productName: 'Whole Wheat Atta 5kg',
                category: 'Grains & Rice',
                brand: 'Aashirvaad',
                sku: 'AASH-ATTA-5K',
                barcode: '8901234567896',
                purchaseRate: 195,
                sellingRate: 235,
                currentQuantity: 18,
                minimumStockLevel: 5,
                unit: 'Pack',
                supplier: 'ITC Wholesale',
                expiryDate: '2027-06-30'
            },
            {
                productName: 'Pure Cow Ghee 500ml',
                category: 'Oil & Ghee',
                brand: 'Amul',
                sku: 'AMUL-GHEE-500',
                barcode: '8901234567897',
                purchaseRate: 290,
                sellingRate: 340,
                currentQuantity: 14,
                minimumStockLevel: 4,
                unit: 'Bottle',
                supplier: 'Amul Dairy Booth',
                expiryDate: '2027-11-30'
            },
            {
                productName: 'Green Tea Bags (25 Pack)',
                category: 'Beverages',
                brand: 'Lipton',
                sku: 'LIP-GTEA-25',
                barcode: '8901234567898',
                purchaseRate: 140,
                sellingRate: 180,
                currentQuantity: 22,
                minimumStockLevel: 6,
                unit: 'Box',
                supplier: 'Hindustan Unilever',
                expiryDate: '2028-02-15'
            },
            {
                productName: 'Instant Oats 1kg',
                category: 'Groceries',
                brand: 'Quaker',
                sku: 'QKR-OATS-1K',
                barcode: '8901234567899',
                purchaseRate: 150,
                sellingRate: 190,
                currentQuantity: 16,
                minimumStockLevel: 5,
                unit: 'Pack',
                supplier: 'PepsiCo Dist',
                expiryDate: '2027-09-30'
            }
        ];

        // Seed Customers
        demoCustomers.forEach(cust => this.saveCustomer(cust));

        // Seed Products
        demoProducts.forEach(prod => this.saveProduct(prod));

        // Mock a couple of sales to generate historical logs
        const customerList = this.getCustomers();
        const productList = this.getProducts();

        const arun = customerList.find(c => c.name.includes('Arun'));
        const rahul = customerList.find(c => c.name.includes('Rahul'));
        const rice = productList.find(p => p.productName.includes('Rice'));
        const sugar = productList.find(p => p.productName.includes('Sugar'));
        const cookies = productList.find(p => p.productName.includes('Cookies'));

        // Reset invoice sequence
        localStorage.setItem(KEYS.INVOICE_SEQ, '1');

        if (arun && rice && sugar) {
            // Sale 1: Arun bought rice and sugar on credit
            this.saveSale({
                invoiceNumber: 'INV-000001',
                customerId: arun.id,
                customerName: arun.name,
                customerPhone: arun.phone,
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                items: [
                    { productId: rice.id, productName: rice.productName, barcode: rice.barcode, sku: rice.sku, quantity: 5, unit: rice.unit, rate: rice.sellingRate, total: 5 * rice.sellingRate },
                    { productId: sugar.id, productName: sugar.productName, barcode: sugar.barcode, sku: sugar.sku, quantity: 2, unit: sugar.unit, rate: sugar.sellingRate, total: 2 * sugar.sellingRate }
                ],
                subtotal: 640,
                discount: 0,
                tax: 0,
                grandTotal: 640,
                paymentMethod: 'Credit/Due',
                amountPaid: 0,
                amountDue: 640,
                change: 0
            });
        }

        if (rahul && cookies && sugar) {
            // Sale 2: Rahul bought cookies and sugar, paid partially
            this.saveSale({
                invoiceNumber: 'INV-000002',
                customerId: rahul.id,
                customerName: rahul.name,
                customerPhone: rahul.phone,
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                items: [
                    { productId: cookies.id, productName: cookies.productName, barcode: cookies.barcode, sku: cookies.sku, quantity: 5, unit: cookies.unit, rate: cookies.sellingRate, total: 5 * cookies.sellingRate }, // 100
                    { productId: sugar.id, productName: sugar.productName, barcode: sugar.barcode, sku: sugar.sku, quantity: 10, unit: sugar.unit, rate: sugar.sellingRate, total: 10 * sugar.sellingRate } // 450
                ],
                subtotal: 550,
                discount: 0,
                tax: 0,
                grandTotal: 550,
                paymentMethod: 'Cash',
                amountPaid: 300,
                amountDue: 250,
                change: 0
            });
        }

        if (rice && cookies) {
            // Sale 3: Walk-in customer cash sale
            this.saveSale({
                invoiceNumber: 'INV-000003',
                customerId: 'walk-in',
                customerName: 'Walk-in Customer',
                customerPhone: '',
                date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
                items: [
                    { productId: rice.id, productName: rice.productName, barcode: rice.barcode, sku: rice.sku, quantity: 2, unit: rice.unit, rate: rice.sellingRate, total: 2 * rice.sellingRate }, // 220
                    { productId: cookies.id, productName: cookies.productName, barcode: cookies.barcode, sku: cookies.sku, quantity: 2, unit: cookies.unit, rate: cookies.sellingRate, total: 2 * cookies.sellingRate } // 40
                ],
                subtotal: 260,
                discount: 0,
                tax: 0,
                grandTotal: 260,
                paymentMethod: 'Cash',
                amountPaid: 300,
                amountDue: 0,
                change: 40
            });
        }

        // Set next sequence to 4
        localStorage.setItem(KEYS.INVOICE_SEQ, '4');

        // Set default initial settings
        this._set(KEYS.SETTINGS, DEFAULT_SETTINGS);
        this._set(KEYS.AUTH, DEFAULT_AUTH);
        
        // Generate notifications
        this.runStockCheckAndNotify();

        return true;
    },

    clearAllData() {
        localStorage.removeItem(KEYS.CUSTOMERS);
        localStorage.removeItem(KEYS.PRODUCTS);
        localStorage.removeItem(KEYS.SALES);
        localStorage.removeItem(KEYS.PAYMENTS);
        localStorage.removeItem(KEYS.NOTIFICATIONS);
        localStorage.removeItem(KEYS.INVOICE_SEQ);
        localStorage.removeItem(KEYS.PAYMENT_SEQ);
        // Leave settings & auth intact or set to defaults
        this._set(KEYS.SETTINGS, DEFAULT_SETTINGS);
        this._set(KEYS.AUTH, DEFAULT_AUTH);
    },

    resetApplication() {
        localStorage.clear();
        this._set(KEYS.SETTINGS, DEFAULT_SETTINGS);
        this._set(KEYS.AUTH, DEFAULT_AUTH);
        return true;
    },

    // --- SYSTEM UTILS & CHECKS WITH DEDUPLICATION & RESTOCK RESOLUTION ---
    runStockCheckAndNotify() {
        const settings = this.getSettings();
        const products = this.getProducts();
        let notifications = this.getNotifications();
        let updated = false;

        products.forEach(p => {
            const qty = parseFloat(p.currentQuantity) || 0;
            const min = parseFloat(p.minimumStockLevel) || 0;
            const lowKey = `LOW_STOCK:${p.id}`;
            const outKey = `OUT_OF_STOCK:${p.id}`;

            if (qty > min) {
                // Product is safely above reorder level - resolve previous alerts
                const activeAlerts = notifications.filter(n => 
                    (n.eventKey === lowKey || n.eventKey === outKey || n.targetId === p.id) && 
                    (n.type === 'LOW_STOCK' || n.type === 'OUT_OF_STOCK') && 
                    !n.resolved
                );

                if (activeAlerts.length > 0) {
                    activeAlerts.forEach(a => {
                        a.resolved = true;
                        a.read = true;
                    });
                    updated = true;
                }
            } else if (qty === 0) {
                // Out of stock
                if (settings.notifOutOfStock !== false) {
                    const exists = notifications.some(n => 
                        (n.eventKey === outKey || (n.targetId === p.id && n.type === 'OUT_OF_STOCK')) && 
                        !n.resolved && !n.read
                    );

                    if (!exists) {
                        // Mark lower-priority low-stock as resolved
                        notifications.forEach(n => {
                            if ((n.eventKey === lowKey || n.targetId === p.id) && n.type === 'LOW_STOCK') {
                                n.resolved = true;
                            }
                        });

                        notifications.unshift({
                            id: 'notif_out_' + p.id + '_' + Date.now(),
                            type: 'OUT_OF_STOCK',
                            title: 'Out of Stock Alert',
                            message: `"${p.productName}" is out of stock! Restock required.`,
                            entityType: 'product',
                            entityId: p.id,
                            targetId: p.id,
                            createdAt: new Date().toISOString(),
                            date: new Date().toISOString(),
                            read: false,
                            priority: 'CRITICAL',
                            eventKey: outKey,
                            resolved: false
                        });
                        updated = true;

                        // Trigger Telegram owner alert if configured
                        if (typeof TelegramService !== 'undefined') {
                            TelegramService.sendAlert('OUT_OF_STOCK', { product: p, quantity: qty, minLevel: min });
                        }
                    }
                }
            } else if (qty <= min) {
                // Low stock
                if (settings.notifLowStock !== false) {
                    const exists = notifications.some(n => 
                        (n.eventKey === lowKey || (n.targetId === p.id && n.type === 'LOW_STOCK')) && 
                        !n.resolved && !n.read
                    );

                    if (!exists) {
                        notifications.unshift({
                            id: 'notif_low_' + p.id + '_' + Date.now(),
                            type: 'LOW_STOCK',
                            title: 'Low Stock Alert',
                            message: `"${p.productName}" is running low. Current: ${qty} ${p.unit || 'pc'}(s), Reorder limit: ${min} ${p.unit || 'pc'}(s).`,
                            entityType: 'product',
                            entityId: p.id,
                            targetId: p.id,
                            createdAt: new Date().toISOString(),
                            date: new Date().toISOString(),
                            read: false,
                            priority: 'HIGH',
                            eventKey: lowKey,
                            resolved: false
                        });
                        updated = true;

                        // Trigger Telegram owner alert if configured
                        if (typeof TelegramService !== 'undefined') {
                            TelegramService.sendAlert('LOW_STOCK', { product: p, quantity: qty, minLevel: min });
                        }
                    }
                }
            }
        });

        if (updated) {
            this.saveNotifications(notifications);
        }

        // Also check overdue customer debts
        this.runDueCheckAndNotify();
    },

    runDueCheckAndNotify() {
        const settings = this.getSettings();
        const customers = this.getCustomers();
        let notifications = this.getNotifications();
        let updated = false;
        const todayStr = new Date().toISOString().split('T')[0];

        customers.forEach(c => {
            const fin = this.calculateCustomerFinancials(c);
            const overdueKey = `CUSTOMER_OVERDUE:${c.id}:${todayStr}`;
            const dueKey = `CUSTOMER_DUE:${c.id}`;

            if (fin.currentDue <= 0) {
                // Due cleared - resolve previous due/overdue alerts
                const activeDues = notifications.filter(n => 
                    (n.targetId === c.id || (n.eventKey && n.eventKey.includes(c.id))) && 
                    (n.type === 'CUSTOMER_DUE' || n.type === 'CUSTOMER_OVERDUE') && 
                    !n.resolved
                );
                if (activeDues.length > 0) {
                    activeDues.forEach(a => {
                        a.resolved = true;
                        a.read = true;
                    });
                    updated = true;
                }
            } else if (fin.isOverdue) {
                if (settings.notifCustomerOverdue !== false) {
                    // Check if already notified for this customer today or active unread exists
                    const exists = notifications.some(n => 
                        ((n.eventKey === overdueKey) || (n.targetId === c.id && n.type === 'CUSTOMER_OVERDUE')) && 
                        !n.read && !n.resolved
                    );

                    if (!exists) {
                        const cur = settings.currency || '₹';
                        const daysText = fin.daysOverdue > 0 ? ` (${fin.daysOverdue} days overdue)` : '';
                        notifications.unshift({
                            id: 'notif_overdue_' + c.id + '_' + Date.now(),
                            type: 'CUSTOMER_OVERDUE',
                            title: 'Customer Payment Overdue',
                            message: `${c.name} has ${cur}${fin.currentDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} overdue${daysText}.`,
                            entityType: 'customer',
                            entityId: c.id,
                            targetId: c.id,
                            createdAt: new Date().toISOString(),
                            date: new Date().toISOString(),
                            read: false,
                            priority: 'HIGH',
                            eventKey: overdueKey,
                            resolved: false
                        });
                        updated = true;

                        // Trigger Telegram owner alert if configured
                        if (typeof TelegramService !== 'undefined') {
                            TelegramService.sendAlert('CUSTOMER_OVERDUE', { customer: c, currentDue: fin.currentDue, overdueDays: fin.daysOverdue, dueDate: fin.overdueDate });
                        }
                    }
                }
            }
        });

        if (updated) {
            this.saveNotifications(notifications);
        }
    },

    // --- STAGE 5: SMART STOCK & INVENTORY ANALYTICS ---

    /**
     * Calculate Average Daily Sales from actual sales history over a time window (default 30 days)
     * Handles zero sales and insufficient data cleanly without dividing by zero.
     */
    calculateProductDailySales(productId, daysWindow = 30) {
        if (!productId) {
            return { averageDailySales: 0, totalSold: 0, daysWindow, hasEnoughData: false, noSales: true, label: 'Not enough sales data' };
        }

        const sales = this.getSales();
        const now = Date.now();
        const windowMs = daysWindow * 24 * 60 * 60 * 1000;
        let totalSold = 0;
        let saleOccurrences = 0;

        sales.forEach(sale => {
            const saleTime = new Date(sale.date || sale.createdAt || now).getTime();
            if (now - saleTime <= windowMs && sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    if (item.productId === productId) {
                        totalSold += parseFloat(item.quantity) || 0;
                        saleOccurrences++;
                    }
                });
            }
        });

        // Ensure safe division
        const safeDays = Math.max(1, daysWindow);
        const averageDailySales = Math.round((totalSold / safeDays) * 100) / 100;

        return {
            averageDailySales,
            totalSold: Math.round(totalSold * 100) / 100,
            saleOccurrences,
            daysWindow: safeDays,
            hasEnoughData: saleOccurrences > 0 || totalSold > 0,
            noSales: totalSold === 0,
            label: totalSold > 0 ? `${averageDailySales} / day` : (saleOccurrences === 0 ? 'Not enough sales data' : 'No recent sales')
        };
    },

    /**
     * Calculate Smart Stock Intelligence for a product:
     * - Current Stock
     * - Reorder Level
     * - Target Stock
     * - Average Daily Sales
     * - Estimated Days of Stock Remaining (Current Stock ÷ Average Daily Sales)
     * - Recommended Reorder Quantity (Target - Current or Lead Time + Safety Stock)
     * - Status (HEALTHY, REORDER_SOON, LOW_STOCK, OUT_OF_STOCK, NO_SALES_DATA)
     */
    calculateProductSmartStock(productId) {
        const product = typeof productId === 'string' ? this.getProduct(productId) : productId;
        if (!product) return null;

        const settings = this.getSettings();
        const currentQty = Math.max(0, parseFloat(product.currentQuantity) || 0);
        const reorderLevel = Math.max(0, parseFloat(product.minimumStockLevel) || 5);
        const leadTimeDays = parseFloat(product.leadTimeDays) || (settings.defaultSupplierLeadTime || 3);
        const safetyDays = parseFloat(product.safetyStockDays) || (settings.defaultSafetyStockDays || 3);
        
        const salesInfo = this.calculateProductDailySales(product.id, 30);
        const avgDaily = salesInfo.averageDailySales;

        // Default or configured target stock
        const dynamicTarget = Math.max(reorderLevel * 3, Math.ceil(avgDaily * (leadTimeDays + safetyDays + 10)));
        const targetStock = Math.max(reorderLevel + 1, parseFloat(product.targetStock) || dynamicTarget || 20);

        // Days remaining calculation (safe division)
        let estimatedDaysRemaining = null;
        let daysRemainingText = 'Not enough sales data';

        if (currentQty === 0) {
            estimatedDaysRemaining = 0;
            daysRemainingText = 'Out of stock';
        } else if (avgDaily > 0) {
            const rawDays = currentQty / avgDaily;
            estimatedDaysRemaining = Math.round(rawDays * 10) / 10;
            const approxDays = Math.round(rawDays);
            daysRemainingText = `Approximately ${approxDays} day${approxDays === 1 ? '' : 's'} remaining`;
        } else if (salesInfo.noSales) {
            daysRemainingText = 'No recent sales';
        }

        // Determine Smart Status
        let status = 'HEALTHY';
        let statusLabel = 'Healthy';
        let statusPillClass = 'status-pill-healthy';

        if (currentQty === 0) {
            status = 'OUT_OF_STOCK';
            statusLabel = 'Out of Stock';
            statusPillClass = 'status-pill-out';
        } else if (currentQty <= reorderLevel) {
            status = 'LOW_STOCK';
            statusLabel = 'Low Stock';
            statusPillClass = 'status-pill-low';
        } else if (estimatedDaysRemaining !== null && estimatedDaysRemaining <= (leadTimeDays + safetyDays)) {
            status = 'REORDER_SOON';
            statusLabel = 'Reorder Soon';
            statusPillClass = 'status-pill-reorder';
        } else if (!salesInfo.hasEnoughData) {
            status = 'NO_SALES_DATA';
            statusLabel = 'No Sales Data';
            statusPillClass = 'status-pill-no-data';
        }

        // Recommended Reorder Quantity Calculation
        let recommendedReorder = 0;
        const isDiscreteUnit = ['piece', 'pack', 'packet', 'box', 'can', 'bottle'].includes(String(product.unit || '').toLowerCase());

        if (currentQty <= reorderLevel || (estimatedDaysRemaining !== null && estimatedDaysRemaining <= (leadTimeDays + safetyDays))) {
            const deficit = Math.max(0, targetStock - currentQty);
            const safetyBufferDemand = Math.ceil(avgDaily * (leadTimeDays + safetyDays));
            recommendedReorder = Math.max(deficit, safetyBufferDemand, reorderLevel);
            if (isDiscreteUnit) {
                recommendedReorder = Math.ceil(recommendedReorder);
            } else {
                recommendedReorder = Math.round(recommendedReorder * 10) / 10;
            }
        }

        const unit = product.unit || 'unit';
        const explanation = avgDaily > 0
            ? `Average sales: ${avgDaily} ${unit}/day | Safety period: ${safetyDays} days | Lead time: ${leadTimeDays} days | Target stock: ${targetStock} ${unit}`
            : `Reorder level: ${reorderLevel} ${unit} | Target stock: ${targetStock} ${unit}`;

        return {
            productId: product.id,
            productName: product.productName,
            currentQuantity: currentQty,
            reorderLevel,
            targetStock,
            unit,
            leadTimeDays,
            safetyDays,
            averageDailySales: avgDaily,
            salesInfo,
            estimatedDaysRemaining,
            daysRemainingText,
            recommendedReorder,
            status,
            statusLabel,
            statusPillClass,
            explanation
        };
    },

    /**
     * Compute Stock Insights Summary for Dashboard & Stock Page
     */
    getStockInsightsSummary() {
        const products = this.getProducts();
        let needingReorderCount = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        let lessThan7DaysCount = 0;
        const analyzedProducts = [];

        products.forEach(p => {
            const smart = this.calculateProductSmartStock(p);
            if (smart) {
                analyzedProducts.push(smart);
                if (smart.status === 'OUT_OF_STOCK') outOfStockCount++;
                else if (smart.status === 'LOW_STOCK') lowStockCount++;
                else if (smart.status === 'REORDER_SOON') needingReorderCount++;

                if (smart.estimatedDaysRemaining !== null && smart.estimatedDaysRemaining > 0 && smart.estimatedDaysRemaining <= 7) {
                    lessThan7DaysCount++;
                }
            }
        });

        // Top Selling Products in last 30 days
        const salesByProduct = {};
        const sales = this.getSales();
        const now = Date.now();
        const windowMs = 30 * 24 * 60 * 60 * 1000;

        sales.forEach(s => {
            const sTime = new Date(s.date || now).getTime();
            if (now - sTime <= windowMs && s.items) {
                s.items.forEach(it => {
                    if (it.productId) {
                        salesByProduct[it.productId] = (salesByProduct[it.productId] || 0) + (parseFloat(it.quantity) || 0);
                    }
                });
            }
        });

        const topSelling = Object.keys(salesByProduct)
            .map(pid => {
                const prod = this.getProduct(pid);
                return prod ? { product: prod, quantitySold: salesByProduct[pid], unit: prod.unit || 'unit' } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 5);

        // Slow moving products (very low or zero sales in 30 days despite having stock)
        const slowMoving = products
            .filter(p => (parseFloat(p.currentQuantity) || 0) > 0)
            .map(p => {
                const sold = salesByProduct[p.id] || 0;
                return { product: p, quantitySold: sold, currentStock: p.currentQuantity, unit: p.unit || 'unit' };
            })
            .filter(item => item.quantitySold <= 2)
            .slice(0, 5);

        return {
            totalProducts: products.length,
            needingReorder: needingReorderCount + lowStockCount,
            outOfStock: outOfStockCount,
            lowStock: lowStockCount,
            lessThan7Days: lessThan7DaysCount,
            topSelling,
            slowMoving,
            analyzedProducts
        };
    },

    /**
     * Record a Purchase Batch and compute Weighted Average Cost
     */
    addProductPurchaseBatch(productId, { purchasePrice, quantity, date, supplier, notes }) {
        const product = this.getProduct(productId);
        if (!product) return null;

        const qty = Math.max(0, parseFloat(quantity) || 0);
        const rate = Math.max(0, parseFloat(purchasePrice) || 0);
        const batchDate = date ? new Date(date).toISOString() : new Date().toISOString();

        const batch = {
            id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: batchDate,
            quantity: qty,
            purchasePrice: rate,
            supplier: supplier || product.supplier || '',
            notes: notes || 'Stock Inward Batch'
        };

        product.purchaseBatches = product.purchaseBatches || [];
        product.purchaseBatches.push(batch);

        // Calculate weighted average cost across purchase batches
        let totalVal = 0;
        let totalQ = 0;
        product.purchaseBatches.forEach(b => {
            const bQ = parseFloat(b.quantity) || 0;
            const bP = parseFloat(b.purchasePrice) || 0;
            totalVal += bQ * bP;
            totalQ += bQ;
        });

        const weightedAvgCost = totalQ > 0 ? Math.round((totalVal / totalQ) * 100) / 100 : rate;
        product.weightedAverageCost = weightedAvgCost;
        product.purchaseRate = rate; // keep latest purchase rate

        // Track price history point
        product.priceHistory = product.priceHistory || [];
        product.priceHistory.push({
            date: batchDate,
            purchasePrice: rate,
            sellingPrice: product.sellingRate,
            marketReference: product.marketReferencePrice || null
        });

        const newQty = (parseFloat(product.currentQuantity) || 0) + qty;
        product.currentQuantity = newQty;

        this.updateProduct(product.id, {
            currentQuantity: newQty,
            purchaseRate: rate,
            weightedAverageCost: weightedAvgCost,
            purchaseBatches: product.purchaseBatches,
            priceHistory: product.priceHistory,
            adjustmentNote: `+ ${qty} ${product.unit || 'units'} from ${supplier || 'Supplier'} @ ${rate}`
        });

        return { product, batch, weightedAvgCost };
    },

    /**
     * Record Product Price Snapshot (for purchase/selling/market comparison tracking)
     */
    recordProductPriceHistory(productId, { purchasePrice, sellingPrice, marketReference, date }) {
        const product = this.getProduct(productId);
        if (!product) return false;

        product.priceHistory = product.priceHistory || [];
        product.priceHistory.push({
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : product.purchaseRate,
            sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : product.sellingRate,
            marketReference: marketReference !== undefined ? parseFloat(marketReference) : (product.marketReferencePrice || null)
        });

        if (product.priceHistory.length > 50) {
            product.priceHistory = product.priceHistory.slice(-50);
        }

        return this.updateProduct(product.id, { priceHistory: product.priceHistory });
    },

    // --- DATA IMPORT/EXPORT ---
    exportData() {
        const backup = {
            customers: this.getCustomers(),
            products: this.getProducts(),
            sales: this.getSales(),
            payments: this.getPayments(),
            notifications: this.getNotifications(),
            settings: this.getSettings()
        };
        return JSON.stringify(backup, null, 2);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.customers) this._set(KEYS.CUSTOMERS, data.customers);
            if (data.products) this._set(KEYS.PRODUCTS, data.products);
            if (data.sales) this._set(KEYS.SALES, data.sales);
            if (data.payments) this._set(KEYS.PAYMENTS, data.payments);
            if (data.notifications) this._set(KEYS.NOTIFICATIONS, data.notifications);
            if (data.settings) this._set(KEYS.SETTINGS, data.settings);

            // Re-run status checks
            this.runStockCheckAndNotify();
            return true;
        } catch (e) {
            console.error("Failed to parse import JSON:", e);
            return false;
        }
    }
};

// Check if app has any storage, if empty, auto-load demo data so user doesn't see a blank app
if (Storage.getCustomers().length === 0 && Storage.getProducts().length === 0) {
    Storage.loadDemoData();
}

if (typeof window !== 'undefined') {
    window.Storage = Storage;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
