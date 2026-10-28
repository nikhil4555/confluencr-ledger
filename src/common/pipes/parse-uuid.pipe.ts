import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ParseUuidPipe implements PipeTransform<string> {
  constructor(private readonly paramName: string = 'id') {}

  transform(value: string): string {
    if (!isUUID(value, '4')) {
      throw new BadRequestException(
        `${this.paramName} must be a valid UUID v4`,
      );
    }
    return value;
  }
}
