

export class SaveNotificationDto {
  title: string;
  body: string;
  message: string;
  code: string;
  profile?: string;
  clientTokens?: string[];
  therapistTokens?: string[];
}
