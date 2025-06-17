import axios, { AxiosInstance, AxiosResponse } from 'axios';
import config from '../../config';

// Creamos una instancia de Axios con la configuración base para la API de WhatsApp
const whatsappApi: AxiosInstance = axios.create({
  baseURL: config.whatsapp.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.whatsapp.apiToken}`,
  },
});

// Podríamos crear más instancias para otras APIs (ej. Resend, si no usáramos su SDK)

export const httpClient = {
  post: <T>(url: string, data: any): Promise<AxiosResponse<T>> => {
    return whatsappApi.post<T>(url, data);
  },
  // Podríamos añadir get, put, delete, etc. si los necesitáramos
};