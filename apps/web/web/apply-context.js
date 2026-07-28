import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import if missing and we need to inject useGlobal
  if (!content.includes('useGlobal')) {
    content = content.replace(/(import React.*?;\n)/, '$1import { useGlobal } from "../context/GlobalContext";\n');
  }

  // Inject useGlobal hook inside the component
  if (!content.includes('const { toggleTheme, cartCount } = useGlobal();')) {
    content = content.replace(/(export default function [a-zA-Z]+\(\) \{)/, '$1\n  const { toggleTheme, cartCount } = useGlobal();');
    changed = true;
  }

  // Replace theme toggle
  content = content.replace(/<button className="lm-theme-toggle" [^>]*onClick=\{[^}]*\}[^>]*>/g, '<button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema">');
  
  // Replace cart badge
  content = content.replace(/<span className="cart-badge"[^>]*>0<\/span>/g, '<span className="cart-badge">{cartCount}</span>');

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Applied GlobalContext to ${file}`);
  }
}
