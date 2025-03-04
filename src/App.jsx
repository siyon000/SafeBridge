import React from 'react';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import SenderView from './views/SenderView';
import ReceiverView from './views/ReceiverView';
import { ConnectionProvider, useConnection } from './context/ConnectionContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Main content component that uses the connection context
const MainContent = () => {
  const { isReceiver, connectionStatus } = useConnection();

  return (
    <div className="min-h-screen">
      <Header connectionStatus={connectionStatus} />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <ConnectionStatus />
        {isReceiver ? <ReceiverView /> : <SenderView />}
      </main>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

// App component that provides the connection context
function App() {
  return (
    <ConnectionProvider>
      <MainContent />
    </ConnectionProvider>
  );
}

export default App;