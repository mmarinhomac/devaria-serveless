import { Handler, APIGatewayEvent } from "aws-lambda";

import { passwordRegex, emailRegex } from "../constants/regex";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { UserRegisterRequest } from "../types/auth/UserRegisterRequest";
import { ConfirmEmailRequest } from "../types/auth/ConfirmEmailRequest";
import { CognitoServices } from "../services/cognitoServices";

export const register: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      return formatDefaultResponse(500, "Cognito Environments não encontradas");
    }
    if (!event.body) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const request = JSON.parse(event.body) as UserRegisterRequest;
    const { email, password, name } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, "Email inválido");
    }
    if (!password || !password.match(passwordRegex)) {
      return formatDefaultResponse(
        400,
        "Senha inválida, senha deve conter pelo menos um caractér maiúsculo, minúsculo, numérico e especial, além de ter pelo menos oito dígitos."
      );
    }
    if (!name || name.trim().length < 2) {
      return formatDefaultResponse(400, "Nome inválido");
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).signUp(
      email,
      password
    );
    return formatDefaultResponse(
      200,
      "Usuario cadastrado com sucesso, verifique seu email para confirmar o codigo!"
    );
  } catch (error) {
    console.log("Error on register user:", error);
    return formatDefaultResponse(500, "Erro ao cadastrar usuário!");
  }
};

export const confirmEmail: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      return formatDefaultResponse(500, "Cognito Environments não encontradas");
    }
    if (!event.body) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const request = JSON.parse(event.body) as ConfirmEmailRequest;
    const { email, verificationCode } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, "Email inválido");
    }

    if (!verificationCode || verificationCode.length !== 6) {
      return formatDefaultResponse(400, "Código inválido");
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).confirmEmail(
      email,
      verificationCode
    );
    return formatDefaultResponse(200, "Usuario verificado com sucesso!");
  } catch (error) {
    console.log("Error on confirm user:", error);
    return formatDefaultResponse(500, "Erro ao confirmar usuário!");
  }
};
