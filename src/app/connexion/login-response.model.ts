export interface Role {
  id: number;
  name: string;
}

export interface LoginApiResponse {
  access_token: string;
  data: {
    id: number;
    doctor_id: number | null;
    patient_id: number | null;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    roles: Role[];
    // 'password' volontairement omis : on ne veut pas qu'Angular y touche
  };
}

export interface LoginErrorResponse {
  message: string;  // en supposant que tu corriges la clé côté Flask
}

export interface DeconnexionApiResponse {
  "Message ": string;
}




