import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsMongoId,
} from 'class-validator';
import * as taskEntity from '../entities/task.entity';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['Open', 'Active', 'Closed'])
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

  @IsMongoId()
  @IsOptional()
  assignedTeamId?: string;

  @IsArray()
  @IsOptional()
  attachments?: any[];
}
