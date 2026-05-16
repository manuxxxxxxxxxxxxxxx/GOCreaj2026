export default function Placeholder() {
  const { toggleTheme, cartCount } = useGlobal();
  return (
    <div style={{ padding: '100px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Página en Construcción</h1>
      <p>Esta página está en proceso de pasarse a React.</p>
      <button 
        style={{ marginTop: '20px', padding: '10px 20px', background: '#4f6ef7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        onClick={() => window.history.back()}
      >
        Volver Atrás
      </button>
    </div>
  );
}
