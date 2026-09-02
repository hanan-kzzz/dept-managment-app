# Grocery Shop Management Web App (GroceryApp)

Welcome! This documentation serves as a comprehensive onboarding guide for **AI agents** and developers joining this project. It outlines the purpose of the application, how it helps society, its architecture, file layout, data schemas, and key instructions for developing or refactoring the system.

---

## 🌟 What is this Project?

**Grocery Shop Management Web App** (short name: **GroceryApp**) is a lightweight, mobile-first **Progressive Web Application (PWA)** designed for small, local grocery stores, corner shops, and micro-retailers (such as traditional "kirana" shops). It enables them to transition from paper registers to a digital ledger to manage:
1. **Sales Transactions** (billing, payment methods, and walk-in/identified orders).
2. **Customer Credit & Debts (Dues)** (historically managed using manual books, often called "khata books" in South Asia).
3. **Stock & Inventory** (purchase rates, selling rates, current stock levels, and minimum stock reminders).
4. **Automated In-App Notifications** (alerts for low/out-of-stock items, debt thresholds, and payments).

The application operates **entirely client-side**, using the browser's `localStorage` as its local database. Thanks to a Progressive Web App setup with a Service Worker, the application works completely offline, loading instantly even with zero network connectivity.

---

## 🌍 How this Helps Society (Social & Economic Impact)

Small micro-merchants (mom-and-pop shops, market vendors, and neighborhood grocers) form the economic backbone of communities worldwide. However, they face significant operational challenges. Here is how **GroceryApp** directly solves these issues and benefits society:

### 1. Financial Inclusion & Modernization of Micro-Businesses
Many small vendors still use paper ledgers to keep track of customers who buy goods on credit. These paper books are prone to damage, loss, theft, and math errors. Digitizing this process protects their financial records and saves hours of manual calculations.

### 2. Improving Cash Flow and Reducing Bad Debts
By providing a clear, filterable ledger of **Outstanding Dues**, the app allows shopkeepers to monitor credit limits, track payment histories, and collect outstanding balances on time. This stabilizes their cash flow, preventing business failures caused by uncollected debts.

### 3. Offline Resilience in Infrastructure-Challenged Areas
In developing regions, internet access can be unstable, slow, or expensive. Since the app is built as a PWA, it behaves like a native application and does not require an active internet connection. Shop owners can execute transactions, add stock, and log dues under any network conditions.

### 4. Zero Operational Cost
Unlike cloud-based point-of-sale (POS) systems that require recurring subscription fees, hosting servers, or licensing, this app runs entirely on the shopkeeper's phone or tablet browser via local storage. This eliminates monthly operating expenses for the merchant.

### 5. Preventative Inventory Stockouts
The low-stock alerts notify shopkeepers before essential goods run out, ensuring they do not lose sales opportunities and can optimize their purchasing cycles.

---

## 📁 Codebase Directory Structure

```text
├── index.html                  # Dashboard & system overview
├── customers.html              # Customer management directory page
├── customer-details.html       # Customer profile, ledger statement, and manual payments
├── stock.html                  # Inventory registry & restock alerts
├── product-details.html        # Detailed product data and historical stock adjustments
├── sales.html                  # POS-style checkout, billing, and dues generation page
├── dues.html                   # List of customers with unpaid dues and pending balances
├── notifications.html          # Panel for system alerts (low stock, dues reminders, etc.)
├── settings.html               # Shop profile configuration, system controls, and backups
├── service-worker.js           # PWA service worker for asset caching and offline fallback
├── manifest.json               # PWA configuration (homescreen install, theme colors)
│
├── css/                        # Responsive stylesheet assets
│   ├── style.css               # Main visual template (light mode, teal accents)
│   ├── dashboard.css           # Grid and metric styles for index.html
│   ├── customers.css           # Layouts for customer profiles and transactions
│   ├── stock.css               # Inventory sheets and level indicators
│   └── responsive.css          # Mobile-first adaptive layout configurations
│
└── js/                         # JavaScript module layer
    ├── app.js                  # Main entry point and dashboard logic
    ├── storage.js              # Database abstraction layer (handles LocalStorage CRUD)
    ├── utils.js                # Common utility functions, form validation, and toast UI
    ├── customers.js            # Customer addition, update, and search workflows
    ├── dues.js                 # Ledger filters and payment settlement controllers
    ├── sales.js                # Checkout cart, barcode search, and sales logging
    ├── stock.js                # Inventory tracking, additions, and history logs
    ├── notifications.js        # Notification engine and Telegram service hook interface
    └── settings.js             # Shop configuration and data backup workflows
```

---

## 💾 Data Architecture & JSON Schemas

The data is saved in `localStorage` under specific keys. For AI agents writing code that reads/writes data, it is **imperative** to adhere to the following schemas to avoid corruption.

### 1. Settings (`grocery_settings`)
Contains configuration parameters for the shop's profile and functional features.
```json
{
  "shopName": "My Grocery Shop",
  "shopPhone": "+91 98765 43210",
  "shopAddress": "123 Main Street, Market Area",
  "currency": "₹",
  "defaultUnit": "Piece",
  "lowStockAlerts": true,
  "dueReminders": true,
  "notificationsEnabled": true,
  "theme": "light",
  "telegramEnabled": false,
  "telegramToken": "",
  "telegramChatId": ""
}
```

