import { HttpStatus } from "@nestjs/common";

    const HttpStatusMessages: Record<number, string> = {
      [HttpStatus.OK]: "OK",
      [HttpStatus.CREATED]: "Created",
      [HttpStatus.BAD_REQUEST]: "Bad Request",
      [HttpStatus.UNAUTHORIZED]: "Unauthorized",
      [HttpStatus.FORBIDDEN]: "Forbidden",
      [HttpStatus.NOT_FOUND]: "Not Found",
      [HttpStatus.CONFLICT]: "Conflict",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
      // Add other status codes as needed
    };
    
    export function getHttpStatusMessage(statusCode: number): string {
      return HttpStatusMessages[statusCode] || "Unknown Status";
    }