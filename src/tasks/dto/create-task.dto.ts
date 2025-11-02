import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsMongoId,
} from 'class-validator';
import * as taskEntity from '../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['To Do', 'In Progress', 'Done'])
  @IsOptional()
  status?: taskEntity.TaskStatus;

  @IsEnum(['Low', 'Medium', 'High'])
  @IsOptional()
  priority?: taskEntity.TaskPriority;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  assigneeIds?: string[];
}
