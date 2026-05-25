"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import Webcam from 'react-webcam';
import { LogOut, XCircle, Menu } from 'lucide-react';
import { API_CONFIG, buildUrl } from '../config';

// Hooks
import { useGuardTerminal } from '../../src/hooks/guard/useGuardTerminal';
import { useAadhaarVerification } from '../../src/hooks/guard/useAadhaarVerification';
import { useQuickEntry } from '../../src/hooks/guard/useQuickEntry';

// Sub-components
import { SidebarHistory } from '../../components/guard/SidebarHistory';
import { ScannerModule } from '../../components/guard/ScannerModule';
import { VisitorDossier } from '../../components/guard/VisitorDossier';
import { AadhaarQuickLook } from '../../components/guard/AadhaarQuickLook';
import { QuickEntryForm } from '../../components/guard/QuickEntryForm';

export default function GuardTerminal() {
  const router = useRouter();
  const {
    windowWidth,
    scanStatus, setScanStatus,
    visitor, setVisitor,
    errorMsg, setErrorMsg,
    auditHistory, setAuditHistory,
    isLoading,
    manualId, setManualId,
    user, clock,
    shiftStats, fetchShiftStats,
    isSidebarOpen, setIsSidebarOpen,
    searchQuery, setSearchQuery,
    guardConfig, employees, systemPurposes,
    getTenantId, tenant, shiftStartRef, fetchHistory
  } = useGuardTerminal();

  const {
    isUploadingAadhaar, aadhaarReviewData, setAadhaarReviewData,
    aadhaarPassword, setAadhaarPassword,
    pdfRenderedImage, setPdfRenderedImage,
    uidaiWindow, fetchedFile, setFetchedFile,
    handleOpenUidai, handleAadhaarUpload
  } = useAadhaarVerification(getTenantId, guardConfig);

  const {
    showQuickEntry, setShowQuickEntry,
    activeRegTab, setActiveRegTab,
    revisitSearch, setRevisitSearch,
    revisitResults, isSearchingRevisit,
    formData, setFormData,
    isSubmitting, captureMode, setCaptureMode,
    handleRevisitorSearch, handleQuickRegister
  } = useQuickEntry(getTenantId, fetchHistory);

  const [showHandover, setShowHandover] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [historyFilter, setHistoryFilter] = useState<any>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string, title: string, isAadhaar?: boolean, id?: string } | null>(null);
  const [isPreviewZoomed, setIsPreviewZoomed] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const webcamRefReg = useRef<Webcam>(null);

  const startScanner = async () => {
    setScanStatus('scanning');
    setVisitor(null);
    setErrorMsg('');
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
            handleVerification(decodedText);
            stopScanner();
        }, () => {});
      } catch (err) {
        setScanStatus('error');
        setErrorMsg('Camera access denied');
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current = null; } catch (err) {}
    }
  };

  const handleVerification = async (id: string) => {
    setScanStatus('verifying');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': getTenantId() },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setVisitor(data);
        setScanStatus('success');
      } else {
        setScanStatus('error');
        setErrorMsg(data.message || 'Invalid Pass');
      }
    } catch (err) {
      setScanStatus('error');
      setErrorMsg('Network Error');
    }
  };

  const handleGrantAccess = async (action: 'checkin' | 'completed' | 'forward') => {
    if (!visitor?._id) return;
    try {
      const token = localStorage.getItem('token');
      let body: any = { status: '' };
      if (action === 'checkin') body.status = 'GATE_IN';
      else if (action === 'completed') body.status = 'GATE_OUT';
      else if (action === 'forward') body.status = 'SENT_FOR_APPROVAL';

      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${visitor._id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify(body),
        credentials: 'include'
      });
      if (res.ok) {
        const updated = await res.json();
        setVisitor(updated.visitor);
        setScanStatus('success');
        fetchShiftStats();
      }
    } catch (err) {}
  };

  const handleSendAlert = async (id: string, type: 'OVERSTAY' | 'POST_MEETING') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}/notify-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-tenant-id': getTenantId() },
        body: JSON.stringify({ type }),
        credentials: 'include'
      });
      alert('Alert dispatched.');
    } catch (err) {}
  };

  const performCapture = useCallback(() => {
    if (!webcamRefReg.current) return;
    const imageSrc = webcamRefReg.current.getScreenshot();
    if (imageSrc) {
      if (captureMode === 'VISITOR') setFormData((prev: any) => ({ ...prev, photoUrl: imageSrc }));
      else setFormData((prev: any) => ({ ...prev, idProofPhotoUrl: imageSrc }));
    }
  }, [captureMode, setFormData]);

  const handleAadhaarConfirm = async () => {
    if (!aadhaarReviewData) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${aadhaarReviewData.visitorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-tenant-id': getTenantId() },
        body: JSON.stringify({ aadhaarVerified: true, maskedAadhaar: aadhaarReviewData.maskedAadhaar, aadhaarImageUrl: pdfRenderedImage || aadhaarReviewData.imageUrl }),
        credentials: 'include'
      });
      if (res.ok) {
         const updated = await res.json();
         setVisitor(updated.visitor);
         setAadhaarReviewData(null);
         setPdfRenderedImage(null);
         alert('Aadhaar Verified.');
      }
    } catch (err) {}
  };

  const handleHandover = async () => {
    if (!shiftStats) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.HANDOVER}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-tenant-id': getTenantId() },
        body: JSON.stringify({ gateId: 'MAIN_GATE', shiftStart: shiftStartRef.current, notes: handoverNotes, stats: shiftStats }),
        credentials: 'include'
      });
      if (res.ok) {
        localStorage.clear();
        router.push('/login');
      }
    } catch (err) {}
  };

  const summary = {
    applied: auditHistory.length,
    pending: auditHistory.filter(v => v.status === 'PENDING_GUARD').length,
    gate_in: auditHistory.filter(v => v.status === 'GATE_IN').length,
    gate_out: auditHistory.filter(v => v.status === 'GATE_OUT').length,
  };

  const autofillVisitor = (v: any) => {
    setFormData({
      ...formData, name: v.name, phone: v.phone, email: v.email || '', company: v.company || '',
      idProofType: v.idProofType || 'Aadhar Card', idProofNumber: v.idProofNumber || '',
      photoUrl: '', idProofPhotoUrl: ''
    });
    setActiveRegTab('NEW');
  };

  return (
    <div className="guard_terminal">
      <header className="terminal_nav glass_panel">
        <div className="terminal_brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="hamburger_btn_global" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu size={24} /></button>
          <span>{tenant?.name} <strong>Security</strong></span>
          <button className="glass-btn primary" onClick={() => setShowQuickEntry(true)} style={{ marginLeft: '20px' }}>+ NEW</button>
        </div>
        <div className="terminal_stats">
          {Object.entries(summary).map(([key, val]) => (
            <div key={key} className={`stat_pill ${historyFilter === key.toUpperCase() ? 'active_filter' : ''}`} onClick={() => setHistoryFilter(key.toUpperCase())}>
              {key.toUpperCase().replace('_', ' ')} <strong>{val}</strong>
            </div>
          ))}
        </div>
        <button className="glass-btn end_shift_btn" onClick={() => setShowHandover(true)}><LogOut size={16} /> EXIT</button>
      </header>

      <main className="terminal_body">
        <AnimatePresence>
          {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mobile_overlay_global" onClick={() => setIsSidebarOpen(false)} />}
        </AnimatePresence>
        <motion.div className="sidebar_wrapper_global" initial={false} animate={{ x: windowWidth <= 768 ? (isSidebarOpen ? 0 : -420) : 0 }} transition={{ duration: 0.3 }}>
          <SidebarHistory 
            auditHistory={auditHistory}
            isLoading={isLoading}
            visitor={visitor}
            searchQuery={searchQuery}
            historyFilter={historyFilter}
            setSearchQuery={setSearchQuery}
            setVisitor={setVisitor}
            setScanStatus={setScanStatus}
            handleGrantAccess={handleGrantAccess}
            handleSendAlert={handleSendAlert}
            setSelectedPhoto={setSelectedPhoto}
            isAadhaarLicensed={tenant?.features.aadhaar}
          />
        </motion.div>
        <div className="operational_zone">
          <div className="kiosk_scanner glass_panel">
            <ScannerModule 
              scanStatus={scanStatus}
              manualId={manualId}
              errorMsg={errorMsg}
              setManualId={setManualId}
              startScanner={startScanner}
              stopScanner={stopScanner}
              handleVerification={handleVerification}
              setScanStatus={setScanStatus}
            />
            {scanStatus === 'success' && visitor && (
              <VisitorDossier 
                visitor={visitor}
                setScanStatus={setScanStatus}
                aadhaarReviewData={aadhaarReviewData}
                uidaiWindow={uidaiWindow}
                aadhaarPassword={aadhaarPassword}
                isUploadingAadhaar={isUploadingAadhaar}
                pdfRenderedImage={pdfRenderedImage}
                handleOpenUidai={handleOpenUidai}
                handleStep2Interact={() => setUidaiWindow(null)}
                setAadhaarPassword={setAadhaarPassword}
                handleAadhaarUpload={handleAadhaarUpload}
                handleAutoFetchLatest={() => {}}
                fetchedFile={fetchedFile}
                setIsPreviewZoomed={setIsPreviewZoomed}
                handleAadhaarConfirm={handleAadhaarConfirm}
                handleAadhaarReject={() => setAadhaarReviewData(null)}
                handleGrantAccess={handleGrantAccess}
                handleSendAlert={handleSendAlert}
                guardConfig={guardConfig}
              />
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showHandover && (
          <div className="modal_overlay">
            <div className="handover_modal glass_panel" style={{ padding: '30px' }}>
              <h2>Shift Handover</h2>
              <textarea className="glass-input" value={handoverNotes} onChange={e => setHandoverNotes(e.target.value)} placeholder="Shift notes..." style={{ width: '100%', margin: '20px 0' }} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="glass-btn secondary" onClick={() => setShowHandover(false)}>BACK</button>
                <button className="glass-btn primary" onClick={handleHandover}>LOGOUT</button>
              </div>
            </div>
          </div>
        )}
        {showQuickEntry && (
          <div className="modal_overlay">
            <div className="glass_panel" style={{ width: '95%', maxWidth: '1000px', padding: '30px' }}>
              <QuickEntryForm 
                activeRegTab={activeRegTab} setActiveRegTab={setActiveRegTab}
                setShowQuickEntry={setShowQuickEntry}
                revisitSearch={revisitSearch} setRevisitSearch={setRevisitSearch}
                handleRevisitorSearch={handleRevisitorSearch}
                isSearchingRevisit={isSearchingRevisit}
                revisitResults={revisitResults}
                autofillVisitor={autofillVisitor}
                formData={formData} setFormData={setFormData}
                systemPurposes={systemPurposes}
                employees={employees}
                handleQuickRegister={handleQuickRegister}
                isSubmitting={isSubmitting}
                captureMode={captureMode} setCaptureMode={setCaptureMode}
                webcamRefReg={webcamRefReg} performCapture={performCapture}
                features={tenant?.features}
                guardConfig={guardConfig}
              />
            </div>
          </div>
        )}
        {selectedPhoto && (
          <div className="modal_overlay" onClick={() => setSelectedPhoto(null)}>
            <img src={selectedPhoto.url} alt="Large" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
