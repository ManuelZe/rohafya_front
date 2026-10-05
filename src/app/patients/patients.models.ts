export interface FacturesResponseApi {
  amount_to_pay: string;
  amount_to_pay_today: number;
  date: string;
  invoice_number: string;
  montant_assurance: string;
  montant_patient: number;
  reference: string;
  state: string;
  total_amount2: number;
  untaxed_amount: number;
  /** Établissement émetteur (mode SaaS, plusieurs établissements par patient). */
  establishment?: string | null;
}

export interface ExamenImagerie {
  establishment?: string | null,
  computed_age: string,
  conclusion: string,
  create_date: string,
  create_uid: string,
  date: string,
  doctor: string,
  done_by: string,
  done_date: string,
  error: string,
  expiration_date: string,
  id: number,
  indication: string,
  merge_id: string,
  nbr_days_before_expiration: number,
  number: string,
  order: string,
  patient: string,
  realisateur: string,
  rec_name: string,
  request_date: string,
  request_order: string,
  requested_test: string,
  requestor: string,
  resultat: string,
  serializer: string,
  serializer_current: string,
  service_cot: string,
  state: string,
  statut_expiration: boolean,
  technique: string,
  validated_by: string,
  validated_fed_id: string,
  validation_date: string,
}


export interface ExamensLab {
  establishment?: string | null,
  analytes_summary: string,
  date_analysis: string,
  date_requested: string,
  diagnosis: string,
  done_by: string,
  done_date: string,
  expiration_date: string,
  historize: boolean,
  id: number,
  macroscopie: string,
  matricule_patient: string,
  microscopie: string,
  name: string,
  nbr_days_before_expiration: number,
  patient: string,
  qr: string,
  rec_name: string,
  renseignements: string,
  request_order: number,
  requestor: string,
  results: string,
  serializer: string,
  serializer_current: string,
  state: string,
  statut_expiration: boolean,
  test: string,
  validated_by: string,
  validated_fed_id: string,
  validation_date:  string,
}


export interface ExplorationLab {
  establishment?: string | null,
  analytes_summary: string,
  commentaire: string,
  date_analysis: string,
  date_requested: string,
  diagnosis: string,
  done_by: string,
  done_date: string,
  error: string,
  expiration_date: string,
  historize: string,
  id: number,
  indication: string,
  matricule_patient: string,
  name: string,
  nbr_days_before_expiration: number,
  pathologist: string,
  patient: string,
  realisateur: string,
  rec_name: string,
  request_order: number,
  requestor: string,
  resultat: string,
  results: string,
  serializer: string,
  state: string,
  statut_expiration: boolean,
  technique: string,
  test: string,
  traitement: string,
  validated_by: string,
  validated_fed_id: string,
  validation_date: string,
}

export interface Prescriptions {
  Create_date: string,
  Description: string,
  NameDoctor: string,
  OrdreDoctor: string,
  Sequence: string,
  demande_devis: string,
  id: number,
  patient_id: number,
}

export interface Requetes {
  CreatedAt: string,
  CreatedBy: number,
  UpdatedAt: string,
  UpdatedBy: string,
  administration: string,
  commission: string,
  connection: string,
  email: string,
  error: string,
  etat_patient: string,
  first_name: string,
  id: number,
  last_name: string,
  message: string,
  patient_request_connexion: string,
  patient_request_examen_out: string,
  patient_request_other_administration: string,
  patient_request_prix_examen: string,
  revendication_examen: string,
  suggestion: string,
  valide: string,
}