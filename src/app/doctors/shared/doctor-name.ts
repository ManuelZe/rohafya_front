/** Les prénoms importés de GNU Health contiennent parfois déjà le titre (« Dr. EYOUP SEN ») :
 *  on le retire avant d'ajouter notre propre « Dr » pour éviter « Dr Dr. … ». */
export function stripDoctorTitle(value: string | null | undefined): string {
  return (value ?? '').replace(/^\s*(dr\.?|docteur)\s+/i, '').trim();
}
