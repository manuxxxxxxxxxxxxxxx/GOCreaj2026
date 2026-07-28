import fs from 'fs';
import path from 'path';

const htmlDir = path.join(process.cwd(), 'html');
const pagesDir = path.join(process.cwd(), 'src', 'pages');

const filesToConvert = [
  { file: 'Chat.html', component: 'Chat', css: 'Chat.css' },
  { file: 'Entregas.html', component: 'Entregas', css: 'entregas.css' },
  { file: 'Reels.html', component: 'Reels', css: 'Reels.css' },
  { file: 'historial.html', component: 'Historial', css: 'historial.css' },
  { file: 'dashboard-vendedor.html', component: 'VendedorDashboard', css: 'index.css' },
  { file: 'dashboard-repartidor.html', component: 'RepartidorDashboard', css: 'index.css' },
  { file: '404.html', component: 'NotFound', css: 'index.css' }
];

function convertHtmlToJsx(html) {
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  // Remove script tags
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Convert class to className
  content = content.replace(/class="/g, 'className="');
  
  // Convert for to htmlFor
  content = content.replace(/for="/g, 'htmlFor="');

  // Convert inline styles like style="padding-top:0" to style={{ paddingTop: 0 }}
  content = content.replace(/style="([^"]*)"/g, (match, p1) => {
    const rules = p1.split(';').filter(r => r.trim());
    const reactStyle = rules.map(rule => {
      let [key, val] = rule.split(':');
      if (!key || !val) return '';
      key = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      val = val.trim();
      return `${key}: '${val}'`;
    }).filter(Boolean).join(', ');
    return `style={{ ${reactStyle} }}`;
  });

  // Self-close tags
  const tagsToClose = ['img', 'input', 'br', 'hr', 'source', 'link', 'meta'];
  tagsToClose.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b([^>]*?)(?<!/)>`, 'gi');
    content = content.replace(regex, `<${tag}$1 />`);
  });

  // Replace onclick with dummy or remove
  content = content.replace(/onclick="([^"]*)"/gi, (match, p1) => {
    if (p1.includes('location.href')) {
      const urlMatch = p1.match(/'([^']+)'/);
      const url = urlMatch ? urlMatch[1].replace('.html', '') : '#';
      return `onClick={() => navigate('/${url}')}`;
    }
    if (p1.includes('lmToggleTheme()')) {
      return `onClick={() => {}}`;
    }
    return `onClick={() => console.log('clicked')}`;
  });

  return content.trim();
}

for (const { file, component, css } of filesToConvert) {
  const htmlPath = path.join(htmlDir, file);
  if (!fs.existsSync(htmlPath)) continue;

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const jsxContent = convertHtmlToJsx(htmlContent);

  const tsxCode = `import React from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport '../../css/${css}';\nimport '../../css/dark.css';\n\nexport default function ${component}() {\n  const navigate = useNavigate();\n\n  return (\n    <>\n      ${jsxContent}\n    </>\n  );\n}\n`;

  fs.writeFileSync(path.join(pagesDir, `${component}.tsx`), tsxCode, 'utf8');
  console.log(`Converted ${file} to ${component}.tsx`);
}
