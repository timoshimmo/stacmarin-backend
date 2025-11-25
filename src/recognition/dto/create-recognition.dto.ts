import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateRecognitionDto {
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
