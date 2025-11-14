'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import ImportHistory, { ImportHistoryHandle } from '@/components/ImportHistory';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function Home() {
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasImports, setHasImports] = useState(false);
  const [importTriggered, setImportTriggered] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const historyRef = useRef<ImportHistoryHandle | null>(null);

  const messageIntent = useMemo(() => {
    if (!message) {
      return 'info';
    }
    return message.toLowerCase().includes('success') ? 'success' : 'error';
  }, [message]);

  const checkForImports = async () => {
    try {
      const response = await axios.get(`${API_URL}/history`, {
        params: { page: 1, limit: 1 },
      });
      setHasImports(response.data.data && response.data.data.length > 0);
    } catch (error) {
      // Swallow error; UI already surfaces failures when fetching the table
    }
  };

  useEffect(() => {
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

  const handleHistoryChange = (hasData: boolean) => {
    setHasImports(hasData);
    if (!hasData) {
      setImportTriggered(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="page-header__title">
          <span className="eyebrow">Operations</span>
          <h1>Job Import History</h1>
          <p>Monitor every feed run, trigger new imports, and keep stakeholders updated.</p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleTriggerImport}
            disabled={triggering}
            className="button button--primary"
          >
            {triggering ? 'Triggering…' : 'Trigger Import'}
          </button>
          {hasImports && (
            <button
              onClick={async () => {
                if (!historyRef.current) return;
                setDeletingAll(true);
                await historyRef.current.deleteAll();
                setDeletingAll(false);
              }}
              disabled={deletingAll}
              className="button button--danger"
            >
              {deletingAll ? 'Deleting…' : 'Delete All'}
            </button>
          )}
        </div>
      </header>

      {message && (
        <div className={`alert ${messageIntent === 'success' ? 'alert--success' : 'alert--error'}`}>
          {message}
        </div>
      )}

      {hasImports || importTriggered ? (
        <ImportHistory ref={historyRef} onHistoryChange={handleHistoryChange} />
      ) : (
        <section className="card">
          <div className="empty-state">
            <h3>No import history yet</h3>
            <p>Kick off the first import to see live processing stats in this dashboard.</p>
            <button
              onClick={handleTriggerImport}
              disabled={triggering}
              className="button button--ghost"
            >
              {triggering ? 'Triggering…' : 'Start Import'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

