// Mock browser localStorage
const storageStore = {};
global.localStorage = {
    getItem: (key) => storageStore[key] || null,
    setItem: (key, val) => { storageStore[key] = String(val); },
    removeItem: (key) => { delete storageStore[key]; },
    clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
};

const Storage = require('../js/storage.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log("==================================================");
console.log("RUNNING STAGE 3 CUSTOMER & CREDIT SYSTEM TESTS");
console.log("==================================================");

// 1. Initial State & Seed Data Test
Storage.resetApplication();
Storage.loadDemoData();

const customers = Storage.getCustomers();
const products = Storage.getProducts();
const sales = Storage.getSales();

console.log("\n[1] Demo Data & Seed Ledger Check:");
assert(customers.length >= 3, `Demo customers created (${customers.length} found)`);
assert(sales.length >= 3, `Demo sales created (${sales.length} found)`);

// 2. Customer Phone Lookup & Duplicate Detection
console.log("\n[2] Phone Lookup & Duplicate Protection:");
const arun = customers.find(c => c.name.includes('Arun'));
assert(arun !== null, "Found Arun Kumar demo customer");
const foundByPhone = Storage.getCustomerByPhone(arun.phone);
assert(foundByPhone && foundByPhone.id === arun.id, "Customer lookup by exact phone matches");
const foundCleanPhone = Storage.getCustomerByPhone("+91-98765-00001");
assert(foundCleanPhone && foundCleanPhone.id === arun.id, "Customer lookup by formatted phone string matches");
const excludedSelf = Storage.getCustomerByPhone(arun.phone, arun.id);
assert(excludedSelf === null, "ExcludeCustomerId properly ignores own record during profile edit");

// 3. Sequential Payment Numbering (PAY-000001)
console.log("\n[3] Sequential Payment Generation:");
const nextPay1 = Storage.peekNextPaymentNumber();
assert(nextPay1 === 'PAY-000001', `First peeked payment sequence is PAY-000001 (got ${nextPay1})`);

const payRecord1 = Storage.recordCustomerPayment(arun.id, 200, 'UPI', 'Advance Payment');
assert(payRecord1 && payRecord1.paymentNumber === 'PAY-000001', `First recorded payment got PAY-000001 (got ${payRecord1.paymentNumber})`);

const nextPay2 = Storage.peekNextPaymentNumber();
assert(nextPay2 === 'PAY-000002', `Next payment sequence incremented to PAY-000002 (got ${nextPay2})`);

const payRecord2 = Storage.recordCustomerPayment(arun.id, 100, 'Cash', 'Second installment');
assert(payRecord2 && payRecord2.paymentNumber === 'PAY-000002', `Second recorded payment got PAY-000002 (got ${payRecord2.paymentNumber})`);

// 4. Financials Calculation & Ledger Source of Truth
console.log("\n[4] Customer Financials & Due Calculation:");
const finArun = Storage.calculateCustomerFinancials(arun.id);
console.log(`    Arun Total Purchases: ₹${finArun.totalPurchases}, Total Paid: ₹${finArun.totalPaid}, Current Due: ₹${finArun.currentDue}`);
assert(finArun.totalPurchases >= 640, "Total purchases correctly summed");
assert(finArun.totalPaid >= 300, `Total paid sum includes both payments (₹${finArun.totalPaid})`);
const expectedArunDue = (arun.openingDue + 640) - 300;
assert(finArun.currentDue === expectedArunDue, `Current due strictly equals (openingDue + salesDue) minus payments (₹${finArun.currentDue} === ₹${expectedArunDue})`);

// 5. Overdue Detection
console.log("\n[5] Overdue Detection Logic:");
// Create an overdue credit sale for a new customer
const overdueCust = Storage.saveCustomer({
    name: 'Overdue Test Customer',
    phone: '9998887770',
    openingDue: 0
});

// Sale with due date 10 days ago
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 10);
Storage.saveSale({
    customerId: overdueCust.id,
    customerName: overdueCust.name,
    customerPhone: overdueCust.phone,
    date: pastDate.toISOString(),
    dueDate: pastDate.toISOString().split('T')[0],
    subtotal: 500,
    grandTotal: 500,
    paymentMethod: 'Credit/Due',
    amountPaid: 0,
    amountDue: 500
});

const finOverdue = Storage.calculateCustomerFinancials(overdueCust.id);
assert(finOverdue.isOverdue === true, "isOverdue is true for past due date");
assert(finOverdue.daysOverdue >= 9, `daysOverdue calculated correctly (got ${finOverdue.daysOverdue} days)`);
assert(finOverdue.status === 'OVERDUE', `Status badge is OVERDUE (got ${finOverdue.status})`);

// 6. Overdue Notification Trigger
console.log("\n[6] System Overdue Alert Trigger:");
Storage.runDueCheckAndNotify();
const notifs = Storage.getNotifications();
const overdueNotif = notifs.find(n => (n.type === 'overdue' || n.type === 'CUSTOMER_OVERDUE') && n.targetId === overdueCust.id);
assert(overdueNotif !== undefined, "System notification generated for overdue customer");

// 7. Full Settlement & NO DUE Status
console.log("\n[7] Full Settlement & NO DUE Badge:");
Storage.recordCustomerPayment(overdueCust.id, 500, 'UPI', 'Full settlement');
const finSettled = Storage.calculateCustomerFinancials(overdueCust.id);
assert(finSettled.currentDue === 0, "Current due balance is zero after full payment");
assert(finSettled.status === 'PAID', `Status badge updated to PAID (got ${finSettled.status})`);

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
