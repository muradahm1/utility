const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const relHrefs = [...content.matchAll(/href=["'](css\/|js\/|favicon\.png)[^"']*["']/g)].map(m => m[0]);
  const relSrcs = [...content.matchAll(/src=["'](css\/|js\/|favicon\.png)[^"']*["']/g)].map(m => m[0]);
  if (relHrefs.length || relSrcs.length) {
    console.log(f, 'has relative assets:', [...relHrefs, ...relSrcs]);
  }
});
