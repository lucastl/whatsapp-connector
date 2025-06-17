import { AxiosResponse } from 'axios';
import { whatsappApi } from './axios.client'; // <-- Importa la instancia

export const httpClient = {
  post: <T>(url: string, data: any): Promise<AxiosResponse<T>> => {
    return whatsappApi.post<T>(url, data);
  },
};