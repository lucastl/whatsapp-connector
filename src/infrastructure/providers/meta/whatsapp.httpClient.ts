import { AxiosResponse } from 'axios';

import { SERVICE_NAMES } from '@/config/constants';
import { externalApiRequestDurationSeconds } from '@/infrastructure/monitoring/metrics';

import { whatsappApi } from './whatsapp.client'; // <-- Importa la instancia

export interface IWhatsappHttpClient {
  post<T, D = unknown>(url: string, data: D): Promise<AxiosResponse<T>>;
}

export const whatsappHttpClient: IWhatsappHttpClient = {
  post: async <T, D = unknown>(url: string, data: D): Promise<AxiosResponse<T>> => {
    const end = externalApiRequestDurationSeconds.startTimer({ service: SERVICE_NAMES.META });
    try {
      return await whatsappApi.post<T>(url, data);
    } finally {
      end();
    }
  },
};
