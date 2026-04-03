import { base44 } from '@/api/base44Client';

export async function supplierFetch(functionName, body) {
  const response = await base44.functions.invoke(functionName, body);
  return response.data;
}

export async function supplierUploadFile(file, token) {
  const APP_ID = import.meta.env.VITE_BASE44_APP_ID;
  const BASE_URL = `https://app--${APP_ID}.base44.app/api/functions`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('token', token);

  const res = await fetch(`${BASE_URL}/supplierUploadFile`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
  return data;
}