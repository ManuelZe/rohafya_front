export type ExamType = 'Laboratoire' | 'Imagerie' | 'Exploration';

export const EXAM_TYPES: ExamType[] = ['Laboratoire', 'Imagerie', 'Exploration'];

export interface SendResult {
  id: number;
  doctor_id: number;
  patient_id: number;
  exam_type: ExamType;
  exam_code: string;
  patient_federation_id: string;
  envoi_email: boolean;
  sended_at: string;
}

export interface SendResultCreatePayload {
  doctor_id: number;
  exam_type: ExamType;
  exam_code: string;
  envoi_email?: boolean;
}

export interface SendResultUpdatePayload {
  doctor_id?: number;
  exam_type?: ExamType;
  exam_code?: string;
  patient_federation_id?: string;
}

export type ExamResultDetail = Record<string, string | number | boolean | null>;
