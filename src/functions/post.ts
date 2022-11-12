import { Handler, APIGatewayEvent } from "aws-lambda";
import { parse } from "aws-multipart-parser";
import { FileData } from "aws-multipart-parser/dist/models";
import * as moment from "moment";
import * as Uuid from "uuid";

import { imageAllowedExtensions } from "../constants/regex";
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from "../utils/formatResponseUtil";
import { getUserIdFromEvent } from "../utils/authenticationHandlerUtils";
import { validateEnvs } from "../utils/environmentUtils";
import { S3Services } from "../services/s3Services";
import { PostModel } from "../models/PostModel";
import { UserModel } from "../models/UserModel";

export const create: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { POST_BUCKET, error } = validateEnvs(["POST_TABLE", "POST_BUCKET"]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const user = await UserModel.get({ cognitoId: userId });
    if (!user) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const formData = parse(event, true);
    const file = formData.file as FileData;
    const description = formData.description as string;

    if (!file || !imageAllowedExtensions.exec(file.filename)) {
      return formatDefaultResponse(
        400,
        "Imagem é obrigatória e deve ser somente das seguintes extensões: .jpeg/.jpg/.png/.gif "
      );
    }

    if (!description || description.trim().length < 5) {
      return formatDefaultResponse(400, "Descrição inválida!");
    }

    const imagekey = await new S3Services().saveImage(
      POST_BUCKET,
      "post",
      file
    );

    const post = {
      id: Uuid.v4(),
      userId,
      description,
      date: moment().format(),
      image: imagekey,
    };

    await PostModel.create(post);
    user.posts = user.posts + 1;
    await UserModel.update(user);

    return formatDefaultResponse(200, "Publicação cadastrada com sucesso!");
  } catch (e: any) {
    console.log("Error on create a postr: ", e);
    return formatDefaultResponse(500, "Erro ao cadastrar publicação: " + e);
  }
};

export const toggleLike: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { error } = validateEnvs(["POST_TABLE"]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const { postId } = event.pathParameters;
    if (!postId) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const post = await PostModel.get({ id: postId.toString() });
    if (!post) {
      return formatDefaultResponse(400, "Publicação não encontrada");
    }

    const hasLikedIndex = post.likes.findIndex((e: any) => {
      const result = e.toString() === userId;
      return result;
    });

    if (hasLikedIndex != -1) {
      post.likes.splice(hasLikedIndex, 1);
      await PostModel.update(post);
      return formatDefaultResponse(200, "Like removido com sucesso");
    } else {
      post.likes.push(userId);
      await PostModel.update(post);
      return formatDefaultResponse(200, "Like adicionado com sucesso");
    }
  } catch (e: any) {
    console.log("Error on toogle like: ", e);
    return formatDefaultResponse(
      500,
      "Erro ao curtir/descurtir postagem: " + e
    );
  }
};

export const comment: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { error } = validateEnvs(["POST_TABLE"]);
    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return formatDefaultResponse(400, "Usuário não encontrado");
    }

    const { postId } = event.pathParameters;
    if (!postId) {
      return formatDefaultResponse(400, "Parâmetros de entrada não informados");
    }

    const post = await PostModel.get({ id: postId.toString() });
    if (!post) {
      return formatDefaultResponse(400, "Publicação não encontrada");
    }

    const request = JSON.parse(event.body);
    const { comment } = request;

    if (!comment || comment.length < 2) {
      return formatDefaultResponse(400, "Comentário inválido");
    }

    const obj = { userId, comment, date: moment().format() };
    post.coments.push(obj);
    await PostModel.update(post);
    return formatDefaultResponse(200, "Comentário adicionado com sucesso");
  } catch (e: any) {
    console.log("Error on post coment: ", e);
    return formatDefaultResponse(500, "Erro ao adicionar comentário: " + e);
  }
};
