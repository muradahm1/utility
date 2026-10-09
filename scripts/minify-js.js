const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function minifyJs(code) {
  // Safe JS minification: preserve string literals while stripping comments and excess whitespace
  let inString = false;
  let stringChar = '';
  let inRegex = false;
  let inBlockComment = false;
  let inLineComment = false;
  let result = '';
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || '';
    const prevChar = code[i - 1] || '';
    
    // Check line comment
    if (!inString && !inBlockComment && !inLineComment && char === '/' && nextChar === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (inLineComment && (char === '\n' || char === '\r')) {
      inLineComment = false;
      result += '\n';
      continue;
    }
    if (inLineComment) continue;
    
    // Check block comment
    if (!inString && !inBlockComment && !inLineComment && char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++;
      continue;
    }
    if (inBlockComment) continue;
    
    // Check string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      result += char;
      continue;
    }
    if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = '';
      result += char;
      continue;
    }
    if (inString) {
      result += char;
      continue;
    }
    
    // Outside strings and comments: collapse multi spaces/tabs
    if (char === ' ' || char === '\t') {
      if (result.length > 0 && !/[\s\{\}\(\)\[\]\;\:\,\=\+\-\*\/\!\<\>\&\|\?]/.test(result[result.length - 1])) {
        if (!/[\s\{\}\(\)\[\]\;\:\,\=\+\-\*\/\!\<\>\&\|\?]/.test(nextChar)) {
          result += ' ';
        }
      }
      continue;
    }
    
    if (char === '\n' || char === '\r') {
      if (result.length > 0 && !/[\n\r]/.test(result[result.length - 1])) {
        result += '\n';
      }
      continue;
    }
    
    result += char;
  }
  
  return result.trim();
}

const filesToMinify = ['tools.js', 'app.js'];

filesToMinify.forEach(file => {
  const srcPath = path.join(rootDir, 'js', file);
  const minPath = path.join(rootDir, 'js', file.replace('.js', '.min.js'));
  
  if (fs.existsSync(srcPath)) {
    const src = fs.readFileSync(srcPath, 'utf8');
    const min = minifyJs(src);
    fs.writeFileSync(minPath, min, 'utf8');
    
    const origSize = (Buffer.byteLength(src, 'utf8') / 1024).toFixed(2);
    const minSize = (Buffer.byteLength(min, 'utf8') / 1024).toFixed(2);
    const savings = (((1 - minSize / origSize)) * 100).toFixed(1);
    console.log(`✓ Minified js/${file}: ${origSize} KB -> ${minSize} KB (${savings}% savings)`);
  }
});
