import { prisma } from "../../db/prisma";

export function getEmailSettingRows(keys: string[]) {
  return prisma.appSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
}

export function setEmailSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value, description: "Email configuration managed from admin settings." },
    update: { value },
    select: { key: true, value: true },
  });
}
