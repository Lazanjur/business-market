// apps/web/src/lib/api/client.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Attach JWT from localStorage / cookie
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ib_access_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('ib_refresh_token');
        const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refresh_token: refresh });
        localStorage.setItem('ib_access_token', res.data.access_token);
        apiClient.defaults.headers['Authorization'] = `Bearer ${res.data.access_token}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('ib_access_token');
        localStorage.removeItem('ib_refresh_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: any) =>
    apiClient.post('/auth/register', data),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () =>
    apiClient.post('/auth/logout'),
  me: () =>
    apiClient.get('/auth/me'),
};

// ── LISTINGS ──────────────────────────────────────────────────────────────────
export const listingsApi = {
  list: (params?: any) =>
    apiClient.get('/marketplace/listings', { params }),
  get: (id: string) =>
    apiClient.get(`/marketplace/listings/${id}`),
  create: (data: any) =>
    apiClient.post('/marketplace/listings', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/marketplace/listings/${id}`, data),
  delete: (id: string) =>
    apiClient.delete(`/marketplace/listings/${id}`),
  deliveryCoverage: (listingId: string) =>
    apiClient.get(`/marketplace/search/listings/${listingId}/delivery-coverage`),
};

// ── LOCATION ──────────────────────────────────────────────────────────────────
export const locationApi = {
  list: (entityId: string) =>
    apiClient.get(`/entities/${entityId}/locations`),
  get: (entityId: string, locId: string) =>
    apiClient.get(`/entities/${entityId}/locations/${locId}`),
  create: (entityId: string, data: any) =>
    apiClient.post(`/entities/${entityId}/locations`, data),
  update: (entityId: string, locId: string, data: any) =>
    apiClient.patch(`/entities/${entityId}/locations/${locId}`, data),
  delete: (entityId: string, locId: string) =>
    apiClient.delete(`/entities/${entityId}/locations/${locId}`),
  setPrimary: (entityId: string, locId: string) =>
    apiClient.patch(`/entities/${entityId}/locations/${locId}/primary`),
  requestPostcard: (entityId: string, locId: string) =>
    apiClient.post(`/entities/${entityId}/locations/${locId}/verify/postcard`),
  confirmPostcard: (entityId: string, locId: string, code: string) =>
    apiClient.post(`/entities/${entityId}/locations/${locId}/verify/postcard/confirm`, { code }),
  uploadDocument: (entityId: string, locId: string, file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return apiClient.post(`/entities/${entityId}/locations/${locId}/verify/document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── GEO SEARCH ────────────────────────────────────────────────────────────────
export const geoSearchApi = {
  nearbySuppliers: (params: {
    lat: number; lng: number; radius_km: number;
    location_type?: string; category_id?: number;
    country_code?: string; verified_only?: boolean;
    limit?: number; offset?: number;
  }) =>
    apiClient.get('/marketplace/search/suppliers/nearby', { params }),

  mapViewport: (params: {
    bbox: string; location_type?: string;
    category_id?: number; verified_only?: boolean;
  }) =>
    apiClient.get('/marketplace/search/suppliers/map', { params }),

  heatmap: (categoryId?: number) =>
    apiClient.get('/marketplace/search/heatmap', { params: { category_id: categoryId } }),
};

// ── ORDERS ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: any) =>
    apiClient.get('/orders', { params }),
  get: (id: string) =>
    apiClient.get(`/orders/${id}`),
  create: (data: any) =>
    apiClient.post('/orders', data),
  confirm: (id: string) =>
    apiClient.patch(`/orders/${id}/confirm`),
  dispatch: (id: string, data: any) =>
    apiClient.patch(`/orders/${id}/dispatch`, data),
  markDelivered: (id: string) =>
    apiClient.patch(`/orders/${id}/delivered`),
  complete: (id: string) =>
    apiClient.patch(`/orders/${id}/complete`),
  dispute: (id: string, reason: string) =>
    apiClient.patch(`/orders/${id}/dispute`, { reason }),
};

// ── RFQ ───────────────────────────────────────────────────────────────────────
export const rfqApi = {
  list: (params?: any) =>
    apiClient.get('/marketplace/rfqs', { params }),
  get: (id: string) =>
    apiClient.get(`/marketplace/rfqs/${id}`),
  create: (data: any) =>
    apiClient.post('/marketplace/rfqs', data),
  respond: (rfqId: string, data: any) =>
    apiClient.post(`/marketplace/rfqs/${rfqId}/responses`, data),
  award: (rfqId: string, responseId: string) =>
    apiClient.patch(`/marketplace/rfqs/${rfqId}/award/${responseId}`),
  close: (rfqId: string) =>
    apiClient.patch(`/marketplace/rfqs/${rfqId}/close`),
};

// ── PROCUREMENT ───────────────────────────────────────────────────────────────
export const procurementApi = {
  listTenders: (params?: any) =>
    apiClient.get('/marketplace/tenders', { params }),
  getTender: (id: string) =>
    apiClient.get(`/marketplace/tenders/${id}`),
  createTender: (data: any) =>
    apiClient.post('/marketplace/tenders', data),
  submitBid: (tenderId: string, data: any) =>
    apiClient.post(`/marketplace/tenders/${tenderId}/bids`, data),
  awardTender: (tenderId: string, bidId: string) =>
    apiClient.patch(`/marketplace/tenders/${tenderId}/award/${bidId}`),
};

// ── MESSAGING ─────────────────────────────────────────────────────────────────
export const messagingApi = {
  conversations: () =>
    apiClient.get('/conversations'),
  getConversation: (id: string) =>
    apiClient.get(`/conversations/${id}`),
  sendMessage: (conversationId: string, data: any) =>
    apiClient.post(`/conversations/${conversationId}/messages`, data),
  startConversation: (entityId: string, data: any) =>
    apiClient.post('/conversations', { recipient_id: entityId, ...data }),
};

export default apiClient;
