'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface ImportLog {
  _id: string;
  fileName: string;
  sourceUrl: string;
  timestamp: string;
  total: number;
  new: number;
  updated: number;
  failed: number;
  failedReasons: Array<{
    jobId?: string;
    reason: string;
    error?: string;
  }>;
  status: 'completed' | 'failed' | 'processing';
  processingTime?: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ImportHistory() {
  const [history, setHistory] = useState<ImportLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/history`, {
        params: { page, limit: 50 },
      });
      setHistory(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentPage);
    const interval = setInterval(() => {
      fetchHistory(currentPage);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#000000';
      case 'failed':
        return '#ff0000';
      case 'processing':
        return '#0066cc';
      default:
        return '#000000';
    }
  };

  if (loading && history.length === 0) {
    return <div style={{ padding: '20px', fontSize: '11px' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', fontSize: '11px', color: '#ff0000' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            border: '1px solid #000000',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #000000' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: 'normal' }}>
                File Name
              </th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                Total
              </th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                New
              </th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                Updated
              </th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                Failed
              </th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                Status
              </th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                Processing Time
              </th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #000000', fontWeight: 'normal' }}>
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '20px', textAlign: 'center', border: '1px solid #000000' }}>
                  No import history found
                </td>
              </tr>
            ) : (
              history.map((log) => (
                <tr key={log._id} style={{ borderBottom: '1px solid #cccccc' }}>
                  <td style={{ padding: '8px', border: '1px solid #000000', maxWidth: '300px', wordBreak: 'break-word' }}>
                    {log.fileName}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    {log.total}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    {log.new}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    {log.updated}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    {log.failed}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    <span style={{ color: getStatusColor(log.status) }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    {formatTime(log.processingTime)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #000000', fontSize: '10px' }}>
                    {formatDate(log.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              border: '1px solid #000000',
              backgroundColor: currentPage === 1 ? '#f5f5f5' : '#ffffff',
              color: currentPage === 1 ? '#999999' : '#000000',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '11px' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
            disabled={currentPage === pagination.pages}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              border: '1px solid #000000',
              backgroundColor: currentPage === pagination.pages ? '#f5f5f5' : '#ffffff',
              color: currentPage === pagination.pages ? '#999999' : '#000000',
              cursor: currentPage === pagination.pages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

