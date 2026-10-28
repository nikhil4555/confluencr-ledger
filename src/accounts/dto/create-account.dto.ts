import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account holder name',
    example: 'John Doe',
    maxLength: 255,
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Account name must not be empty or whitespace' })
  @MaxLength(255, { message: 'Account name must not exceed 255 characters' })
  name: string;
}
