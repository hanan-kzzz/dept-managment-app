<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=10b981&height=250&section=header&text=GroceryApp%20(Debt%20Management)&fontSize=50&animation=fadeIn&fontAlignY=35&desc=The%20Ultimate%20PWA%20for%20Local%20Retailers&descAlignY=55&descAlign=50" width="100%" />

  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=22&pause=1000&color=10b981&center=true&vCenter=true&width=600&lines=Manage+Sales+%26+Billing;Track+Customer+Credit+%26+Dues;Monitor+Stock+%26+Inventory;Works+Completely+Offline!" alt="Typing SVG" />
  
  <p>
    <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge&logo=github" alt="Status" />
    <img src="https://img.shields.io/badge/PWA-Ready-10b981?style=for-the-badge&logo=pwa" alt="PWA" />
    <img src="https://img.shields.io/badge/Database-LocalStorage-blue?style=for-the-badge&logo=javascript" alt="Database" />
  </p>
</div>

<br>

<div align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shopping%20Cart.png" alt="Shopping Cart" width="80" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20with%20Wings.png" alt="Money" width="80" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bar%20Chart.png" alt="Chart" width="80" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Mobile%20Phone.png" alt="Mobile" width="80" />
</div>

---

## 🌟 What is this Project?

**Grocery Shop Management Web App** (short name: **GroceryApp**) is a lightweight, mobile-first **Progressive Web Application (PWA)** designed for small, local grocery stores, corner shops, and micro-retailers (such as traditional "kirana" shops). It enables them to transition from paper registers to a digital ledger to manage:

1. 🛒 **Sales Transactions** (billing, payment methods, and walk-in/identified orders).
2. 📖 **Customer Credit & Debts (Dues)** (historically managed using manual books, often called "khata books").
3. 📦 **Stock & Inventory** (purchase rates, selling rates, current stock levels, and reminders).
4. 🔔 **Automated In-App Notifications** (alerts for low/out-of-stock items, debt thresholds, and payments).

The application operates **entirely client-side**, using the browser's `localStorage` as its local database. Thanks to a Progressive Web App setup with a Service Worker, the application works completely offline, loading instantly even with zero network connectivity.

---

## 🌍 Social & Economic Impact

<table align="center">
  <tr>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Ledger.png" width="50"/>
      <br><b>Financial Inclusion</b><br>
      Digitizes paper ledgers for micro-businesses, saving hours of manual calculations and preventing data loss.
    </td>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20Bag.png" width="50"/>
      <br><b>Improving Cash Flow</b><br>
      Provides a clear, filterable ledger of outstanding dues to collect balances on time and reduce bad debts.
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Globe%20Showing%20Asia-Australia.png" width="50"/>
      <br><b>Offline Resilience</b><br>
      Operates seamlessly in infrastructure-challenged areas with slow or zero internet access.
    </td>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Package.png" width="50"/>
      <br><b>Preventative Stockouts</b><br>
      Automated low-stock alerts notify shopkeepers before essential goods run out.
    </td>
  </tr>
</table>

---

## 🚀 Future Enhancements (Roadmap)

<p align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" alt="Rocket" width="100"/>
</p>

* 💬 **Telegram/WhatsApp Alerts**: Automatic webhook integrations.
* 📷 **Barcode Scanning**: Mobile camera integration for quick checkout.
* ☁️ **Sync & Cloud Backup**: Optional OAuth cloud backups to secure servers.
* 📄 **PDF Bill & Receipt Exports**: Direct receipt generation for customers.

---

<details>
<summary><b>👨‍💻 Developer Documentation & AI Agent Guidelines</b> (Click to expand)</summary>

### Codebase Directory Structure
```text
├── index.html                  # Dashboard & system overview
├── customers.html              # Customer management directory page
├── customer-details.html       # Customer profile, ledger statement
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
└── js/                         # JavaScript module layer
    ├── app.js                  # Main entry point and dashboard logic
    ├── storage.js              # Database abstraction layer (handles LocalStorage CRUD)
    └── utils.js                # Common utility functions, form validation, and toast UI
```

### Data Architecture & JSON Schemas
* **`grocery_settings`**: Configuration parameters for the shop's profile and functional features.
* **`grocery_customers`**: Stores customer details and their entire credit/payment transaction history.
* **`grocery_products`**: Represents items available in the shop, their rates, stock quantities, and history logs.
* **`grocery_sales`**: Standard order logs generated during point-of-sale checkout.
* **`grocery_notifications`**: In-app warnings and confirmation alerts.

### Development Guidelines
1. **Client-Side Decoupling:** Each HTML page triggers its logic based on the `data-page` attribute on the `<body>` element.
2. **Standard Storage Operations:** Never interact with `localStorage` directly inside page files. Always invoke methods of the `Storage` object defined in `storage.js`.
3. **Maintain PWA Caching:** If you add new assets, update the `ASSETS_TO_CACHE` array in `service-worker.js`.
4. **Code Formatting:** Keep CSS clean, relying on variables defined in `style.css` (teal green `#10b981` accents).

</details>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=10b981&height=100&section=footer" width="100%" />
</div>
