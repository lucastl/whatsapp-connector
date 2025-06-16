import axios from 'axios';
import { triggerWhatsappFlow } from '../../core/services/whatsapp.service';
import config from '../../config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsApp Service', () => {

  describe('triggerWhatsappFlow', () => {

    it('should call the Meta API with the correct payload', async () => {
      const customerPhone = '5491122334455';
      const expectedUrl = `https://graph.facebook.com/v19.0/${config.whatsapp.phoneNumberId}/messages`;
      
      const expectedPayload = {
        messaging_product: 'whatsapp',
        to: customerPhone,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: { type: 'text', text: 'Encuesta Rápida de Interés' },
          body: { text: 'Por favor, tómate un minuto para completar nuestra encuesta y poder atenderte mejor.' },
          footer: { text: 'Haz clic en el botón para comenzar 👇' },
          action: {
            name: 'survey',
            parameters: {},
          },
        },
      };

      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      await triggerWhatsappFlow(customerPhone);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expectedUrl,
        expectedPayload,
        {
          headers: {
            Authorization: `Bearer ${config.whatsapp.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

  });

});