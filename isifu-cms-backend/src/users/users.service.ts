import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 12),
      },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async update(id: number, dto: UpdateUserDto) {
    const data = {
      name: dto.name,
      role: dto.role,
      ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 12) } : {}),
    };
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true },
    });
  }

  disableTwoFactor(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true },
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id }, select: { id: true } });
  }
}
