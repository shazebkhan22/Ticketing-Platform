export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  fromName: string;
  secure: boolean;
  hasPassword: boolean;
}

export interface SmtpSettingsInput {
  host: string;
  port: number;
  username?: string;
  password?: string;
  fromAddress: string;
  fromName?: string;
  secure: boolean;
}
