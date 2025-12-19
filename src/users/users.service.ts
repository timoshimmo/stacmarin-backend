import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
// FIX: Import UserDocument for correct Mongoose document typing.
import { User, UserDocument } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(
    // FIX: Use UserDocument for the injected model type.
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
  ) {}

  // FIX: Change return type to UserDocument.
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  // FIX: Change return type to UserDocument.
  async findOne(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  // FIX: Change return type to UserDocument[].
  async findByIds(ids: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }
  async create(createUserDto: Partial<User>): Promise<UserDocument> {
    if (createUserDto.email) {
      createUserDto.email = createUserDto.email.toLowerCase();
    }

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      createUserDto.password = await bcrypt.hash(createUserDto.password, salt);
    }

    if (createUserDto.avatar && createUserDto.avatar.startsWith('data:image')) {
      createUserDto.avatar = await this.cloudinaryService.uploadImage(
        createUserDto.avatar,
      );
    }

    const createdUser = new this.userModel(createUserDto);
    const savedUser = await createdUser.save();

    // Send welcome email asynchronously
    //await this.emailService.sendWelcomeEmail(savedUser.email, savedUser.name);
    // IMPORTANT: Await the email send for serverless environments (Vercel).
    // Without 'await', the function may freeze/terminate before the email is sent.
    await this.emailService.sendWelcomeEmail(savedUser.email, savedUser.name);

    return savedUser;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const updates = { ...updateUserDto };

    if (updates.email) {
      updates.email = updates.email.toLowerCase();
    }

    if (updates.password) {
      const salt = await bcrypt.genSalt();
      updates.password = await bcrypt.hash(updates.password, salt);
    } else {
      delete updates.password;
    }

    if (updates.avatar && updates.avatar.startsWith('data:image')) {
      updates.avatar = await this.cloudinaryService.uploadImage(updates.avatar);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return updatedUser;
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
