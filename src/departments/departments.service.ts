
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name) private departmentModel: Model<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    try {
      const createdDepartment = new this.departmentModel(createDepartmentDto);
      return await createdDepartment.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Department with this name already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Department[]> {
    return this.departmentModel.find().sort({ name: 'asc' }).exec();
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentModel.findById(id).exec();
    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }
    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const updatedDepartment = await this.departmentModel
      .findByIdAndUpdate(id, updateDepartmentDto, { new: true })
      .exec();
    if (!updatedDepartment) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }
    return updatedDepartment;
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.departmentModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }
    return { message: `Department with ID "${id}" has been removed` };
  }
}
