'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  ForwardedRef,
} from 'react';
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

export interface ImportHistoryHandle {
  deleteAll: () => Promise<void>;
  refresh: (options?: { page?: number; showLoading?: boolean }) => Promise<void>;
}

interface ImportHistoryProps {
  onHistoryChange?: (hasData: boolean) => void;
}

const SKELETON_ROWS = 6;
const tableColumns = ['file', 'total', 'new', 'updated', 'failed', 'status', 'time', 'timestamp', 'actions'] as const;

function ImportHistoryComponent({ onHistoryChange }: ImportHistoryProps, ref: ForwardedRef<ImportHistoryHandle>) {
  const [history, setHistory] = useState<ImportLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadingMode, setLoadingMode] = useState<'initial' | 'overlay' | 'none'>('initial');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const hasProcessingItemsRef = useRef(false);
  const historyLengthRef = useRef(0);

  const fetchHistory = useCallback(
    async (page: number = 1, options: { showLoading?: boolean } = {}) => {
      const fetchStart = performance.now();
      console.log(`[ImportHistory] Fetching page ${page} (showLoading=${options.showLoading ?? true})`);
      const { showLoading = true } = options;
      if (showLoading) {
        setLoadingMode(historyLengthRef.current === 0 ? 'initial' : 'overlay');
      }

      try {
        setError(null);
        const response = await axios.get(`${API_URL}/history`, {
          params: { page, limit: 50 },
        });

        const historyData = response.data.data;
        historyLengthRef.current = historyData.length;

        const hasProcessing = historyData.some((item: ImportLog) => item.status === 'processing');
        hasProcessingItemsRef.current = hasProcessing;

        setHistory(historyData);
        setPagination(response.data.pagination);

        if (onHistoryChange) {
          onHistoryChange(historyData.length > 0);
        }
        const duration = (performance.now() - fetchStart).toFixed(1);
        console.log(
          `[ImportHistory] Page ${page} fetched ${historyData.length} rows in ${duration}ms`
        );
      } catch (err) {
        console.error('[ImportHistory] Failed to fetch history', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch import history');
        if (onHistoryChange) {
          onHistoryChange(false);
        }
      } finally {
        if (showLoading) {
          setLoadingMode('none');
        }
      }
    },
    [onHistoryChange]
  );

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchHistory(currentPage, { showLoading: false });
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

  const handleDeleteAll = useCallback(async () => {
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
  }, [onHistoryChange, fetchHistory]);

  const refreshHistory = useCallback(
    (options?: { page?: number; showLoading?: boolean }) => {
      const targetPage = options?.page ?? currentPage;
      const showLoading = options?.showLoading ?? true;
      return fetchHistory(targetPage, { showLoading });
    },
    [fetchHistory, currentPage]
  );

  useImperativeHandle(
    ref,
    () => ({
      deleteAll: handleDeleteAll,
      refresh: refreshHistory,
    }),
    [handleDeleteAll, refreshHistory]
  );

  const renderSkeletonRows = () =>
    Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
      <tr key={`skeleton-${rowIndex}`} className="skeleton-row">
        {tableColumns.map((column) => (
          <td key={`${column}-${rowIndex}`}>
            <div className={`skeleton-cell skeleton-cell--${column}`} />
          </td>
        ))}
      </tr>
    ));

  if (error) {
    return <div className="alert alert--error">Error: {error}</div>;
  }

  const showSkeleton = loadingMode === 'initial';
  const showOverlay = loadingMode === 'overlay';

  return (
    <div className={`table-card ${showOverlay ? 'table-card--loading' : ''}`}>
      {showOverlay && (
        <div className="table-loading-overlay">
          <div className="spinner" />
          <span>Refreshing data…</span>
        </div>
      )}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Total</th>
              <th>New</th>
              <th>Updated</th>
              <th>Failed</th>
              <th>Status</th>
              <th>Processing Time</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? renderSkeletonRows()
              : history.length === 0
              ? (
                <tr>
                  <td colSpan={9} className="empty-state">
                    No import history found
                  </td>
                </tr>
                )
              : history.map((log) => (
                  <tr key={log._id}>
                    <td style={{ maxWidth: 320, wordBreak: 'break-word' }}>{log.fileName}</td>
                    <td>{log.total}</td>
                    <td>{log.new}</td>
                    <td>{log.updated}</td>
                    <td>{log.failed}</td>
                    <td>
                      <span className={`status-pill status-pill--${log.status}`}>
                        {renderStatusLabel(log)}
                      </span>
                      {log.status === 'failed' && (
                        <div className="failure-hint">{getFailureMessage(log)}</div>
                      )}
                    </td>
                    <td>{formatTime(log.processingTime)}</td>
                    <td className="timestamp">{formatDate(log.timestamp)}</td>
                    <td className="actions-cell">
                      <button onClick={() => handleDelete(log._id)} disabled={deleting === log._id}>
                        {deleting === log._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
            disabled={currentPage === pagination.pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const ImportHistory = forwardRef<ImportHistoryHandle, ImportHistoryProps>(ImportHistoryComponent);
export default ImportHistory;

