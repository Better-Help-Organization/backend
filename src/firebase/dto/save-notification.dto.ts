

export class SaveNotificationDto {
  title: string;
  body: string;
  message: string;
  code: string;
  clientTokens?: string[];
  therapistTokens?: string[];
}
