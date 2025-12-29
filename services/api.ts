
/**
 * SnoopWerk API Service (Railway Backend Optimized)
 */

const API_BASE = '/api/v1';

const getSessionId = () => {
  let sessionId = localStorage.getItem('snoopwerk_session_id');
  if (!sessionId) {
    sessionId = `anon_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('snoopwerk_session_id', sessionId);
  }
  return sessionId;
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}, retries = 3): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Session-ID': getSessionId(),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || `Status ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (retries > 0) return apiRequest(endpoint, options, retries - 1);
    throw error;
  }
}

export const fetchCredits = async (email?: string) => {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return apiRequest<any>(`/user/credits${query}`);
};

export const generateAIImage = async (prompt: string, aspectRatio: string = "1:1") => {
  return apiRequest<{ imageUrl: string; credits: any }>('/ai/generate-image', {
    method: 'POST',
    body: JSON.stringify({ prompt, aspectRatio })
  });
};

export const removeBackground = async (image: string) => {
  return apiRequest<{ imageUrl: string; maskUrl: string; credits: any }>('/ai/remove-bg', {
    method: 'POST',
    body: JSON.stringify({ image })
  });
};

export const editAIImage = async (image: string, prompt: string) => {
  return apiRequest<{ imageUrl: string; credits: any }>('/ai/edit-image', {
    method: 'POST',
    body: JSON.stringify({ image, prompt })
  });
};

export const upscaleImage = async (image: string) => {
  return apiRequest<{ imageUrl: string; credits: any }>('/ai/upscale', {
    method: 'POST',
    body: JSON.stringify({ image })
  });
};

export const generateTextContent = async (prompt: string, systemInstruction: string) => {
  return apiRequest<{ text: string; credits: any }>('/ai/generate-text', {
    method: 'POST',
    body: JSON.stringify({ prompt, systemInstruction })
  });
};

export const analyzeMultimodalContent = async (sourceType: string, sourceValue: string, systemInstruction: string) => {
  return apiRequest<{ summary: string; credits: any }>('/ai/analyze-content', {
    method: 'POST',
    body: JSON.stringify({ sourceType, sourceValue, systemInstruction })
  });
};
