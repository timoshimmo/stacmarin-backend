import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
// FIX: Import UserDocument for correct Mongoose document typing.
import { User, UserDocument } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    // FIX: Use UserDocument for the injected model type.
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // FIX: Change return type to UserDocument.
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  // FIX: Change return type to UserDocument.
  /*async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }*/

  // FIX: Change return type to UserDocument.
  async findOne(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  // FIX: Change return type to UserDocument[].
  async findByIds(ids: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  // FIX: Change return type to UserDocument.
  /*async create(createUserDto: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }
*/
  async create(createUserDto: Partial<User>): Promise<UserDocument> {
    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();

      createUserDto.password = await bcrypt.hash(createUserDto.password, salt);
    }
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.userModel.deleteOne({ _id: id }).exec();
    return { message: `User with ID "${id}" has been removed` };
  }

  // FIX: Change return type to UserDocument[].
  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }
}
