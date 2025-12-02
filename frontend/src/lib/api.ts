import axios from 'axios'

// --- Types ---
export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  role: string
  permission: string
  company?: {
    id: number
    name: string
    industry?: string
    description?: string
  }
  company_id?: number
}

export interface Model {
  id: number
  name: string
  description?: string
  status:
    | 'created'
    | 'uploading'
    | 'generating_data'
    | 'awaiting_validation'
    | 'training'
    | 'ready'
    | 'failed'
  accuracy?: string
  precision?: string
  recall?: string
  f1_score?: string
  created_at: string
  updated_at?: string
  thumbnail_url?: string
  is_public: boolean
  owner_id: number
  num_synthetic_images: number
}

export interface Image {
  id: number
  filename: string
  file_path: string
  image_type: 'real_normal' | 'real_defective' | 'synthetic'
  status: string
  inspection_model_id: number
  is_synthetic: boolean
  created_at: string
}

export interface TrainingJob {
  id: number
  job_type: string
  status: string
  progress: number
  current_stage?: string
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  celery_status?: string
  metrics?: any
}

export interface TrainingStatus {
  model_id: number
  has_training_job: boolean
  status: string
  training_job?: TrainingJob
}

export interface Invitation {
  id: number
  target_identifier: string
  permission: string
  status: string
  created_at: string
  expires_at: string
}

export interface Notification {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  related_id?: number
  related_type?: string
}

// --- Configuration ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('qc_leap_token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Don't redirect on 401 during login itself
      if (!window.location.pathname.includes('/')) {
        // Optional: Redirect to login or clear token
        // localStorage.removeItem('qc_leap_token')
        // window.location.href = '/'
      }
    }
    return Promise.reject(error.response?.data || error)
  }
)

// --- API Services ---

export const auth = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (response.access_token) {
      localStorage.setItem('qc_leap_token', response.access_token)
    }
    return response
  },
  register: async (
    email: string,
    username: string,
    password: string,
    full_name?: string,
    is_company_admin = false,
    company_data?: any
  ) => {
    return api.post('/auth/register', {
      email,
      username,
      password,
      full_name,
      is_company_admin,
      company_data,
    })
  },
  getCurrentUser: async (): Promise<User> => {
    return api.get('/users/me')
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qc_leap_token')
    }
  },
}

export const models = {
  list: async (): Promise<Model[]> => {
    return api.get('/models')
  },
  get: async (id: number): Promise<Model> => {
    return api.get(`/models/${id}`)
  },
  create: async (data: any) => {
    return api.post('/models', data)
  },
  update: async (id: number, data: Partial<Model>) => {
    return api.put(`/models/${id}`, data)
  },
  delete: async (id: number) => {
    return api.delete(`/models/${id}`)
  },
  startTraining: async (id: number) => {
    return api.post(`/models/${id}/start-training`)
  },
  generateSynthetic: async (id: number) => {
    return api.post(`/models/${id}/generate-synthetic`)
  },
  getTrainingStatus: async (id: number): Promise<TrainingStatus> => {
    return api.get(`/models/${id}/training-status`)
  },
  getStatistics: async (id: number) => {
    return api.get(`/models/${id}/statistics`)
  },
  getTrainingJobs: async (id: number): Promise<TrainingJob[]> => {
    return api.get(`/models/${id}/training-jobs`)
  },
  predictBatch: async (id: number, imagePaths: string[]) => {
    return api.post(`/models/${id}/predict-batch`, { image_paths: imagePaths })
  },
  upload: async (
    modelId: number,
    files: File[],
    type: 'normal' | 'defective'
  ): Promise<Image[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('image_type', type)
    return api.post(`/images/${modelId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const runs = {
  create: (modelId: number) => api.post(`/models/${modelId}/runs`),
  uploadImage: (runId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/runs/${runId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  execute: (runId: number) => api.post(`/runs/${runId}/execute`),
  list: (modelId: number) => api.get(`/models/${modelId}/runs`),
  get: (runId: number) => api.get(`/runs/${runId}`),
  getResults: (runId: number) => api.get(`/runs/${runId}/results`),
}

export const images = {
  list: async (modelId: number, type?: 'normal' | 'defective' | 'synthetic'): Promise<Image[]> => {
    const params = type ? { image_type: type } : {}
    return api.get(`/images/${modelId}/images`, { params })
  },
  upload: async (
    modelId: number,
    files: File[],
    type: 'normal' | 'defective'
  ): Promise<Image[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('image_type', type)
    return api.post(`/images/${modelId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadMasks: async (modelId: number, files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return api.post(`/images/${modelId}/upload-masks`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: async (imageId: number) => {
    return api.delete(`/images/${imageId}`)
  },
  getImageUrl: (imageId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('qc_leap_token') : ''
    return `${API_URL}/images/${imageId}/file?token=${token}&t=${new Date().getTime()}`
  },
}

export const annotations = {
  getByImage: async (imageId: number) => {
    return api.get(`/annotations/image/${imageId}`)
  },
  createManual: async (imageId: number, defectLabels: string, canvasData: any, notes?: string) => {
    return api.post('/annotations/manual', {
      image_id: imageId,
      defect_labels: defectLabels,
      canvas_data: canvasData,
      notes,
    })
  },
}

export const stats = {
  getOverview: async (days: number = 7) => {
    return api.get('/stats/overview', { params: { days } })
  },
}

export const invitations = {
  list: async (): Promise<Invitation[]> => {
    return api.get('/invitations')
  },
  create: async (targetIdentifier: string, permission: string, currentPassword: string) => {
    return api.post('/invitations', {
      target_identifier: targetIdentifier,
      permission,
      current_password: currentPassword,
    })
  },
  resend: async (id: number) => {
    return api.post(`/invitations/${id}/resend`)
  },
  revoke: async (id: number) => {
    return api.post(`/invitations/${id}/revoke`)
  },
  delete: async (id: number) => {
    return api.delete(`/invitations/${id}`)
  },
  accept: async (id: number) => {
    return api.post(`/invitations/${id}/accept`)
  },
  decline: async (id: number) => {
    return api.post(`/invitations/${id}/decline`)
  },
}

export const company = {
  getMembers: async () => {
    return api.get('/company/members')
  },
  updateCompany: async (
    name: string,
    industry: string,
    description: string,
    currentPassword: string
  ) => {
    return api.put(
      '/company/me',
      { name, industry, description },
      { params: { current_password: currentPassword } }
    )
  },
  updateMemberPermission: async (userId: number, permission: string, currentPassword: string) => {
    return api.put(`/company/members/${userId}/permission`, {
      permission,
      current_password: currentPassword,
    })
  },
  removeMember: async (userId: number, currentPassword: string) => {
    // Axios delete with body requires 'data' field
    return api.delete(`/company/members/${userId}`, { data: { current_password: currentPassword } })
  },
}

export const notifications = {
  list: async (unreadOnly = false, limit = 50): Promise<Notification[]> => {
    return api.get('/notifications', { params: { unread_only: unreadOnly, limit } })
  },
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/notifications/unread-count')
    return res.count
  },
  markAsRead: async (id: number) => {
    return api.post(`/notifications/${id}/read`)
  },
  markAllAsRead: async () => {
    return api.post('/notifications/read-all')
  },
}

export default api
