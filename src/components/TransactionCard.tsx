import React from 'react';
import { useWebSocket, TransactionData } from '../hooks/useWebsocket';

const TransactionCard: React.FC<{ transaction: TransactionData }> = ({ transaction }) => {
  const isBuy = transaction.purchase_type === 'Buy';
  
  return (
    <div className={`p-4 rounded-lg border-l-4 ${isBuy ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} mb-3`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              isBuy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {transaction.purchase_type}
            </span>
            <span className="text-sm text-gray-600">{transaction.dex_type}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-1 font-medium">{transaction.token_quantity.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-600">USD:</span>
              <span className="ml-1 font-medium">${transaction.usd?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            <div>Owner: {transaction.owner.slice(0, 8)}...{transaction.owner.slice(-8)}</div>
            <div>Time: {new Date(transaction.date).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectionStatus: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return { color: 'bg-green-500', text: '🟢 Connected', textColor: 'text-green-700' };
      case 'connecting':
        return { color: 'bg-yellow-500', text: '🟡 Connecting...', textColor: 'text-yellow-700' };
      case 'disconnected':
        return { color: 'bg-gray-500', text: '⚪ Disconnected', textColor: 'text-gray-700' };
      case 'error':
        return { color: 'bg-red-500', text: '🔴 Error', textColor: 'text-red-700' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown', textColor: 'text-gray-700' };
    }
  };

  const { color, text, textColor } = getStatusConfig(status);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className={`font-medium ${textColor}`}>{text}</span>
    </div>
  );
};

export const TransactionDashboard: React.FC = () => {
  const { transactions, connectionStatus, connect, disconnect, clearTransactions } = useWebSocket();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🚀 Raydium Transaction Tracker</h1>
          <ConnectionStatus status={connectionStatus} />
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={connect}
            disabled={connectionStatus === 'connected'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={connectionStatus === 'disconnected'}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
          <button
            onClick={clearTransactions}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Transactions
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{transactions.length}</div>
            <div className="text-sm text-blue-800">Total Transactions</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {transactions.filter(t => t.purchase_type === 'Buy').length}
            </div>
            <div className="text-sm text-green-800">Buy Orders</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {transactions.filter(t => t.purchase_type === 'Sell').length}
            </div>
            <div className="text-sm text-red-800">Sell Orders</div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Transactions {transactions.length > 0 && `(${transactions.length})`}
          </h2>
          
          {connectionStatus === 'disconnected' && transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">🔌</div>
              <p>Connect to start receiving real-time transaction data</p>
            </div>
          )}

          {connectionStatus === 'connected' && transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">⏳</div>
              <p>Listening for Raydium swap transactions...</p>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {transactions.map((transaction, index) => (
              <TransactionCard key={`${transaction.date}-${index}`} transaction={transaction} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};