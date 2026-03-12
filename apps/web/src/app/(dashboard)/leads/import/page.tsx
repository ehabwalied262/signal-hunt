'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DuplicateItem {
  incoming: {
    companyName: string;
    contactName: string | null;
    phoneNumber: string;
  };
  existing: {
    id: string;
    companyName: string;
    contactName: string | null;
    phoneNumber: string;
    owner: { fullName: string };
  };
}

interface UploadResult {
  importId: string;
  status: 'processing' | 'awaiting_review';
  totalRows: number;
  validRows: number;
  errors: Array<{ row: number; message: string }>;
  duplicates: DuplicateItem[];
}

type UploadStep = 'upload' | 'uploading' | 'review_duplicates' | 'processing' | 'done' | 'error';

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [decisions, setDecisions] = useState<Record<string, 'skip' | 'merge' | 'import'>>({});
  const [resolving, setResolving] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setStep('uploading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post<UploadResult>('/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadResult(response.data);

      if (response.data.status === 'awaiting_review') {
        // Initialize all decisions to 'skip'
        const initial: Record<string, 'skip' | 'merge' | 'import'> = {};
        response.data.duplicates.forEach((d) => {
          initial[d.incoming.phoneNumber] = 'skip';
        });
        setDecisions(initial);
        setStep('review_duplicates');
      } else {
        setStep('processing');
        // Poll for completion
        pollImportStatus(response.data.importId);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Upload failed. Please try again.',
      );
      setStep('error');
    }
  }, []);

  const pollImportStatus = async (importId: string) => {
    const maxAttempts = 60; // 60 seconds max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));

      try {
        const res = await apiClient.get(`/imports/${importId}`);
        if (res.data.status === 'COMPLETED') {
          setUploadResult((prev) =>
            prev ? { ...prev, validRows: res.data.newLeads } : prev,
          );
          setStep('done');
          return;
        }
        if (res.data.status === 'FAILED') {
          setErrorMessage('Import processing failed. Please try again.');
          setStep('error');
          return;
        }
      } catch {
        // Continue polling
      }
    }
    setStep('done'); // Assume done after timeout
  };

  const handleResolveDuplicates = async () => {
    if (!uploadResult) return;
    setResolving(true);

    try {
      const decisionsList = Object.entries(decisions).map(
        ([phoneNumber, action]) => ({ phoneNumber, action }),
      );

      const res = await apiClient.post(
        `/imports/${uploadResult.importId}/resolve`,
        { decisions: decisionsList },
      );

      if (res.data.status === 'processing') {
        setStep('processing');
        pollImportStatus(uploadResult.importId);
      } else {
        setStep('done');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to resolve duplicates',
      );
      setStep('error');
    } finally {
      setResolving(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/leads')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Import Leads</h1>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <>
          <div
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-white'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <FileSpreadsheet className="mb-4 h-12 w-12 text-gray-300" />
            <p className="mb-2 text-lg font-medium text-gray-700">
              Drop your CSV or Excel file here
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Supports .csv, .xlsx, .xls — max 10MB
            </p>
            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <Upload className="mr-2 inline h-4 w-4" />
              Choose File
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={onFileSelect}
              />
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Expected CSV Columns
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
              <span className="rounded bg-gray-50 px-2 py-1">Company Name *</span>
              <span className="rounded bg-gray-50 px-2 py-1">Contact Name</span>
              <span className="rounded bg-gray-50 px-2 py-1">Contact Title</span>
              <span className="rounded bg-gray-50 px-2 py-1">Phone Number *</span>
              <span className="rounded bg-gray-50 px-2 py-1">Country</span>
              <span className="rounded bg-gray-50 px-2 py-1">Location</span>
              <span className="rounded bg-gray-50 px-2 py-1">Headcount</span>
              <span className="rounded bg-gray-50 px-2 py-1">Growth 6m</span>
              <span className="rounded bg-gray-50 px-2 py-1">Growth 12m</span>
              <span className="rounded bg-gray-50 px-2 py-1">Company Overview</span>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              * Required fields. Column headers are matched flexibly (e.g.
              &ldquo;Company Name&rdquo;, &ldquo;company_name&rdquo;, or &ldquo;Organization&rdquo; all work).
            </p>
          </div>
        </>
      )}

      {/* Step: Uploading */}
      {step === 'uploading' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-16">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
          <p className="text-lg font-medium text-gray-700">
            Uploading and parsing file...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Validating rows and checking for duplicates
          </p>
        </div>
      )}

      {/* Step: Review Duplicates */}
      {step === 'review_duplicates' && uploadResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="font-medium text-yellow-800">
                {uploadResult.duplicates.length} duplicate phone number
                {uploadResult.duplicates.length > 1 ? 's' : ''} found
              </p>
            </div>
            <p className="mt-1 text-sm text-yellow-700">
              {uploadResult.validRows} new leads will be imported. Choose
              what to do with each duplicate below.
            </p>
          </div>

          {/* Parse errors */}
          {uploadResult.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-2 text-sm font-medium text-red-700">
                {uploadResult.errors.length} row(s) had errors and were
                skipped:
              </p>
              <ul className="space-y-1 text-xs text-red-600">
                {uploadResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {uploadResult.errors.length > 5 && (
                  <li>... and {uploadResult.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Duplicate list */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-3">
              <h3 className="text-sm font-medium text-gray-700">
                Duplicate Review
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {uploadResult.duplicates.map((dup) => (
                <div
                  key={dup.incoming.phoneNumber}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {dup.incoming.companyName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {dup.incoming.phoneNumber} —{' '}
                          {dup.incoming.contactName || 'No contact'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">→</span>
                      <div>
                        <p className="text-xs text-gray-500">
                          Existing: {dup.existing.companyName}
                        </p>
                        <p className="text-xs text-gray-400">
                          Owned by {dup.existing.owner.fullName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['skip', 'merge', 'import'] as const).map((action) => (
                      <button
                        key={action}
                        onClick={() =>
                          setDecisions((prev) => ({
                            ...prev,
                            [dup.incoming.phoneNumber]: action,
                          }))
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          decisions[dup.incoming.phoneNumber] === action
                            ? action === 'skip'
                              ? 'bg-gray-200 text-gray-800'
                              : action === 'merge'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {action === 'skip'
                          ? 'Skip'
                          : action === 'merge'
                            ? 'Merge'
                            : 'Import New'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setStep('upload');
                setUploadResult(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolveDuplicates}
              disabled={resolving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {resolving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm & Import
            </button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-16">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
          <p className="text-lg font-medium text-gray-700">
            Importing leads...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            This may take a moment for large files
          </p>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && uploadResult && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 p-16">
          <CheckCircle className="mb-4 h-12 w-12 text-green-600" />
          <p className="text-lg font-medium text-green-800">
            Import Complete!
          </p>
          <p className="mt-1 text-sm text-green-700">
            {uploadResult.validRows} leads imported from{' '}
            {uploadResult.totalRows} rows
          </p>
          <button
            onClick={() => router.push('/leads')}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            View Leads
          </button>
        </div>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-16">
          <XCircle className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-red-800">Import Failed</p>
          <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          <button
            onClick={() => {
              setStep('upload');
              setErrorMessage('');
              setUploadResult(null);
            }}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
