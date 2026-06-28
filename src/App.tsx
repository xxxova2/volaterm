import { Toaster } from 'sonner';
import { TerminalLayout } from './components/layout/TerminalLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <TerminalLayout />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'font-mono text-sm',
          style: { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' },
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
