import { ConfirmEmailRequest } from "./ConfirmEmailRequest";

export type ChangePasswordRequest = ConfirmEmailRequest & {
  password: string;
};
