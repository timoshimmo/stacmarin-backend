import { IsNumber, IsString, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateSurveyResponseDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsString()
  @IsNotEmpty()
  category: string;
}
