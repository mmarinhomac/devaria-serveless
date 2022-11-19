import { Handler } from "aws-lambda";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { getUserIdFromEvent } from "../utils/authenticationHandlerUtils";
import { validateEnvs } from "../utils/environmentUtils";
import { UserModel } from "../models/UserModel";
import { logger } from "../utils/loggerUtils";

export const toggle: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { error } = validateEnvs(["USER_TABLE"]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const loggedUser = await UserModel.get({ cognitoId: userId });
    if (!loggedUser) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const { followId } = event.pathParameters;
    if (!followId) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    if (loggedUser === followId) {
      return formatDefaultResponse(400, "Usuário não pode se seguir.");
    }

    const toFollowingUser = await UserModel.get({ cognitoId: followId });
    if (!toFollowingUser) {
      return formatDefaultResponse(400, "Usuário a seguir não encontrado");
    }

    const hasFollow = loggedUser.following.findIndex(
      (e: any) => e.toString() === followId
    );

    if (hasFollow != -1) {
      loggedUser.following.splice(hasFollow, 1);
      toFollowingUser.followers = toFollowingUser.followers - 1;

      await UserModel.update(loggedUser);
      await UserModel.update(toFollowingUser);

      return formatDefaultResponse(200, "Você não segue mais este usuário");
    } else {
      loggedUser.following.push(followId);
      toFollowingUser.followers = toFollowingUser.followers + 1;

      await UserModel.update(loggedUser);
      await UserModel.update(toFollowingUser);

      return formatDefaultResponse(200, "Usuario seguido com sucesso");
    }
  } catch (e: any) {
    logger.error("Error on toogle follow: ", e);
    return formatDefaultResponse(500, "Erro ao seguir/desseguir usuário: " + e);
  }
};
