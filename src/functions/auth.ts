import { Handler, APIGatewayEvent } from "aws-lambda";
import { parse } from "aws-multipart-parser";
import { FileData } from "aws-multipart-parser/dist/models";

import {
  passwordRegex,
  emailRegex,
  imageAllowedExtensions,
} from "../constants/regex";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { UserRegisterRequest } from "../types/auth/UserRegisterRequest";
import { ConfirmEmailRequest } from "../types/auth/ConfirmEmailRequest";
import { CognitoServices } from "../services/cognitoServices";
import { UserModel } from "../models/UserModel";
import { User } from "../types/models/User";
import { S3Services } from "../services/s3Services";
import { ChangePasswordRequest } from "../types/auth/ChangePasswordRequest";

export const register: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, USER_TABLE, AVATAR_BUCKET } =
      process.env;

    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      return formatDefaultResponse(500, "Cognito Environments não encontradas");
    }

    if (!USER_TABLE) {
      return formatDefaultResponse(
        500,
        "DynamoDB Environments não encontradas"
      );
    }

    if (!AVATAR_BUCKET) {
      return formatDefaultResponse(
        500,
        "S3Bucket Environments não encontradas"
      );
    }

    if (!event.body) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const formData = parse(event, true);
    const file = formData.file as FileData;

    const email = formData.email as string;
    const name = formData.name as string;
    const password = formData.password as string;

    if (file && !imageAllowedExtensions.exec(file.filename)) {
      return formatDefaultResponse(
        400,
        "Imagem do avatar deve ser somente das seguintes extensões: .jpeg/.jpg/.png/.gif "
      );
    }
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

    const cognitoUser = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).signUp(email, password);

    let key = "";
    if (file) {
      key = await new S3Services().saveImage(AVATAR_BUCKET, "avatar", file);
    }

    const user = {
      name,
      email,
      avatar: key,
      cognitoId: cognitoUser.userSub,
    } as User;

    await UserModel.create(user);

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

export const forgotPassword: Handler = async (
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

    const request = JSON.parse(event.body);
    const { email } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, "Email inválido");
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).forgotPassword(
      email
    );
    return formatDefaultResponse(
      200,
      "Enviamos um email para cadastro de nova senha!"
    );
  } catch (error) {
    console.log("Error on confirm user:", error);
    return formatDefaultResponse(
      500,
      "Erro ao solicitar email de esqueci a senha:",
      error
    );
  }
};

export const changePassword: Handler = async (
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

    const request = JSON.parse(event.body) as ChangePasswordRequest;
    const { email, verificationCode, password } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, "Email inválido");
    }
    if (!verificationCode || verificationCode.length !== 6) {
      return formatDefaultResponse(400, "Código de confirmação inválido");
    }
    if (!password || !password.match(passwordRegex)) {
      return formatDefaultResponse(
        400,
        "Senha inválida, senha deve conter pelo menos um caractér maiúsculo, minúsculo, numérico e especial, além de ter pelo menos oito dígitos."
      );
    }

    const result = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).confirmPassword(email, password, verificationCode);
    return formatDefaultResponse(200, result);
  } catch (error) {
    console.log("Error on confirm user:", error);
    return formatDefaultResponse(
      500,
      "Erro ao confirmar email do usuário:",
      error
    );
  }
};
