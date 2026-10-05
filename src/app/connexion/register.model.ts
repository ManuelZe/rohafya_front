export interface RegistrationRequest {
    administration: boolean;
    commission: boolean;
    connection: boolean;
    email: string;
    error: boolean;
    etat_patient: boolean;
    first_name: string;
    last_name: string;
    message: string | null;
    patient_request_connexion: boolean;
    patient_request_examen_out: boolean;
    patient_request_other_administration: boolean;
    patient_request_prix_examen: boolean;
    revendication_examen: boolean;
    suggestion: boolean;
}

export interface RegistrationFormData {
    first_name: string;
    last_name: string;
    email: string;
    message: string;
}

