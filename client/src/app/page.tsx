'use client';

import { useState, useEffect } from 'react';
import ImportHistory from '@/components/ImportHistory';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function Home() {
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasImports, setHasImports] = useState(false);
  const [importTriggered, setImportTriggered] = useState(false);

  // Check if there are any imports in the database (optimized - only fetch 1 item)
  const checkForImports = async () => {
    const checkStartTime = performance.now();
    try {
      const response = await axios.get(`${API_URL}/history`, {
        params: { page: 1, limit: 1 },
      });
      setHasImports(response.data.data && response.data.data.length > 0);
      const checkEndTime = performance.now();
    } catch (error) {
    }
  };

  useEffect(() => {
    // Check on initial load if there are any imports
    checkForImports();
  }, []);

  const handleTriggerImport = async () => {
    try {
      setTriggering(true);
      setMessage(null);
      const response = await axios.post(`${API_URL}/import/trigger`);
      const serverMessage = response.data?.message || 'Import triggered';
      setMessage(serverMessage);

      if (response.data?.started) {
        setImportTriggered(true);
        setHasImports(true);
        setTimeout(async () => {
          await checkForImports();
          setMessage(null);
        }, 2000);
      } else {
        setImportTriggered(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to trigger import');
      setImportTriggered(false);
    } finally {
      setTriggering(false);
    }
  };

  // Callback from ImportHistory when data is deleted
  const handleHistoryChange = (hasData: boolean) => {
    setHasImports(hasData);
    if (!hasData) {
      setImportTriggered(false);
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
      {hasImports || importTriggered ? (
        <ImportHistory onHistoryChange={handleHistoryChange} />
      ) : (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#666666',
            border: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}
        >
          No import history found. Click "Trigger Import" to start importing jobs.
        </div>
      )}
    </main>
  );
}

