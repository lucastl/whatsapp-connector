import { AxiosResponse } from 'axios';

import { whatsappApi } from './axios.client'; // <-- Importa la instancia

export const httpClient = {
  post: <T, D = unknown>(url: string, data: D): Promise<AxiosResponse<T>> => {
    return whatsappApi.post<T>(url, data);
  },
};
