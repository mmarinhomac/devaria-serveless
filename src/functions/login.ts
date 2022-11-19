import { Handler, APIGatewayEvent } from "aws-lambda";

import { CognitoServices } from "../services/cognitoServices";
import { LoginRequest } from "../types/login/LoginRequest";
import { validateEnvs } from "../utils/environmentUtils";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { logger } from "../utils/loggerUtils";

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs([
      "USER_POOL_ID",
      "USER_POOL_CLIENT_ID",
    ]);

    if (error) {
      logger.error("login.handler - ", error);
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

    logger.info("login.handler - start: ", email);
    const response = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).login(email, password);
    logger.debug("login.handler - cognito response: ", response);
    logger.info("login.handler - finish: ", email);

    return formatDefaultResponse(200, null, response);
  } catch (e: any) {
    logger.error("login.handler - Error on login user: ", e);
    return formatDefaultResponse(500, "Erro ao aunteticar usuário: " + e);
  }
};
