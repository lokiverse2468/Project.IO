'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  totalBatches?: number;
  completedBatches?: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ImportHistoryProps {
  onHistoryChange?: (hasData: boolean) => void;
}

export default function ImportHistory({ onHistoryChange }: ImportHistoryProps) {
  const [history, setHistory] = useState<ImportLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const hasProcessingItemsRef = useRef(false);

  const fetchHistory = useCallback(async (page: number = 1) => {
    const fetchStartTime = performance.now();
    
    try {
      setLoading(true);
      setError(null);
      
      const apiStartTime = performance.now();
      const response = await axios.get(`${API_URL}/history`, {
        params: { page, limit: 50 },
      });
      const apiEndTime = performance.now();
      
      const processStartTime = performance.now();
      const historyData = response.data.data;
      
      // Batch state updates to reduce re-renders
      const hasProcessing = historyData.some((item: ImportLog) => item.status === 'processing');
      hasProcessingItemsRef.current = hasProcessing;
      
      // Update state in a single batch
      setHistory(historyData);
      setPagination(response.data.pagination);
      
      // Notify parent component about data availability (only if changed)
      if (onHistoryChange) {
        onHistoryChange(historyData.length > 0);
      }
      const processEndTime = performance.now();
      
      const fetchEndTime = performance.now();
    } catch (err) {
      const fetchEndTime = performance.now();
      setError(err instanceof Error ? err.message : 'Failed to fetch import history');
      if (onHistoryChange) {
        onHistoryChange(false);
      }
    } finally {
      setLoading(false);
    }
  }, [onHistoryChange]);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  useEffect(() => {
    // Set up polling - check every 3 seconds
    // This ensures we catch status updates quickly for processing items
    const interval = setInterval(() => {
      fetchHistory(currentPage);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [currentPage, fetchHistory]);

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

  const renderStatusLabel = (log: ImportLog) => {
    if (log.status === 'processing' && log.totalBatches) {
      return `${log.status} (${log.completedBatches || 0}/${log.totalBatches})`;
    }
    return log.status;
  };

  const getFailureMessage = (log: ImportLog) => {
    if (log.status !== 'failed') return null;

    const failureDetails = log.failedReasons?.[0];
    if (!failureDetails) return 'Import failed. Check server logs for details.';

    return failureDetails.error || failureDetails.reason || 'Import failed. Check server logs for details.';
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this import log?')) {
      return;
    }

    try {
      setDeleting(id);
      await axios.delete(`${API_URL}/history/${id}`);
      // Refresh the history after deletion
      // fetchHistory will notify parent if no data remains
      await fetchHistory(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete import log');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL import logs? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting('all');
      await axios.delete(`${API_URL}/history`);
      // Clear the history
      setHistory([]);
      setPagination(null);
      alert('All import logs deleted successfully');
      
      // Notify parent that there's no data
      if (onHistoryChange) {
        onHistoryChange(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete import logs');
    } finally {
      setDeleting(null);
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
      {history.length > 0 && (
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDeleteAll}
            disabled={deleting === 'all'}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              border: '1px solid #ff0000',
              backgroundColor: deleting === 'all' ? '#f5f5f5' : '#ffffff',
              color: deleting === 'all' ? '#999999' : '#ff0000',
              cursor: deleting === 'all' ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting === 'all' ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      )}
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
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000', fontWeight: 'normal' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '20px', textAlign: 'center', border: '1px solid #000000' }}>
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
                      {renderStatusLabel(log)}
                    </span>
                    {log.status === 'failed' && (
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '10px',
                          color: '#666666',
                          textAlign: 'left',
                        }}
                      >
                        {getFailureMessage(log)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    {formatTime(log.processingTime)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #000000', fontSize: '10px' }}>
                    {formatDate(log.timestamp)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000000' }}>
                    <button
                      onClick={() => handleDelete(log._id)}
                      disabled={deleting === log._id}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: '1px solid #ff0000',
                        backgroundColor: deleting === log._id ? '#f5f5f5' : '#ffffff',
                        color: deleting === log._id ? '#999999' : '#ff0000',
                        cursor: deleting === log._id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deleting === log._id ? 'Deleting...' : 'Delete'}
                    </button>
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

