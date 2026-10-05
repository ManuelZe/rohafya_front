export interface NotificationType {
  id: number;
  name: string;
  description: string | null;
}

export interface NotificationEtiquette {
  id: number;
  name: string;
  description: string | null;
}

export interface AppNotification {
  id: number;
  user_id: number | null;
  title: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string | null;
  read_at: string | null;
  all_users: boolean;
  types: number | null;
  etiquettes?: NotificationEtiquette[];
}
