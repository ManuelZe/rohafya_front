export interface SendMatriculeResponse {
    message: string,
    user_email: string,
    username: string  // en supposant que tu corriges la clé côté Flask
}

export interface SendMatriculeErrorResponse {
    message: string
}

