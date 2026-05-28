export interface PushDeliveryPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushDeliveryResult {
  delivered: number;
  failed: number;
  provider: string;
}

export interface PushProvider {
  send(tokens: string[], payload: PushDeliveryPayload): Promise<PushDeliveryResult>;
}
