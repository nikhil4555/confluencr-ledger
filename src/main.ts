import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — strips unknown fields, enables class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Global exception filter — consistent error shape
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response interceptor — wraps success responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Transaction Ledger API')
    .setDescription(
      'A backend API for a simple transaction ledger system. ' +
        'Supports account creation, credit/debit transactions, balance queries, paginated history, and money transfers.',
    )
    .setVersion('1.0')
    .addTag('Accounts', 'Account management — create accounts and query balances')
    .addTag('Transactions', 'Transaction management — credit/debit with idempotency, filtering, and pagination')
    .addTag('Transfers', 'Money transfers — atomic transfer between two accounts with full rollback on failure')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at:         http://localhost:${port}/api/docs`);
}

bootstrap();
