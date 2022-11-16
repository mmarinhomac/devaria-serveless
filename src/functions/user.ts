import { APIGatewayEvent, Handler } from "aws-lambda";
import { parse } from "aws-multipart-parser";
import { FileData } from "aws-multipart-parser/dist/models";

import { S3Services } from "../services/s3Services";
import { UserModel } from "../models/UserModel";
import { getUserIdFromEvent } from "../utils/authenticationHandlerUtils";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { imageAllowedExtensions } from "../constants/regex";
import { validateEnvs } from "../utils/environmentUtils";
import { DefaultListPaginatedResponse } from "../types/DefaultListPaginatedResponse";

export const me: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET, error } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

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

export const update: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET, error } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    if (!AVATAR_BUCKET) {
      return formatDefaultResponse(500, "Bucket de avatares não informado");
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const user = await UserModel.get({ cognitoId: userId });

    const formData = parse(event, true);
    const file = formData.file as FileData;
    const name = formData.name as string;

    if (file && !imageAllowedExtensions.exec(file.filename)) {
      return formatDefaultResponse(
        400,
        "Imagem do avatar deve ser somente das seguintes extensões: .jpeg/.jpg/.png/.gif "
      );
    } else if (file) {
      const newKey = await new S3Services().saveImage(
        AVATAR_BUCKET,
        "avatar",
        file
      );
      user.avatar = newKey;
    }

    if (name && name.trim().length < 2) {
      return formatDefaultResponse(400, "Nome inválido");
    } else if (name) {
      user.name = name;
    }

    await UserModel.update(user);
    return formatDefaultResponse(200, "Usuario atualizado com sucesso!");
  } catch (e: any) {
    console.log("Error on register user: ", e);
    return formatDefaultResponse(500, "Erro ao atualizar usuário: " + e);
  }
};

export const getById: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET, error } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const { userId } = event.pathParameters;
    if (!userId) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const user = await UserModel.get({ cognitoId: userId });
    if (user && user.avatar) {
      const url = await new S3Services().getImageUrl(
        AVATAR_BUCKET,
        user.avatar
      );
      user.avatar = url;
    }

    return formatDefaultResponse(200, null, user);
  } catch (e) {
    console.log("Error on get user data: ", e);
    return formatDefaultResponse(500, "Erro ao buscar dados do usuário: " + e);
  }
};

export const searchUser: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET, error } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const { filter } = event.pathParameters;
    const { lastKey } = event.queryStringParameters || "";
    if (!filter || filter.length < 2) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const query = UserModel.scan()
      .where("name")
      .contains(filter)
      .or()
      .where("email")
      .contains(filter);
    if (lastKey) {
      query.startAt({ cognitoId: lastKey });
    }

    const result = await query.limit(10).exec();
    let response = {} as DefaultListPaginatedResponse;

    if (result) {
      response.count = result.count;
      response.lastkey = result.lastKey;

      for (const document of result) {
        if (document && document.avatar) {
          document.avatar = await new S3Services().getImageUrl(
            AVATAR_BUCKET,
            document.avatar
          );
        }
      }
      response.data = result;
    }

    return formatDefaultResponse(200, null, response);
  } catch (e) {
    console.log("Error on get users: ", e);
    return formatDefaultResponse(500, "Erro ao buscar usuários: " + e);
  }
};