### 2. Customers (`grocery_customers`)
Stores customer details and their entire credit/payment transaction history.
```json
[
  {
    "id": "cust_1714567890123_abcde",
    "name": "Arun Kumar",
    "phone": "+91 98765 00001",
    "address": "Building A, Ground Floor",
    "openingDue": 1500.00,
    "currentDue": 1500.00,
    "creditLimit": 5000.00,
    "notes": "Regular customer. Prefers evening delivery.",
    "status": "Active",
    "createdDate": "2026-08-31T12:00:00.000Z",
    "transactions": [
      {
        "id": "tx_opening_1714567890123",
        "date": "2026-08-31T12:00:00.000Z",
        "type": "Purchase",
        "amount": 1500.00,
        "note": "Opening Due balance",
        "currentDue": 1500.00
      }
    ]
  }
]
```
> [!NOTE]
> * **Transaction `type`** must be either `"Purchase"` (increases due balance) or `"Payment"` (reduces due balance).
> * Keep `currentDue` calculated inline with transaction records to ensure quick list reading.

### 3. Products/Stock (`grocery_products`)
Represents items available in the shop, their rates, stock quantities, and history logs.
```json
[
  {
    "id": "prod_1714567895555_fghij",
    "productName": "Basmati Rice Premium",
    "category": "Grains & Rice",
    "brand": "India Gate",
    "sku": "BG-RICE-5K",
    "barcode": "8901234567890",
    "purchaseRate": 80.00,
    "sellingRate": 110.00,
    "currentQuantity": 25.0,
    "minimumStockLevel": 10.0,
    "unit": "Kilogram",
    "supplier": "Kalyan Distributors",
    "expiryDate": "2027-08-31",
    "createdDate": "2026-08-31T12:05:00.000Z",
    "updatedDate": "2026-08-31T12:10:00.000Z",
    "stockHistory": [
      {
        "id": "st_init_1714567895555",
        "date": "2026-08-31T12:05:00.000Z",
        "type": "Stock In",
        "quantity": 25.0,
        "note": "Initial Stock setup",
        "newQuantity": 25.0
      }
    ]
  }
]
```

### 4. Sales Records (`grocery_sales`)
Standard order logs generated during point-of-sale checkout.
```json
[
  {
    "id": "sale_1714567899999_xyz12",
    "date": "2026-08-31T12:15:30.000Z",
    "customerId": "cust_1714567890123_abcde",
    "customerName": "Arun Kumar",
    "items": [
      {
        "productId": "prod_1714567895555_fghij",
        "productName": "Basmati Rice Premium",
        "quantity": 2.0,
        "sellingRate": 110.00,
        "total": 220.00
      }
    ],
    "total": 220.00,
    "paymentAmount": 100.00,
    "dueAmount": 120.00,
    "paymentMethod": "UPI",
    "status": "Partial"
  }
]
```

### 5. Notifications (`grocery_notifications`)
In-app warnings and confirmation alerts.
```json
[
  {
    "id": "notif_1714567900000_notif",
    "type": "low_stock",
    "title": "⚠️ Low Stock Alert",
    "message": "⚠️ LOW STOCK ALERT: \"Refined Cooking Oil\" has only 4.5 Liter(s) remaining.",
    "targetId": "prod_1714567895556_oil",
    "read": false,
    "date": "2026-08-31T12:20:00.000Z"
  }
]
```

---

## ⚙️ Development Guidelines for AI Agents

When writing new features, modifying code, or performing refactors, you must follow these design choices:

### 1. Client-Side Decoupling & Modular Architecture
Each HTML page triggers its logic based on the `data-page` attribute on the `<body>` element.
* Example from [app.js](file:///c:/Users/hanan/Documents/debt%20management/js/app.js#L5-L10):
  ```javascript
  document.addEventListener('DOMContentLoaded', () => {
      if (document.body.dataset.page !== 'home') return;
      initDashboard();
  });
  ```
Always declare the corresponding `data-page` value in the target HTML file, and wrap your page initialization inside a similar check.

### 2. Standard Storage Operations
Never interact with `localStorage` directly inside page files. Always invoke methods of the `Storage` object defined in [storage.js](file:///c:/Users/hanan/Documents/debt%20management/js/storage.js). This ensures that if we substitute local storage with a cloud database (e.g., Firebase, SQLite, or an API backend) in a future stage, page controllers remain completely unaffected.

### 3. Maintain PWA Caching
If you add new `.html`, `.js`, or `.css` assets to the repository, you **MUST** update the `ASSETS_TO_CACHE` array in [service-worker.js](file:///c:/Users/hanan/Documents/debt%20management/service-worker.js#L1-L32) and increment the cache version string (`CACHE_NAME`) to prevent local devices from using stale files.

### 4. Code Formatting & Clean Styling
* Keep CSS clean, relying on variables defined in [style.css](file:///c:/Users/hanan/Documents/debt%20management/css/style.css) (default light-mode UI, teal green `#10b981` accents).
* Use the Toast utility `Utils.showToast(message, type)` inside [utils.js](file:///c:/Users/hanan/Documents/debt%20management/js/utils.js) to display status updates.

### 5. Seeding Demo Data
To reset data and populate standard customer/product accounts for testing, navigate to settings, or call:
```javascript
Storage.loadDemoData(); // Clears all local records and adds 3 demo customers, 3 demo products, and 3 demo transactions.
```

---

## 🚀 Future Enhancements (Roadmap)

If you are asked to implement new modules, look to these upcoming milestones:
* **Telegram/WhatsApp Alert Delivery**: Connect the pipeline placeholder `_sendTelegramAlert` in [notifications.js](file:///c:/Users/hanan/Documents/debt%20management/js/notifications.js) to actual webhook endpoints.
* **Barcode Scanning via Mobile Camera**: Implement `QuaggaJS` or `Html5Qrcode` integrations inside the sales/stock screens.
* **Sync & Cloud Backup**: Add optional OAuth integration or database API connector to push `localStorage` states to a secure backup server.
* **PDF Bill & Receipt Exports**: Add direct print CSS rules or client-side PDF rendering to generate receipt slips.
