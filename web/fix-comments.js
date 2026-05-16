import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Convert HTML comments <!-- --> to JSX comments {/* */}
  content = content.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed comments in ${file}`);
}
