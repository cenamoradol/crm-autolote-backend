import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string) {
    return this.prisma.branch.findMany({
      where: { storeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(storeId: string, dto: { name: string; address?: string; isPrimary?: boolean }) {
    if (dto.isPrimary) {
      // Si marca como principal, desmarcamos las demás
      await this.prisma.branch.updateMany({
        where: { storeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.branch.create({
      data: {
        storeId,
        name: dto.name,
        address: dto.address,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  async setPrimary(storeId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, storeId } });
    if (!branch) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Branch no existe.' });

    await this.prisma.branch.updateMany({
      where: { storeId, isPrimary: true },
      data: { isPrimary: false },
    });

    return this.prisma.branch.update({
      where: { id: branchId },
      data: { isPrimary: true },
    });
  }
}
