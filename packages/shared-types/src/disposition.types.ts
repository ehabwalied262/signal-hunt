export enum DispositionType {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALLBACK = 'CALLBACK',
  WRONG_NUMBER = 'WRONG_NUMBER',
  NO_ANSWER = 'NO_ANSWER',
  VOICEMAIL = 'VOICEMAIL',
  GATEKEEPER = 'GATEKEEPER',
  OPT_OUT = 'OPT_OUT',
  OTHER = 'OTHER',
}

export interface Disposition {
  id: string;
  callId: string;
  type: DispositionType;
  notes: string | null;
  painPoints: string | null;
  callbackScheduledAt: string | null;
  createdAt: string;
}

export interface CreateDispositionRequest {
  callId: string;
  type: DispositionType;
  notes?: string;
  painPoints?: string;
  callbackScheduledAt?: string;
}

/**
 * Labels for disposition types in the UI
 */
export const DISPOSITION_LABELS: Record<DispositionType, string> = {
  [DispositionType.INTERESTED]: 'Interested',
  [DispositionType.NOT_INTERESTED]: 'Not Interested',
  [DispositionType.CALLBACK]: 'Schedule Callback',
  [DispositionType.WRONG_NUMBER]: 'Wrong Number',
  [DispositionType.NO_ANSWER]: 'No Answer',
  [DispositionType.VOICEMAIL]: 'Voicemail',
  [DispositionType.GATEKEEPER]: 'Gatekeeper',
  [DispositionType.OPT_OUT]: 'Opt Out',
  [DispositionType.OTHER]: 'Other',
};
