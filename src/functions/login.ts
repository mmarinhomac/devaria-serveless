import { Handler, APIGatewayEvent } from "aws-lambda";

import { CognitoServices } from "../services/cognitoServices";
import { LoginRequest } from "../types/login/LoginRequest";
import { validateEnvs } from "../utils/environmentUtils";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs([
      "USER_POOL_ID",
      "USER_POOL_CLIENT_ID",
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    if (!event.body) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const request = JSON.parse(event.body) as LoginRequest;
    const { email, password } = request;

    if (!email || !password) {
      return formatDefaultResponse(400, "Favor informar usuário e senha");
    }

    const response = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).login(email, password);

    return formatDefaultResponse(200, null, response);
  } catch (e: any) {
    console.log("Error on login user: ", e);
    return formatDefaultResponse(500, "Erro ao aunteticar usuário: " + e);
  }
};
