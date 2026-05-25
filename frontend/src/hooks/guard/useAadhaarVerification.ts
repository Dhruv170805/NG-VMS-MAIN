import { useState, useEffect } from 'react';
import { API_CONFIG, buildUrl } from '../../config';

export const useAadhaarVerification = (getTenantId: () => string, guardConfig: any) => {
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);
  const [aadhaarReviewData, setAadhaarReviewData] = useState<any>(null);
  const [aadhaarPassword, setAadhaarPassword] = useState('');
  const [pdfRenderedImage, setPdfRenderedImage] = useState<string | null>(null);
  const [uidaiWindow, setUidaiWindow] = useState<Window | null>(null);
  const [fetchedFile, setFetchedFile] = useState<File | null>(null);

  useEffect(() => {
    const handleReentry = () => {
      if (uidaiWindow && !uidaiWindow.closed) {
        try { uidaiWindow.close(); } catch (e) {}
        setUidaiWindow(null);
      }
    };
    window.addEventListener('focus', handleReentry);
    window.addEventListener('click', handleReentry, { capture: true });
    return () => {
      window.removeEventListener('focus', handleReentry);
      window.removeEventListener('click', handleReentry, { capture: true });
    };
  }, [uidaiWindow]);

  const handleOpenUidai = () => {
    const win = window.open('https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en', 'UIDAIPortal', 'width=1200,height=800');
    if (win) setUidaiWindow(win);
  };

  const handleAadhaarUpload = async (file: File | null | undefined, visitorId: string) => {
    if (!file) return;
    setIsUploadingAadhaar(true);
    const form = new FormData();
    form.append('file', file);
    if (aadhaarPassword) form.append('password', aadhaarPassword);

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/aadhaar/upload`, {
        method: 'POST', 
        headers: { 'x-tenant-id': getTenantId() },
        body: form
      });
      const data = await res.json();
      if (res.ok) setAadhaarReviewData({ ...data, visitorId });
      else alert(data.error || 'Aadhaar processing failed');
    } catch (err) {
      alert('Error uploading Aadhaar');
    } finally {
      setIsUploadingAadhaar(false);
    }
  };

  return {
    isUploadingAadhaar, setIsUploadingAadhaar,
    aadhaarReviewData, setAadhaarReviewData,
    aadhaarPassword, setAadhaarPassword,
    pdfRenderedImage, setPdfRenderedImage,
    uidaiWindow, setUidaiWindow,
    fetchedFile, setFetchedFile,
    handleOpenUidai,
    handleAadhaarUpload
  };
};
