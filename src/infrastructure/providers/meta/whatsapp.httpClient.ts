import { AxiosResponse } from 'axios';

import { whatsappApi } from './whatsapp.client'; // <-- Importa la instancia

export interface IWhatsappHttpClient {
  post<T, D = unknown>(url: string, data: D): Promise<AxiosResponse<T>>;
}

export const whatsappHttpClient: IWhatsappHttpClient = {
  post: <T, D = unknown>(url: string, data: D): Promise<AxiosResponse<T>> => {
    return whatsappApi.post<T>(url, data);
  },
};
