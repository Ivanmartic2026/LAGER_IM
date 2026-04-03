const APP_ID = import.meta.env.VITE_BASE44_APP_ID;

function getFunctionsBase() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/functions`;
  }
  return `/functions`;
}

export async function supplierFetch(functionName, body) {
  const functionsBase = getFunctionsBase();
  const res = await fetch(`${functionsBase}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Id': APP_ID,
    },
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

  const functionsBase = getFunctionsBase();
  const res = await fetch(`${functionsBase}/supplierUploadFile`, {
    method: 'POST',
    headers: { 'X-App-Id': APP_ID },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Upload failed: ${res.status}`);
  return data;
}