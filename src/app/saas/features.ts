/**
 * Import des résultats médicaux par PDF (fichier ou scan) côté administrateur d'établissement.
 * Tant qu'il vaut `false`, tout ce qui concerne cette méthode est visible mais grisé dans /admin.
 * Pour ouvrir la fonctionnalité : passer à `true` ici ET définir EDEN_PDF_IMPORT_ENABLED=true
 * sur le serveur de l'API (sinon l'API refuse ces appels avec un 403).
 */
export const PDF_IMPORT_ENABLED = false;
