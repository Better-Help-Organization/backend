import { SwaggerDoc } from "src/common/decorators/swagger-docs.decorator";
import { SwaggerDocs } from "./SwaggerDocs";

export const PublicEndpoint = () => SwaggerDoc({
    responses: [
      {
        status: 200,
        description: 'Success'
      }
    ]
  });

  export const ProtectedEndpoint = () => SwaggerDoc({
    responses: [
      {
        status: 200,
        description: 'Success'
      },
      {
        status: 401,
        description: 'Unauthorized'
      },
      {
        status: 403,
        description: 'Forbidden'
      }
    ]}
  )