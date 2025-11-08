'use client';

import { useState } from 'react';
import ImportHistory from '@/components/ImportHistory';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function Home() {
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleTriggerImport = async () => {
    try {
      setTriggering(true);
      setMessage(null);
      const response = await axios.post(`${API_URL}/import/trigger`);
      setMessage('Import triggered successfully! Processing jobs...');
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to trigger import');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'normal', color: '#000000', margin: 0 }}>
          Job Import History
        </h1>
        <button
          onClick={handleTriggerImport}
          disabled={triggering}
          style={{
            padding: '8px 16px',
            fontSize: '11px',
            border: '1px solid #000000',
            backgroundColor: triggering ? '#f5f5f5' : '#ffffff',
            color: triggering ? '#999999' : '#000000',
            cursor: triggering ? 'not-allowed' : 'pointer',
          }}
        >
          {triggering ? 'Triggering...' : 'Trigger Import'}
        </button>
      </div>
      {message && (
        <div
          style={{
            padding: '8px 16px',
            marginBottom: '20px',
            fontSize: '11px',
            backgroundColor: message.includes('successfully') ? '#e8f5e9' : '#ffebee',
            color: message.includes('successfully') ? '#2e7d32' : '#c62828',
            border: `1px solid ${message.includes('successfully') ? '#4caf50' : '#ef5350'}`,
          }}
        >
          {message}
        </div>
      )}
      <ImportHistory />
    </main>
  );
}

