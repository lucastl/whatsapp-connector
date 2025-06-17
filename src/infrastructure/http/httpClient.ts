import axios, { AxiosInstance, AxiosResponse } from 'axios';
import config from '../../config';

const whatsappApi: AxiosInstance = axios.create({
  baseURL: config.whatsapp.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.whatsapp.apiToken}`,
  },
});

export const httpClient = {
  post: <T>(url: string, data: any): Promise<AxiosResponse<T>> => {
    return whatsappApi.post<T>(url, data);
  },
};