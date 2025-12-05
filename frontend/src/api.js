import axios from 'axios';

const API_BASE = 'http://localhost:4000';

export async function submitCode({ language, code, stdin }) {
  const res = await axios.post(`${API_BASE}/api/submit`, {
    language,
    code,
    stdin
  });
  return res.data;
}

export async function getJobStatus(jobId) {
  const res = await axios.get(`${API_BASE}/api/status/${jobId}`);
  return res.data;
}
