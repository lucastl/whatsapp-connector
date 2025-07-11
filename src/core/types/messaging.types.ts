export interface SurveyResponse {
  have_fiber?: string;
  mobile_plans?: string;
  location?: { latitude: number; longitude: number };
}

export interface MetaWebhookPayload {
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
