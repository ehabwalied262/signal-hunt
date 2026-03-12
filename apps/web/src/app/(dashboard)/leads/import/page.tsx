'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

/**
 * CSV Import page — Phase 2 implementation.
 * Placeholder with upload UI structure.
 */
export default function ImportPage() {
  const [dragActive, setDragActive] = useState(false);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Import Leads</h1>

      {/* Upload zone */}
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
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          // TODO: Handle file drop in Phase 2
        }}
      >
        <FileSpreadsheet className="mb-4 h-12 w-12 text-gray-300" />
        <p className="mb-2 text-lg font-medium text-gray-700">
          Drop your CSV file here
        </p>
        <p className="mb-4 text-sm text-gray-500">
          or click to browse files
        </p>
        <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          <Upload className="mr-2 inline h-4 w-4" />
          Choose File
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              // TODO: Handle file selection in Phase 2
              console.log(e.target.files);
            }}
          />
        </label>
      </div>

      {/* Expected format */}
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
          <span className="rounded bg-gray-50 px-2 py-1">
            Headcount Growth 6m
          </span>
          <span className="rounded bg-gray-50 px-2 py-1">
            Headcount Growth 12m
          </span>
          <span className="rounded bg-gray-50 px-2 py-1">
            Company Overview
          </span>
        </div>
      </div>
    </div>
  );
}
