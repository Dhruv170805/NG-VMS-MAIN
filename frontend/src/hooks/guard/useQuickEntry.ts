import { useState, useCallback } from 'react';
import { API_CONFIG, buildUrl } from '../config';
import { Visitor } from '../../components/guard/types';

export const useQuickEntry = (getTenantId: () => string, fetchHistory: () => void) => {
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [activeRegTab, setActiveRegTab] = useState<'NEW' | 'REVISIT'>('NEW');
  const [revisitSearch, setRevisitSearch] = useState('');
  const [revisitResults, setRevisitResults] = useState<Visitor[]>([]);
  const [isSearchingRevisit, setIsSearchingRevisit] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', phone: '', email: '', company: '', purpose: '', hostId: '', hostName: '', 
    idProofType: 'Aadhar Card', idProofNumber: '', requestedDuration: '1H', hostRemark: '', 
    photoUrl: '', idProofPhotoUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureMode, setCaptureMode] = useState<'VISITOR' | 'ID'>('VISITOR');

  const handleRevisitorSearch = useCallback(async () => {
    if (!revisitSearch.trim()) return setRevisitResults([]);
    setIsSearchingRevisit(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}?search=${encodeURIComponent(revisitSearch)}&limit=5`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        }, credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setRevisitResults(data.data);
    } catch (err) { console.error(err); } 
    finally { setIsSearchingRevisit(false); }
  }, [revisitSearch, getTenantId]);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.hostId) return alert('Please complete required fields.');
    setIsSubmitting(true);
    try {
      const res = await fetch(API_CONFIG.ENDPOINTS.VISITORS + '/register', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        }, 
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowQuickEntry(false);
        setFormData({ 
          name: '', phone: '', email: '', company: '', purpose: '', hostId: '', hostName: '', 
          idProofType: 'Aadhar Card', idProofNumber: '', requestedDuration: '1H', hostRemark: '', 
          photoUrl: '', idProofPhotoUrl: ''
        });
        fetchHistory();
      } else {
        const data = await res.json();
        alert(data.message || 'Registration failed');
      }
    } catch (err) { alert('Network error.'); } 
    finally { setIsSubmitting(false); }
  };

  return {
    showQuickEntry, setShowQuickEntry,
    activeRegTab, setActiveRegTab,
    revisitSearch, setRevisitSearch,
    revisitResults, setRevisitResults,
    isSearchingRevisit,
    formData, setFormData,
    isSubmitting,
    captureMode, setCaptureMode,
    handleRevisitorSearch,
    handleQuickRegister
  };
};
