import axios, { AxiosInstance } from 'axios';

import config from '@/config';

export const whatsappApi: AxiosInstance = axios.create({
  baseURL: config.whatsapp.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.whatsapp.apiToken}`,
  },
});
