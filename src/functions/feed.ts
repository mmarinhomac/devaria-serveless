import { Handler } from "aws-lambda";

import { PostModel } from "../models/PostModel";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { getUserIdFromEvent } from "../utils/authenticationHandlerUtils";
import { validateEnvs } from "../utils/environmentUtils";
import { UserModel } from "../models/UserModel";
import { S3Services } from "../services/s3Services";
import { FeedLastKeyRequest } from "../types/feed/FeedLastKeyRequest";
import { DefaultListPaginatedResponse } from "../types/DefaultListPaginatedResponse";
import { logger } from "../utils/loggerUtils";

export const getByUser: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { POST_BUCKET, error } = validateEnvs(["USER_TABLE", "POST_BUCKET"]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const { userId } = event.pathParameters || {
      userId: getUserIdFromEvent(event),
    };

    const params = (event.queryStringParameters || null) as FeedLastKeyRequest;
    if (!userId) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const user = await UserModel.get({ cognitoId: userId });
    if (!user) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const query = PostModel.query({ userId: userId }).sort("descending");
    if (params && params.id && params.userId && params.date) {
      query.startAt(params);
    }
    const result = await query.limit(1).exec();

    let response = {} as DefaultListPaginatedResponse;
    if (result) {
      response.count = result.count;
      response.lastkey = result.lastKey;
      for (const document of result) {
        if (document && document.image) {
          document.image = await new S3Services().getImageUrl(
            POST_BUCKET,
            document.image
          );
        }
      }
      response.data = result;
    }
    return formatDefaultResponse(200, null, response);
  } catch (e) {
    logger.error("Error on get user feed: ", e);
    return formatDefaultResponse(500, "Erro ao buscar feed do usuário: " + e);
  }
};

export const getHome: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { POST_BUCKET, error } = validateEnvs(["USER_TABLE", "POST_BUCKET"]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);
    const { lastKey } = event.queryStringParameters || "";
    if (!userId) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const user = await UserModel.get({ cognitoId: userId });
    if (!user) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const usersToFeed = user.following;
    usersToFeed.push(userId);
    const query = PostModel.scan("userId").in(usersToFeed);
    if (lastKey) {
      query.startAt({ id: lastKey });
    }

    const result = await query.limit(20).exec();
    let response = {} as DefaultListPaginatedResponse;
    if (result) {
      response.count = result.count;
      response.lastkey = result.lastKey;

      for (const document of result) {
        if (document && document.image) {
          const url = await new S3Services().getImageUrl(
            POST_BUCKET,
            document.image
          );
          document.image = url;
        }
      }
      response.data = result;
    }
    return formatDefaultResponse(200, null, response);
  } catch (e) {
    logger.error("Error on get home feed: ", e);
    return formatDefaultResponse(500, "Erro ao buscar feed da home: " + e);
  }
};
