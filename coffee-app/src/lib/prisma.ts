// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// هذا النمط يضمن أن لديك نسخة واحدة فقط من PrismaClient، وهو ضروري لبيئة Next.js
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

// سنستخدم 'db' في باقي الأكواد لسهولة الاستدعاء
export const db = prisma;