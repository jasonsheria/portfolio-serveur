import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class CorsExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Vérifier si c'est une erreur CORS
    if (exception.message && exception.message.includes('CORS')) {
      console.error(`[CORS ERROR] ${exception.message} - Origin: ${request.headers.origin || 'no-origin'}`);
      
      // Répondre avec des headers CORS appropriés
      response.header('Access-Control-Allow-Origin', request.headers.origin || '*');
      response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
      response.header('Access-Control-Allow-Credentials', 'true');
      
      return response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'CORS policy violation',
        error: 'Forbidden',
        origin: request.headers.origin || 'no-origin',
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    // Pour les autres erreurs, les laisser passer
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException 
      ? exception.getResponse() 
      : exception.message || 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
