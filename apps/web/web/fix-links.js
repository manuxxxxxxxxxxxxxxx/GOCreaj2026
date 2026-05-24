import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace links to index.html with navigate('/')
  if (content.includes('href="../html/index.html"')) {
    content = content.replace(/<a href="\.\.\/html\/index\.html"/g, '<a onClick={() => navigate(\'/\')} style={{cursor:\'pointer\'}}');
    changed = true;
  }
  if (content.includes('href="index.html"')) {
    content = content.replace(/<a href="index\.html"/g, '<a onClick={() => navigate(\'/\')} style={{cursor:\'pointer\'}}');
    changed = true;
  }
  
  // Patch specific buttons in Perfil
  if (file === 'Perfil.tsx') {
    content = content.replace(/id="logout-btn" style=\{([^}]*)\}/, 'id="logout-btn" style={$1} onClick={() => navigate(\'/login\')}');
    content = content.replace(/<div className="role-card" data-role="buyer">/, '<div className="role-card active" data-role="buyer" onClick={() => navigate(\'/market\')}>');
    content = content.replace(/<div className="role-card" data-role="seller">/, '<div className="role-card" data-role="seller" onClick={() => navigate(\'/dashboard-vendedor\')}>');
    content = content.replace(/<div className="role-card" data-role="driver">/, '<div className="role-card" data-role="driver" onClick={() => navigate(\'/dashboard-repartidor\')}>');
    changed = true;
  }

  // Patch Vendedor Dashboard
  if (file === 'VendedorDashboard.tsx') {
    content = content.replace(/<a href="\.\.\/html\/index\.html"/g, '<a onClick={() => navigate(\'/\')} style={{cursor:\'pointer\'}}');
    content = content.replace(/<div className="nav-item"\s*>[\s\S]*?Tienda[\s\S]*?<\/div>/, '<div className="nav-item" onClick={() => navigate(\'/market\')}>Tienda</div>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched links in ${file}`);
  }
}
