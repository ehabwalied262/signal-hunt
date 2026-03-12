import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        assignedPhoneNumber: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        assignedPhoneNumber: {
          select: {
            id: true,
            number: true,
            countryCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllBDRs() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.BDR,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
