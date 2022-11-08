import { APIGatewayEvent, Context, Handler } from "aws-lambda";

import { S3Services } from "../services/s3Services";
import { UserModel } from "../models/UserModel";
import { getUserIdFromEvent } from "../utils/authenticationHandlerUtils";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";

export const me: Handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET } = process.env;
    if (!AVATAR_BUCKET) {
      return formatDefaultResponse(500, "Bucket de avatares não informado");
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const result = await UserModel.get({ cognitoId: userId });
    if (result && result.avatar) {
      const url = await new S3Services().getImageUrl(
        AVATAR_BUCKET,
        result.avatar
      );
      result.avatar = url;
    }

    return formatDefaultResponse(200, null, result);
  } catch (e) {
    console.log("Error on get user data: ", e);
    return formatDefaultResponse(500, "Erro ao buscar dados do usuário: " + e);
  }
};
