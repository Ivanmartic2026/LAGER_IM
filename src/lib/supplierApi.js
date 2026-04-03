const APP_ID = import.meta.env.VITE_BASE44_APP_ID;
const FUNCTIONS_BASE = `https://app--${APP_ID}.base44.app/functions`;

export async function supplierFetch(functionName, body) {
  const res = await fetch(`${FUNCTIONS_BASE}/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

export async function supplierUploadFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('token', token);

  const res = await fetch(`${FUNCTIONS_BASE}/supplierUploadFile`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
  return data;
}