/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#F4F4F0',
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: '#1A1A1A',
          direction: 'rtl',
          textAlign: 'right'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#fff',
            border: '4px solid #1A1A1A',
            boxShadow: '8px 8px 0px 0px #1A1A1A',
            padding: '24px'
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#E94B35',
              color: '#fff',
              padding: '4px 12px',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}>
              تنبيه فني
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>
              حدث خطأ أثناء تحميل واجهة الاستوديو
            </h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
              تم رصد مشكلة برمجية أثناء عرض الصفحة. يمكنك إعادة التحميل أو فحص تفاصيل الخطأ:
            </p>
            <pre style={{
              direction: 'ltr',
              textAlign: 'left',
              backgroundColor: '#f5f5f5',
              padding: '12px',
              border: '2px solid #ddd',
              fontSize: '11px',
              overflowX: 'auto',
              marginBottom: '16px'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => {
                localStorage.removeItem('synergy_custom_presets_corrupted');
                window.location.reload();
              }}
              style={{
                backgroundColor: '#2A6DB5',
                color: '#fff',
                border: '3px solid #1A1A1A',
                padding: '10px 20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🔄 إعادة تحميل الواجهة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
