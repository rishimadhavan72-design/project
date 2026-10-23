import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  FolderLock,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sparkles,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  FolderUp,
  Check,
} from 'lucide-react';
import { DocumentItem } from '../types/trustvault';
import { validateUploadFile, MAX_UPLOAD_SIZE_BYTES } from '../utils/security-rules';
import {
  trustVaultStore,
  generateDefaultRichDocumentContent,
  generateSampleImageScan,
} from '../services/trustvault-store';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFolder?: string;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFolder,
}) => {
  const currentWorkspace = trustVaultStore.getCurrentWorkspace();
  const currentUser = trustVaultStore.getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Tab: 'single' or 'folder'
  const [uploadMode, setUploadMode] = useState<'single' | 'folder'>('single');

  // Single file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentItem['category']>('Personal');
  const [folderPath, setFolderPath] = useState(initialFolder || 'general');
  const [customFolder, setCustomFolder] = useState('');
  const [description, setDescription] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Folder batch state
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<File[]>([]);
  const [detectedFolderName, setDetectedFolderName] = useState('');

  // Update folderPath when initialFolder changes
  useEffect(() => {
    if (initialFolder) {
      setFolderPath(initialFolder);
    }
  }, [initialFolder]);

  // Existing folders for dropdown
  const existingFolders = trustVaultStore.getFoldersInCurrentWorkspace().map((f) => f.folderPath);
  const allKnownFolders = Array.from(
    new Set([
      'finance',
      'legal',
      'technical',
      'hr',
      'identity-scans',
      'legal-agreements',
      'general',
      ...existingFolders,
    ])
  );

  if (!isOpen) return null;

  const bucketName =
    currentWorkspace?.type === 'corporate'
      ? 'acme-corporate-vault'
      : `${currentWorkspace?.slug || 'my'}-vault`;

  const isSelectedFileImage = Boolean(
    selectedFile &&
      (selectedFile.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(selectedFile.name))
  );

  const handleFileSelection = (file: File) => {
    setUploadError(null);
    const validation = validateUploadFile({ name: file.name, size: file.size });
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const computedTitle = title || nameWithoutExt.replace(/[_-]/g, ' ');
    if (!title) {
      setTitle(computedTitle);
    }

    const lowerName = file.name.toLowerCase();
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(lowerName);

    const isTextReadable =
      file.type.startsWith('text/') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.xml') ||
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.sql') ||
      lowerName.endsWith('.js') ||
      lowerName.endsWith('.ts');

    if (isImage) {
      // For images: Read immediately as Data URL to preserve visual image data!
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFileDataUrl(dataUrl);
        setDocumentContent(dataUrl);
      };
      reader.readAsDataURL(file);
    } else if (isTextReadable) {
      setFileDataUrl(null);
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        setDocumentContent(text);
        setShowContentEditor(true);
      };
      reader.onerror = () => {
        const fallback = generateDefaultRichDocumentContent(
          computedTitle,
          category,
          currentUser?.fullName || 'User',
          file.name
        );
        setDocumentContent(fallback);
      };
      reader.readAsText(file);
    } else {
      // PDF or other binary file
      const reader = new FileReader();
      reader.onload = () => {
        setFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      const richBody = generateDefaultRichDocumentContent(
        computedTitle,
        category,
        currentUser?.fullName || 'User',
        file.name
      );
      setDocumentContent(richBody);
    }
  };

  // Folder selection handler via webkitdirectory
  const handleFolderSelection = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const filesArray = Array.from(fileList);
    // Find folder root name from the first file's webkitRelativePath
    const firstRel = filesArray[0].webkitRelativePath || '';
    const folderRoot = firstRel.split('/')[0] || 'uploaded-folder';

    setDetectedFolderName(folderRoot);
    setSelectedFolderFiles(filesArray);
  };

  const handleCategoryChange = (newCat: DocumentItem['category']) => {
    setCategory(newCat);
    const isImage =
      selectedFile &&
      (selectedFile.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(selectedFile.name));

    if (!isImage && selectedFile && (!documentContent || documentContent.length < 150)) {
      const refreshed = generateDefaultRichDocumentContent(
        title || selectedFile.name,
        newCat,
        currentUser?.fullName || 'User',
        selectedFile.name
      );
      setDocumentContent(refreshed);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length === 1 && uploadMode === 'single') {
        handleFileSelection(e.dataTransfer.files[0]);
      } else {
        // Multi-file or dropped folder
        setUploadMode('folder');
        const filesArray = Array.from(e.dataTransfer.files);
        setSelectedFolderFiles(filesArray);
        setDetectedFolderName(filesArray[0].name.split('.')[0] || 'dropped-folder');
      }
    }
  };

  // Single file submit
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a document to upload.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      try {
        const lowerName = selectedFile.name.toLowerCase();
        let detectedType = selectedFile.type;
        if (!detectedType || detectedType === 'application/octet-stream') {
          if (/\.jpe?g$/i.test(lowerName)) detectedType = 'image/jpeg';
          else if (/\.png$/i.test(lowerName)) detectedType = 'image/png';
          else if (/\.webp$/i.test(lowerName)) detectedType = 'image/webp';
          else if (/\.svg$/i.test(lowerName)) detectedType = 'image/svg+xml';
          else if (/\.pdf$/i.test(lowerName)) detectedType = 'application/pdf';
        }

        const isImage =
          detectedType.startsWith('image/') ||
          /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(lowerName);

        const finalFileDataUrl =
          fileDataUrl || (isImage && documentContent.startsWith('data:image/') ? documentContent : undefined);

        const targetFolder = folderPath === '__custom__' ? customFolder.trim() : folderPath;

        trustVaultStore.uploadDocument(
          {
            name: selectedFile.name,
            size: selectedFile.size,
            type: detectedType || 'application/octet-stream',
          },
          title,
          category,
          description,
          documentContent,
          finalFileDataUrl,
          targetFolder
        );

        setIsUploading(false);
        setUploadProgress(100);
        onSuccess();
        onClose();
      } catch (err: any) {
        setIsUploading(false);
        setUploadError(err.message || 'Upload failed.');
      }
    }, 600);
  };

  // Folder batch submit
  const handleFolderBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFolderFiles.length === 0) {
      setUploadError('Please select a folder containing files to upload.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval);
          return 96;
        }
        return prev + 20;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      try {
        const finalFolderPrefix = (detectedFolderName || 'uploaded-folder')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-');

        const batchItems = selectedFolderFiles.map((file) => {
          const lowerName = file.name.toLowerCase();
          let detectedType = file.type || 'application/octet-stream';
          let cat: DocumentItem['category'] = 'Personal';

          if (lowerName.includes('financ') || lowerName.includes('invoice') || lowerName.includes('sheet') || lowerName.includes('tax')) {
            cat = 'Financial';
          } else if (lowerName.includes('legal') || lowerName.includes('contract') || lowerName.includes('agreement') || lowerName.includes('nda')) {
            cat = 'Legal';
          } else if (lowerName.includes('tech') || lowerName.includes('code') || lowerName.includes('spec') || lowerName.includes('architecture') || lowerName.includes('topology')) {
            cat = 'Technical';
          } else if (lowerName.includes('hr') || lowerName.includes('employee') || lowerName.includes('offer')) {
            cat = 'HR';
          }

          // Generate file specific content or scan
          const isImage =
            file.type.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(lowerName);

          const sampleContent = isImage
            ? generateSampleImageScan(file.name, file.name)
            : generateDefaultRichDocumentContent(file.name, cat, currentUser?.fullName || 'User', file.name);

          // If relative path has subdirectories:
          let itemFolder = finalFolderPrefix;
          if (file.webkitRelativePath) {
            const parts = file.webkitRelativePath.split('/');
            if (parts.length > 2) {
              itemFolder = `${finalFolderPrefix}/${parts.slice(1, -1).join('/')}`;
            }
          }

          return {
            file: {
              name: file.name,
              size: file.size,
              type: detectedType,
            },
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
            category: cat,
            description: `Batch uploaded from folder "${finalFolderPrefix}"`,
            customContent: sampleContent,
            fileDataUrl: isImage ? sampleContent : undefined,
            folderPath: itemFolder,
          };
        });

        trustVaultStore.uploadBatchDocuments(batchItems);

        setIsUploading(false);
        setUploadProgress(100);
        onSuccess();
        onClose();
      } catch (err: any) {
        setIsUploading(false);
        setUploadError(err.message || 'Folder upload failed.');
      }
    }, 800);
  };

  const totalFolderBytes = selectedFolderFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f392b] text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload Encrypted Document / S3 Folder</h3>
              <p className="text-xs text-emerald-200/80 font-mono">
                Target: <span className="font-semibold text-white">s3://{bucketName}/</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Mode Selector (Single File vs Folder Upload like AWS S3) */}
        <div className="px-6 pt-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUploadMode('single')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              uploadMode === 'single'
                ? 'border-emerald-600 text-emerald-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Single Document</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadMode('folder')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              uploadMode === 'folder'
                ? 'border-emerald-600 text-emerald-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderUp className="w-4 h-4 text-amber-600" />
            <span>Upload S3 Folder (Recursive Directory)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
              AWS S3
            </span>
          </button>
        </div>

        {uploadError && (
          <div className="m-6 mb-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* SINGLE FILE FORM */}
        {uploadMode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Drag & Drop File Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AES-256 encryption
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1 rounded-lg flex-shrink-0">
                    Change
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                    <Upload className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Drag & drop your document here, or <span className="text-emerald-700 underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supports PDF, DOCX, XLSX, TXT, CSV, MD, JSON, PNG, JPG (Max 25MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. FY2026 Audit Report"
                className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* S3 Folder Prefix Destination */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                S3 Storage Folder / Key Prefix
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono"
                >
                  {allKnownFolders.map((f) => (
                    <option key={f} value={f}>
                      s3://{bucketName}/{f}/*
                    </option>
                  ))}
                  <option value="__custom__">+ Enter Custom Prefix...</option>
                </select>

                {folderPath === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    placeholder="e.g. legal/board-resolutions"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Target S3 Key: <span className="text-emerald-800 font-bold">s3://{bucketName}/{folderPath === '__custom__' ? customFolder || '...' : folderPath}/{selectedFile?.name || 'filename.ext'}</span>
              </p>
            </div>

            {/* Category & Security Policy Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as any)}
                  className="block w-full px-3 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  <option value="Personal">Personal</option>
                  <option value="Financial">Financial</option>
                  <option value="Legal">Legal</option>
                  <option value="Technical">Technical</option>
                  <option value="HR">HR</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Security Policy
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                  <FolderLock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Private to Owner (Anti-Leak)</span>
                </div>
              </div>
            </div>

            {/* Image Preview or Content Editor */}
            {isSelectedFileImage && fileDataUrl ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Native Image Format ({selectedFile?.name.split('.').pop()?.toUpperCase() || 'IMAGE'})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Visual Format Preserved
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-52 flex items-center justify-center p-2">
                  <img
                    src={fileDataUrl}
                    alt="Preview of uploaded document"
                    className="max-h-48 object-contain rounded-lg shadow-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setShowContentEditor(!showContentEditor)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <FileCode className="w-4 h-4 text-emerald-700" />
                    <span>Document Content / Body</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({documentContent.length > 0 ? `${documentContent.length} chars` : 'Auto-populated'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span>{showContentEditor ? 'Hide' : 'Review & Edit Content'}</span>
                    {showContentEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showContentEditor && (
                  <div className="p-3 pt-0 border-t border-slate-200/80 space-y-2">
                    <textarea
                      rows={5}
                      value={documentContent}
                      onChange={(e) => setDocumentContent(e.target.value)}
                      placeholder="Paste or enter full document contents here..."
                      className="w-full p-3 font-mono text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Optional Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief context regarding document purpose..."
                className="block w-full px-3.5 py-2 sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Encrypting payload & streaming to isolated vault...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 px-5 py-2 bg-[#0f392b] text-white rounded-xl text-xs font-bold hover:bg-[#165b44] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>{isUploading ? 'Encrypting & Storing...' : 'Upload & Encrypt'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* FOLDER UPLOAD (AWS S3 DIRECTORY) FORM */
          <form onSubmit={handleFolderBatchSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <FolderUp className="w-4 h-4 text-amber-700" />
                <span>AWS S3 Bucket Folder Ingestion</span>
              </div>
              <p>
                Select an entire local folder to upload. The applet reads all enclosed files, creates the hierarchical prefix <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">s3://{bucketName}/[folder]/*</code>, and lets you apply folder-level or selective read/edit bucket policies.
              </p>
            </div>

            {/* Folder Drop / Picker */}
            <div
              onClick={() => folderInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer bg-amber-50/30 hover:bg-amber-50/60 transition-all"
            >
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is standard in Chromium/modern browsers
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => handleFolderSelection(e.target.files)}
                className="hidden"
              />

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Click to select a local folder from your device
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Uploads all nested files with directory structure mapped directly to S3 keys.
                  </p>
                </div>
              </div>
            </div>

            {/* Folder Name & Preview of Found Files */}
            {selectedFolderFiles.length > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target S3 Folder Prefix
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">s3://{bucketName}/</span>
                    <input
                      type="text"
                      required
                      value={detectedFolderName}
                      onChange={(e) => setDetectedFolderName(e.target.value)}
                      placeholder="folder-prefix-name"
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-mono text-slate-500">/*</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Discovered Files in Folder ({selectedFolderFiles.length} files, {(totalFolderBytes / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Ready to Ingest
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 p-2">
                    {selectedFolderFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="font-mono text-slate-800 truncate">
                            {f.webkitRelativePath || f.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                          {(f.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Batch encrypting & uploading folder to s3://{bucketName}/{detectedFolderName}/*...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedFolderFiles.length === 0 || isUploading}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <FolderUp className="w-4 h-4 text-amber-200" />
                <span>
                  {isUploading
                    ? `Ingesting ${selectedFolderFiles.length} files...`
                    : `Upload Entire Folder (${selectedFolderFiles.length} Objects)`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
