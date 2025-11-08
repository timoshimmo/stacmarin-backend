import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsMongoId,
} from 'class-validator';
import * as eventEntity from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  start: string;

  @IsDateString()
  @IsNotEmpty()
  end: string;

  @IsEnum(['Workshop', 'Social', 'Holiday', 'Meeting'])
  @IsNotEmpty()
  category: eventEntity.EventCategory;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  attendeeIds?: string[];
}
