// src/pages/Settings.jsx
import React, { useState, useRef } from "react";
import { Download, Upload, Database, AlertCircle, CheckCircle, Info } from "lucide-react";
import storage from "../utils/storage";

export default function Settings() {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExportData = () => {
    setLoading(true);
    try {
      const result = storage.downloadDataAsFile();
      if (result.success) {
        showMessage('success', result.message);
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      showMessage('error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await storage.uploadDataFromFile(file);
      if (result.success) {
        showMessage('success', result.message);
        // Reload page after successful import
        setTimeout(() => window.location.reload(), 2000);
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      showMessage('error', 'Failed to import data');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear ALL data? This action cannot be undone!')) {
      setLoading(true);
      try {
        storage.clear();
        showMessage('success', 'All data cleared successfully');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        showMessage('error', 'Failed to clear data');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Settings</h2>

      {/* Message Alert */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' && <CheckCircle size={20} />}
          {message.type === 'error' && <AlertCircle size={20} />}
          {message.type === 'info' && <Info size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Data Transfer Section */}
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="text-blue-600" size={24} />
          <h3 className="text-xl font-semibold text-gray-900">Data Transfer</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Transfer your CounseLink data between different systems or browsers. Export your data to a JSON file, 
          then import it on another system to continue where you left off.
        </p>

        <div className="space-y-4">
          {/* Export Data */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Export Data</h4>
                <p className="text-sm text-gray-600">
                  Download all your data (users, appointments, messages, etc.) as a JSON file. 
                  Use this file to transfer your data to another system.
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={loading}
                className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>

          {/* Import Data */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Import Data</h4>
                <p className="text-sm text-gray-600">
                  Upload a previously exported JSON file to restore your data. 
                  This will merge with existing data. You'll need to log in again after import.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-file"
                  disabled={loading}
                />
                <label
                  htmlFor="import-file"
                  className={`ml-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload size={18} />
                  Import
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 p-6 rounded-xl shadow">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-red-600" size={24} />
          <h3 className="text-xl font-semibold text-gray-900">Danger Zone</h3>
        </div>
        
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Clear All Data</h4>
              <p className="text-sm text-gray-600">
                Permanently delete all data from this browser. This action cannot be undone. 
                Make sure to export your data first if you want to keep it.
              </p>
            </div>
            <button
              onClick={handleClearData}
              disabled={loading}
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How to transfer data between systems:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>On your current system, click "Export" to download your data</li>
              <li>Transfer the downloaded JSON file to your new system (via email, USB drive, cloud storage, etc.)</li>
              <li>On the new system, open CounseLink and go to Settings</li>
              <li>Click "Import" and select the JSON file you transferred</li>
              <li>Log in again with your credentials</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}