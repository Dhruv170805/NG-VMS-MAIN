import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_CONFIG, buildUrl } from '../../config';
import { useTenant } from '../../TenantContext';
import { useAppStore } from '../../store';
import { Visitor, ShiftStats } from '../../../components/guard/types';

export const useGuardTerminal = () => {
  const router = useRouter();
  const { getTenantId, tenant } = useTenant();
  const { connectSocket, disconnectSocket, socket } = useAppStore();

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [auditHistory, setAuditHistory] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manualId, setManualId] = useState('');
  const [user, setUser] = useState<any>(null);
  const [clock, setClock] = useState(new Date());
  const [shiftStats, setShiftStats] = useState<ShiftStats | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [guardConfig, setGuardConfig] = useState<any>({ autoScan: false, folderName: '', requireAadhaar: false });
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemPurposes, setSystemPurposes] = useState<string[]>([]);

  const shiftStartRef = useRef(new Date().toISOString());

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/config`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const data = await res.json();
      setEmployees(data.hosts || []);
      setSystemPurposes(data.purposes || ['Meeting', 'Internship', 'Training', 'Personal', 'Other']);
      setGuardConfig({ autoScan: false, folderName: '', requireAadhaar: false, ...data.guard_config });
      return data;
    } catch (err) {
      console.error('Failed to fetch config', err);
    }
  }, [getTenantId]);

  const fetchHistory = useCallback(async (signal?: AbortSignal, search?: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.VISITORS, {
        limit: '50',
        ...(search ? { search } : {}),
      });

      const res = await fetch(fetchUrl, { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        }, 
        signal, 
        credentials: 'include' 
      });
      const data = await res.json();
      if (data.success) setAuditHistory(data.data);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('History fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [getTenantId]);

  const fetchShiftStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/shift-summary?start=${shiftStartRef.current}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setShiftStats(data.summary);
    } catch (err) {
      console.error('Stats fetch failed', err);
    }
  }, [getTenantId]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchConfig();
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchConfig]);

  useEffect(() => {
    const timer = setTimeout(() => fetchHistory(undefined, searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchHistory]);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'GUARD' && parsedUser.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchHistory(controller.signal);
    fetchShiftStats();
    
    connectSocket(token);

    return () => {
      controller.abort();
      disconnectSocket();
    };
  }, [fetchHistory, fetchShiftStats, router, connectSocket, disconnectSocket]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewVisitor = (newVisitor: Visitor) => {
      setAuditHistory(prev => [newVisitor, ...prev]);
    };

    const handleUpdateVisitor = (updatedVisitor: Visitor) => {
      setAuditHistory(prev => prev.map(v => v._id === updatedVisitor._id ? updatedVisitor : v));
      if (visitor?._id === updatedVisitor._id) setVisitor(updatedVisitor);
    };

    socket.on('visitor:new', handleNewVisitor);
    socket.on('visitor:update', handleUpdateVisitor);

    return () => {
      socket.off('visitor:new', handleNewVisitor);
      socket.off('visitor:update', handleUpdateVisitor);
    };
  }, [socket, visitor?._id]);

  return {
    windowWidth,
    scanStatus, setScanStatus,
    visitor, setVisitor,
    errorMsg, setErrorMsg,
    auditHistory, setAuditHistory,
    isLoading,
    manualId, setManualId,
    user,
    clock,
    shiftStats, fetchShiftStats,
    isSidebarOpen, setIsSidebarOpen,
    searchQuery, setSearchQuery,
    guardConfig,
    employees,
    systemPurposes,
    getTenantId, tenant,
    shiftStartRef,
    fetchHistory
  };
};
