import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL!;
  const passwordPlano = process.env.ADMIN_PASSWORD!;
  const passwordHasheada = await bcrypt.hash(passwordPlano, 10);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nombre: "Administrador",
      email,
      password: passwordHasheada,
      rol: "ADMINISTRADOR",
    },
  });

  console.log("Usuario administrador listo:");
  console.log("  email:   ", admin.email);
  console.log("  password:", passwordPlano);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
