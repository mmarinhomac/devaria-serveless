import * as AWS from "aws-sdk";
import * as Uuid from "uuid";

import { FileData } from "aws-multipart-parser/dist/models";
import { imageAllowedExtensions } from "../constants/regex";

const S3 = new AWS.S3();
export class S3Services {
  public saveImage = (
    bucket: string,
    type: string,
    file: FileData
  ): Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      try {
        const uuidV4 = Uuid.v4();
        const extension = imageAllowedExtensions.exec(file.filename) || [""];
        const key = `${type}-${uuidV4}${extension[0]}`;
        const config = {
          Bucket: bucket,
          Key: key,
          Body: file.content,
        };
        S3.upload(config, (err, res) => {
          if (err) return reject(err);
          resolve(key);
        });
      } catch (e) {
        reject(e);
      }
    });
  };
}
