import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { GetTransactionHistoryDto } from './dto/get-transaction-history.dto';
import {
  TransactionResponseDto,
  PaginatedTransactionsDto,
} from './dto/transaction-response.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

@ApiTags('Transactions')
@Controller('accounts/:accountId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a credit or debit transaction to an account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID', type: String })
  @ApiBody({ type: AddTransactionDto })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: TransactionResponseDto })
  @ApiResponse({ status: 200, description: 'Duplicate transaction — already exists (no change made)', type: TransactionResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance or validation error' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async addTransaction(
    @Param('accountId', new ParseUuidPipe('accountId')) accountId: string,
    @Body() dto: AddTransactionDto,
    @Res() res: Response,
  ) {
    const { transaction, isDuplicate } =
      await this.transactionsService.addTransaction(accountId, dto);

    const transactionData = {
      id: transaction.id,
      accountId: transaction.accountId,
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      referenceId: transaction.referenceId,
      createdAt: transaction.createdAt,
    };

    if (isDuplicate) {
      return res.status(HttpStatus.OK).json({
        status: 'success',
        statusCode: HttpStatus.OK,
        message: 'Transaction with this reference_id already exists for this account. No changes were made.',
        data: [transactionData],
      });
    }

    return res.status(HttpStatus.CREATED).json({
      status: 'success',
      statusCode: HttpStatus.CREATED,
      message: 'Transaction added successfully',
      data: [transactionData],
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get transaction history for an account (with filtering and pagination)' })
  @ApiParam({ name: 'accountId', description: 'Account UUID', type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['credit', 'debit'], description: 'Filter by transaction type' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Paginated transaction history', type: PaginatedTransactionsDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getHistory(
    @Param('accountId', new ParseUuidPipe('accountId')) accountId: string,
    @Query() query: GetTransactionHistoryDto,
  ) {
    const result = await this.transactionsService.getTransactionHistory(accountId, query);
    return {
      message: 'Transaction history retrieved successfully',
      data: result.transactions,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalRecords: result.totalRecords,
        totalPages: result.totalPages,
      },
    };
  }
}
