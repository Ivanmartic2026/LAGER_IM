import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, FileText, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SupplierDocumentUpload() {
  const [token, setToken] = useState('');
  const [requestData, setRequestData] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      loadRequestData(tokenParam);
    } else {
      setLoading(false);
    }
  }, []);

  const loadRequestData = async (tokenValue) => {
    try {
      const requests = await base44.entities.SupplierDocumentRequest.filter({ request_token: tokenValue });
      if (requests.length > 0) {
        setRequestData(requests[0]);
      }
    } catch (error) {
      console.error('Error loading request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedResults = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', token);
        const response = await base44.functions.invoke('supplierUploadFile', formData);
        uploadedResults.push({ url: response.data.file_url, name: file.name });
      }
      setUploadedFiles(prev => [...prev, ...uploadedResults]);
      toast.success(`${files.length} fil(er) uppladdade`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Kunde inte ladda upp filer');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (urlToRemove) => {
    setUploadedFiles(prev => prev.filter(file => file.url !== urlToRemove));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setUploading(true);
    try {
      const response = await base44.functions.invoke('uploadSupplierDocuments', {
        token: token,
        file_urls: uploadedFiles.map(f => f.url),
        notes: notes
      });

      if (response.data.success) {
        setSubmitted(true);
        toast.success('Documents submitted successfully!');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit documents');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-slate-400">The upload link is invalid or missing.</p>
        </div>
      </div>
    );
  }

  if (!requestData && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Request Not Found</h1>
          <p className="text-slate-400">The document request could not be found.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-8 h-8 text-green-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Documents Submitted!</h1>
          <p className="text-slate-400 mb-6">
            Thank you for providing the requested documentation. We have received your files and will process them shortly.
          </p>
          <div className="text-sm text-slate-500">
            You can now close this window.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Documentation Upload - IMvision
            </h1>
            <p className="text-blue-100 text-sm">
              Please upload the requested documentation for the following article
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Article Info */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-3">Article Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Article Name:</span>
                  <span className="text-white font-medium">{requestData?.article_name}</span>
                </div>
                {requestData?.article_batch_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batch Number:</span>
                    <span className="text-white font-medium">{requestData.article_batch_number}</span>
                  </div>
                )}
                {requestData?.supplier_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Supplier:</span>
                    <span className="text-white font-medium">{requestData.supplier_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Documentation Request */}
            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
              <h2 className="text-lg font-semibold text-blue-300 mb-3">Documentation Request</h2>
              <div className="text-sm text-slate-300 space-y-2">
                <p>
                  We kindly request supplementary documentation regarding the relevant purchase, including the corresponding invoice, in order for us to reference the correct installation/delivery in our system.
                </p>
                <p>
                  If available, please also include the project name and any relevant product images, as this will help us ensure accurate identification and traceability.
                </p>
                <p>
                  We would appreciate it if you could provide the requested documentation at your earliest convenience.
                </p>
              </div>
            </div>

            {/* Upload Area */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Upload Documents</h2>
              <p className="text-sm text-slate-400 mb-4">
                Please upload invoices, documentation, and any relevant product images.
              </p>
              
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500 bg-slate-900/50 cursor-pointer transition-all group"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <span className="text-slate-400">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    <div className="text-center">
                      <span className="text-white font-medium">Click to upload files</span>
                      <p className="text-sm text-slate-400 mt-1">or drag and drop</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Uploaded Files ({uploadedFiles.length})</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="text-white text-sm truncate max-w-xs">{file.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(file.url)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h3 className="text-white font-semibold mb-2">Additional Notes (Optional)</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes about the uploaded documents..."
                className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={uploading || uploadedFiles.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Submit Documents
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}