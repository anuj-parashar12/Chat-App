import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function useFileUpload(chatId) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(`File type "${file.type}" is not supported`);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('File exceeds the 50 MB limit');
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Do NOT set Content-Type manually — axios must auto-set it so the
      // multipart boundary is included, which multer requires to parse parts.
      await api.post(`/media/upload/${chatId}`, formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
          toast.loading(`Uploading... ${pct}%`, { id: 'upload' });
        },
      });
      toast.success('File sent!', { id: 'upload' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Upload failed';
      toast.error(msg, { id: 'upload' });
      console.error('Upload error:', err?.response?.data || err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [chatId]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length) uploadFile(acceptedFiles[0]);
  }, [uploadFile]);

  const dropzone = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_SIZE_BYTES,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip'],
    },
  });

  return { uploading, progress, uploadFile, dropzone };
}
