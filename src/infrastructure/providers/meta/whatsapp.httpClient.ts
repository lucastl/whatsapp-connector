import { AxiosResponse } from 'axios';

import { whatsappApi } from './whatsapp.client'; // <-- Importa la instancia

export const whatsappHttpClient = {
  post: <T, D = unknown>(url: string, data: D): Promise<AxiosResponse<T>> => {
    return whatsappApi.post<T>(url, data);
  },
};
