import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('Error de render capturado por ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: 24, textAlign: 'center', gap: 12, fontFamily: 'inherit',
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ margin: 0 }}>Algo salió mal</h2>
          <p style={{ color: '#64748B', maxWidth: 420 }}>
            Ocurrió un error al mostrar esta sección. Intenta recargar la página.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { this.setState({ error: null }); window.location.assign('/'); }}
              style={{
                padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E2DCEF', cursor: 'pointer',
                background: 'transparent', color: 'inherit', fontWeight: 700,
              }}
            >
              ← Volver al inicio
            </button>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#F59E0B', color: '#fff', fontWeight: 700,
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
