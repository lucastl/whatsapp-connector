export interface FlowResponse {
  product_interest: string;
  best_time_to_call: string;
}

export interface WhatsappWebhookPayload {
  object: string;
  entry: {
    changes: {
      field: string;
      value: {
        messages: {
          from: string;
          type: 'interactive';
          interactive: {
            type: 'nfm_reply';
            nfm_reply: {
              response_json: string;
            };
          };
        }[];
      };
    }[];
  }[];
}