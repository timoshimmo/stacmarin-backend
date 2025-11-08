import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
// FIX: Import NoteDocument to use for Mongoose model and document typing.
import { Note, NoteDocument } from './entities/note.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotesService {
  constructor(
    // FIX: Use NoteDocument for the injected model type.
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
  ) {}

  create(createNoteDto: CreateNoteDto, user: User): Promise<Note> {
    const createdNote = new this.noteModel({
      ...createNoteDto,
      owner: user.id, // Correctly assign the user's ID
    });
    return createdNote.save();
  }

  findAllForUser(userId: string): Promise<Note[]> {
    return this.noteModel
      .find({ owner: userId })
      .sort({ lastModified: 'desc' })
      .exec();
  }

  // FIX: Change return type to NoteDocument to ensure methods like .save() and properties like ._id are available.
  async findOne(id: string, userId: string): Promise<NoteDocument> {
    const note = await this.noteModel.findById(id).exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (note.owner.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this note',
      );
    }
    return note;
  }

  async update(
    id: string,
    updateNoteDto: UpdateNoteDto,
    userId: string,
  ): Promise<Note> {
    const note = await this.findOne(id, userId);
    Object.assign(note, updateNoteDto);
    return note.save();
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const note = await this.findOne(id, userId);
    await this.noteModel.deleteOne({ _id: note._id }).exec();
    return { message: `Note with ID "${id}" has been removed` };
  }
}
