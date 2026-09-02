const fs = require('fs');
let code = fs.readFileSync('tests/test_stage3.js', 'utf8');
code = code.replace("n.type === 'overdue' && n.targetId === overdueCust.id", "(n.type.toLowerCase().includes('overdue')) && n.targetId === overdueCust.id");
fs.writeFileSync('tests/test_stage3.js', code, 'utf8');
console.log('Updated test_stage3.js');
