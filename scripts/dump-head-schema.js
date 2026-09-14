const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '../backend/prisma/schema.head.prisma');
const buf = execFileSync('git', ['show', 'HEAD:backend/prisma/schema.prisma']);
fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length);
